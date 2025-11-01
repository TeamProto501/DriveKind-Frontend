// src/routes/dispatcher/rides/create/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const POST: RequestHandler = async (event) => {
  try {
    const body = await event.request.json();
    const supabase = createSupabaseServerClient(event);

    // Auth
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: 'Unauthorized' }, { status: 401 });

    // Role check
    const { data: profile, error: profileError } = await supabase
      .from('staff_profiles')
      .select('user_id, org_id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) return json({ error: 'Profile not found' }, { status: 404 });

    const hasDispatcherRole =
      profile.role &&
      (Array.isArray(profile.role)
        ? (profile.role.includes('Dispatcher') || profile.role.includes('Admin'))
        : (profile.role === 'Dispatcher' || profile.role === 'Admin'));

    if (!hasDispatcherRole) return json({ error: 'Access denied. Dispatcher or Admin role required.' }, { status: 403 });

    // Build payload (NO vehicle_id, NO driver_user_id)
    const payload = {
      org_id: profile.org_id,                                 // always from active user
      client_id: body.client_id ?? null,
      dispatcher_user_id: user.id,                            // always current user
      alt_pickup_address: body.alt_pickup_address ?? null,
      alt_pickup_address2: body.alt_pickup_address2 ?? null,
      alt_pickup_city: body.alt_pickup_city ?? null,
      alt_pickup_state: body.alt_pickup_state ?? null,
      alt_pickup_zipcode: body.alt_pickup_zipcode ?? null,
      dropoff_address: body.dropoff_address ?? null,
      dropoff_address2: body.dropoff_address2 ?? null,
      dropoff_city: body.dropoff_city ?? null,
      dropoff_state: body.dropoff_state ?? null,
      dropoff_zipcode: body.dropoff_zipcode ?? null,
      appointment_time: body.appointment_time ?? null,
      pickup_time: body.pickup_time ?? null,
      status: body.status ?? 'Requested',
      notes: body.notes ?? null,
      miles_driven: body.miles_driven ?? null,
      hours: body.hours ?? null,
      donation: body.donation ?? false,
      donation_amount: body.donation_amount ?? null,
      riders: body.riders ?? 1,
      round_trip: body.round_trip ?? false,
      purpose: body.purpose ?? null,
      estimated_appointment_length: body.estimated_appointment_length ?? null,
      destination_name: body.destination_name ?? null,
      pickup_from_home: body.pickup_from_home ?? true,
      call_id: body.call_id ?? null,
      completion_status: body.completion_status ?? null
      // created_at defaults to now(); ride_id auto-increments
    };

    // Basic required fields
    if (!payload.client_id || !payload.dropoff_address || !payload.destination_name || !payload.appointment_time) {
      return json({ error: 'Missing required fields (client_id, dropoff_address, destination_name, appointment_time).' }, { status: 400 });
    }

    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .insert(payload)
      .select()
      .single();

    if (rideError) {
      console.error('Error creating ride:', rideError);
      return json({ error: `Failed to create ride: ${rideError.message}` }, { status: 500 });
    }

    return json({ success: true, ride });
  } catch (error: any) {
    console.error('Error in ride creation:', error);
    return json({ error: `Internal server error: ${error.message}` }, { status: 500 });
  }
};