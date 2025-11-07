import type { PageServerLoad } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
  const supabase = createSupabaseServerClient(event);

  try {
    // Session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw redirect(302, '/login');
    }

    // Profile (must be dispatcher or admin)
    const { data: profile, error: profileError } = await supabase
      .from('staff_profiles')
      .select('user_id, org_id, first_name, last_name, role')
      .eq('user_id', session.user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile error:', profileError);
      return {
        session,
        rides: [],
        drivers: [],
        clients: [],
        calls: [],
        destinations: [],
        profile: null,
        error: 'Profile not found. Please contact your administrator.'
      };
    }

    const hasDispatcherRole =
      profile.role &&
      (Array.isArray(profile.role)
        ? (profile.role.includes('Dispatcher') || profile.role.includes('Admin'))
        : (profile.role === 'Dispatcher' || profile.role === 'Admin'));

    if (!hasDispatcherRole) {
      return {
        session,
        rides: [],
        drivers: [],
        clients: [],
        calls: [],
        destinations: [],
        profile,
        error: 'Access denied. Dispatcher role required.'
      };
    }

    // Rides for this org
    const { data: rides, error: ridesError } = await supabase
      .from('rides')
      .select(`
        ride_id,
        org_id,
        client_id,
        dispatcher_user_id,
        alt_pickup_address,
        dropoff_address,
        appointment_time,
        status,
        notes,
        miles_driven,
        hours,
        donation,
        riders,
        pickup_time,
        driver_user_id,
        round_trip,
        purpose,
        estimated_appointment_length,
        destination_name,
        alt_pickup_city,
        alt_pickup_state,
        alt_pickup_zipcode,
        dropoff_city,
        dropoff_state,
        dropoff_zipcode,
        pickup_from_home,
        call_id,
        alt_pickup_address2,
        dropoff_address2,
        donation_amount,
        completion_status,
        clients:client_id (
          first_name,
          last_name,
          primary_phone,
          street_address,
          address2,
          city,
          state,
          zip_code
        ),
        drivers:driver_user_id (
          first_name,
          last_name
        )
      `)
      .eq('org_id', profile.org_id)
      .order('appointment_time', { ascending: true });

    if (ridesError) {
      console.error('Error loading rides:', ridesError);
    }

    // Available drivers (for assignment modal)
    const { data: drivers, error: driversError } = await supabase
      .from('staff_profiles')
      .select('user_id, first_name, last_name, role')
      .eq('org_id', profile.org_id)
      .contains('role', ['Driver']);

    if (driversError) {
      console.error('Error loading drivers:', driversError);
    }

    // Clients
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select(`
        client_id,
        org_id,
        first_name,
        last_name,
        primary_phone,
        email,
        street_address,
        address2,
        city,
        state,
        zip_code
      `)
      .eq('org_id', profile.org_id)
      .order('first_name', { ascending: true });

    if (clientsError) {
      console.error('Error loading clients:', clientsError);
    }

    // Calls for "Linked call" dropdown
    const { data: calls, error: callsError } = await supabase
      .from('calls')
      .select('call_id, org_id, call_time, call_type, caller_first_name, caller_last_name')
      .eq('org_id', profile.org_id)
      .order('call_time', { ascending: false });

    if (callsError) {
      console.error('Error loading calls:', callsError);
    }

    // 🔹 Destinations (saved locations) for this org
    const { data: destinations, error: destinationsError } = await supabase
      .from('destinations')
      .select('destination_id, org_id, location_name, address, address2, city, state, zipcode')
      .eq('org_id', profile.org_id)
      .order('location_name', { ascending: true });

    if (destinationsError) {
      console.error('Error loading destinations:', destinationsError);
    }

    return {
      session,
      rides: rides || [],
      drivers: drivers || [],
      clients: clients || [],
      calls: calls || [],
      destinations: destinations || [],   // 👈 added
      profile,
      error: null
    };
  } catch (error) {
    console.error('Error in dispatcher rides page load:', error);
    if (error instanceof Response) throw error;
    return {
      session: null,
      rides: [],
      drivers: [],
      clients: [],
      calls: [],
      destinations: [],
      profile: null,
      error: 'Failed to load rides data'
    };
  }
};