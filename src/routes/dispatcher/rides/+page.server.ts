// src/routes/dispatcher/rides/+page.server.ts
import { createSupabaseServerClient } from '$lib/supabase.server';
import { error, redirect, fail } from '@sveltejs/kit';
import type { Actions } from './$types';

export const load = async (event) => {
  const supabase = createSupabaseServerClient(event);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw redirect(302, '/login');
  }

  const { data: userProfile } = await supabase
    .from('staff_profiles')
    .select('org_id, role')
    .eq('user_id', session.user.id)
    .single();

  if (!userProfile) {
    throw error(403, 'User profile not found');
  }

  const hasAccess = userProfile.role.includes('Dispatcher') || userProfile.role.includes('Admin');
  if (!hasAccess) {
    throw error(403, 'Access denied');
  }

  // Fetch rides with full details
  const { data: rides } = await supabase
    .from('rides')
    .select(`
      *,
      clients (
        client_id,
        first_name,
        last_name,
        primary_phone,
        mobility_assistance_enum,
        car_height_needed_enum,
        service_animal,
        service_animal_size_enum,
        oxygen,
        allergies,
        other_limitations,
        pick_up_instructions
      ),
      vehicles (
        vehicle_id,
        type_of_vehicle_enum,
        seat_height_enum,
        max_passengers,
        vehicle_color
      ),
      driver:staff_profiles!rides_driver_user_id_fkey (
        user_id,
        first_name,
        last_name,
        primary_phone
      )
    `)
    .eq('org_id', userProfile.org_id)
    .order('appointment_time', { ascending: false });

  // Fetch clients with full details
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .eq('org_id', userProfile.org_id)
    .eq('client_status_enum', 'active')
    .order('last_name');

  // Fetch drivers with vehicles
  const { data: drivers } = await supabase
    .from('staff_profiles')
    .select(`
      user_id,
      first_name,
      last_name,
      primary_phone,
      max_rides,
      destination_limitation,
      town_preference,
      vehicles (
        vehicle_id,
        type_of_vehicle_enum,
        seat_height_enum,
        max_passengers,
        vehicle_color,
        driver_status
      )
    `)
    .eq('org_id', userProfile.org_id)
    .contains('role', ['Driver'])
    .order('last_name');

  return {
    rides: rides || [],
    clients: clients || [],
    drivers: drivers || [],
    userOrgId: userProfile.org_id,
    currentUserId: session.user.id,
    session
  };
};

export const actions = {
  createRide: async (event) => {
    const supabase = createSupabaseServerClient(event);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return fail(401, { error: 'Unauthorized' });
    }

    const formData = await event.request.formData();
    const rideData = {
      org_id: parseInt(formData.get('org_id') as string),
      client_id: parseInt(formData.get('client_id') as string),
      driver_user_id: formData.get('driver_user_id') as string || null,
      vehicle_id: formData.get('vehicle_id') ? parseInt(formData.get('vehicle_id') as string) : null,
      dispatcher_user_id: session.user.id,
      pickup_from_home: formData.get('pickup_from_home') === 'true',
      alt_pickup_address: formData.get('alt_pickup_address') as string || null,
      alt_pickup_address2: formData.get('alt_pickup_address2') as string || null,
      alt_pickup_city: formData.get('alt_pickup_city') as string || null,
      alt_pickup_state: formData.get('alt_pickup_state') as string || null,
      alt_pickup_zipcode: formData.get('alt_pickup_zipcode') as string || null,
      destination_name: formData.get('destination_name') as string,
      dropoff_address: formData.get('dropoff_address') as string,
      dropoff_address2: formData.get('dropoff_address2') as string || null,
      dropoff_city: formData.get('dropoff_city') as string || null,
      dropoff_state: formData.get('dropoff_state') as string || null,
      dropoff_zipcode: formData.get('dropoff_zipcode') as string || null,
      appointment_time: formData.get('appointment_time') as string,
      pickup_time: formData.get('pickup_time') as string || null,
      round_trip: formData.get('round_trip') === 'true',
      purpose: formData.get('purpose') as string,
      estimated_appointment_length: formData.get('estimated_appointment_length') as string || null,
      riders: parseInt(formData.get('riders') as string) || 0,
      notes: formData.get('notes') as string || null,
      status: 'scheduled' as const,
      donation: false
    };

    const { data, error: insertError } = await supabase
      .from('rides')
      .insert(rideData)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating ride:', insertError);
      return fail(500, { error: 'Failed to create ride' });
    }

    return { success: true, rideId: data.ride_id };
  },
  
  checkDriverAvailability: async (event) => {
    const supabase = createSupabaseServerClient(event);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return fail(401, { error: 'Unauthorized' });
    }

    const formData = await event.request.formData();
    const driverUserId = formData.get('driver_user_id') as string;
    const appointmentTime = formData.get('appointment_time') as string;

    const appointmentDate = new Date(appointmentTime);
    const dateStr = appointmentDate.toISOString().split('T')[0];
    const timeStr = appointmentDate.toTimeString().split(' ')[0];

    // Check driver unavailability
    const { data: unavailability } = await supabase
      .from('driver_unavailability')
      .select('*')
      .eq('user_id', driverUserId)
      .or(`unavailable_date.eq.${dateStr},unavailable_date.is.null`)
      .or('all_day.eq.true,and(start_time.lte.${timeStr},end_time.gte.${timeStr})');

    const isAvailable = !unavailability || unavailability.length === 0;

    return { available: isAvailable };
  }
} satisfies Actions;