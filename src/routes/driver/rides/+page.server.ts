// +page.server.ts
import type { PageServerLoad } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
  const supabase = createSupabaseServerClient(event);

  // 1) Auth
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) throw redirect(302, '/login');

  // 2) Profile (need org + role)
  const { data: profile, error: profileError } = await supabase
    .from('staff_profiles')
    .select('user_id, org_id, first_name, last_name, role')
    .eq('user_id', user.id)
    .single();

  if (profileError || !profile) {
    return {
      session: { user },
      rides: [],
      profile: null,
      error: 'Profile not found. Please contact your administrator.'
    };
  }

  const isDriver =
    profile.role &&
    (Array.isArray(profile.role)
      ? profile.role.includes('Driver')
      : profile.role === 'Driver');

  if (!isDriver) {
    return {
      session: { user },
      rides: [],
      profile,
      error: 'Access denied. Driver role required.'
    };
  }

  // 3) Assigned rides for this driver (from rides)
  const { data: assignedRides, error: ridesError } = await supabase
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
      completion_status,
      donation_amount,
      assigned_vehicle,
      clients:client_id (
        first_name,
        last_name,
        primary_phone,
        other_limitations
      ),
      vehicles:assigned_vehicle (
        vehicle_id,
        type_of_vehicle_enum,
        vehicle_color,
        nondriver_seats
      )
    `)
    .eq('driver_user_id', user.id)
    .order('appointment_time', { ascending: true });

  if (ridesError) {
    console.error('Error loading rides:', ridesError);
    return {
      session: { user },
      rides: [],
      profile,
      error: `Failed to load rides: ${ridesError.message}`
    };
  }

  // 4) Pending requests for this driver (from ride_requests)
  const { data: requestRows, error: requestErr } = await supabase
    .from('ride_requests')
    .select('ride_id, driver_id, org_id, denied')
    .eq('driver_id', user.id)
    .eq('org_id', profile.org_id);

  if (requestErr) {
    console.error('Error loading ride requests:', requestErr);
  }

  // IMPORTANT: treat NULL as pending too
  const pendingRideIds =
    (requestRows || [])
      .filter((r) => r.denied !== true)
      .map((r) => r.ride_id) ?? [];

  // Don’t duplicate rides that are already assigned to this driver
  const assignedIds = new Set((assignedRides || []).map((r) => r.ride_id));
  const freshPendingIds = pendingRideIds.filter((id) => !assignedIds.has(id));

  // 5) Load the rides for those pending requests and tag status as "Pending" for the UI
  let pendingRides: any[] = [];
  if (freshPendingIds.length > 0) {
    const { data: pending, error: pendingErr } = await supabase
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
        completion_status,
        donation_amount,
        assigned_vehicle,
        clients:client_id (
          first_name,
          last_name,
          primary_phone,
          other_limitations
        ),
        vehicles:assigned_vehicle (
          vehicle_id,
          type_of_vehicle_enum,
          vehicle_color,
          nondriver_seats
        )
      `)
      .in('ride_id', freshPendingIds);

    if (pendingErr) {
      console.error('Error loading pending rides:', pendingErr);
    } else {
      pendingRides = (pending || []).map((r) => ({ ...r, status: 'Pending' }));
    }
  }

  // 6) Get driver's active vehicles for vehicle selection
  const { data: activeVehicles } = await supabase
    .from('vehicles')
    .select('vehicle_id, type_of_vehicle_enum, vehicle_color, nondriver_seats, active')
    .eq('user_id', user.id)
    .eq('active', true)
    .order('vehicle_id', { ascending: true });

  // 7) For each pending ride, determine which vehicles are eligible
  // A vehicle is eligible if it's active and has enough seats for the ride
  const ridesWithEligibleVehicles = (pendingRides || []).map((ride: any) => {
    const eligibleVehicles = (activeVehicles || []).filter((vehicle: any) => {
      // Check if vehicle has enough seats (riders + 1 for driver)
      const requiredSeats = (ride.riders || 0) + 1;
      const vehicleSeats = (vehicle.nondriver_seats || 0) + 1; // +1 for driver
      return vehicleSeats >= requiredSeats;
    });
    return {
      ...ride,
      eligibleVehicles
    };
  });

  // 8) Final list is pending (with eligible vehicles) + assigned
  const rides = [...ridesWithEligibleVehicles, ...(assignedRides || [])];

  return {
    session: { user },
    rides,
    profile,
    activeVehicles: activeVehicles || [],
    error: null
  };
};