import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const POST: RequestHandler = async (event) => {
  try {
    const rideId = parseInt(event.params.rideId);
    const body = await event.request.json();
    const { vehicle_id } = body;

    const supabase = createSupabaseServerClient(event);
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get driver profile
    const { data: profile, error: profileError } = await supabase
      .from('staff_profiles')
      .select('user_id, org_id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return json({ error: 'Profile not found' }, { status: 404 });
    }

    const isDriver =
      profile.role &&
      (Array.isArray(profile.role)
        ? profile.role.includes('Driver')
        : profile.role === 'Driver');

    if (!isDriver) {
      return json({ error: 'Driver role required' }, { status: 403 });
    }

    // Verify ride exists and is in same org
    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .select('ride_id, org_id, status, riders')
      .eq('ride_id', rideId)
      .eq('org_id', profile.org_id)
      .single();

    if (rideError || !ride) {
      return json({ error: 'Ride not found or access denied' }, { status: 404 });
    }

    // Check for pending request
    const { data: requestRow, error: reqErr } = await supabase
      .from('ride_requests')
      .select('ride_id, driver_id, denied, org_id')
      .eq('ride_id', rideId)
      .eq('driver_id', user.id)
      .maybeSingle();

    if (reqErr || !requestRow || requestRow.denied === true) {
      return json({ error: 'No pending request for this driver' }, { status: 400 });
    }

    // Backfill org_id if missing
    if (!requestRow.org_id) {
      await supabase
        .from('ride_requests')
        .update({ org_id: profile.org_id })
        .eq('ride_id', rideId)
        .eq('driver_id', user.id);
    }

    // Validate vehicle if provided
    let assignedVehicleId = null;
    if (vehicle_id) {
      const { data: vehicle, error: vehicleError } = await supabase
        .from('vehicles')
        .select('vehicle_id, user_id, active, nondriver_seats')
        .eq('vehicle_id', vehicle_id)
        .eq('user_id', user.id)
        .single();

      if (vehicleError || !vehicle) {
        return json({ error: 'Vehicle not found or does not belong to driver' }, { status: 404 });
      }

      if (!vehicle.active) {
        return json({ error: 'Vehicle must be active' }, { status: 400 });
      }

      // Validate seats
      const requiredSeats = (ride.riders || 0) + 1;
      const vehicleSeats = (vehicle.nondriver_seats || 0) + 1;
      if (vehicleSeats < requiredSeats) {
        return json({
          error: `Vehicle does not have enough seats. Required: ${requiredSeats}, Available: ${vehicleSeats}`,
        }, { status: 400 });
      }

      assignedVehicleId = vehicle.vehicle_id;
    }

    // Update ride
    const updateData: any = {
      driver_user_id: user.id,
      status: 'Scheduled',
    };

    if (assignedVehicleId) {
      updateData.assigned_vehicle = assignedVehicleId;
    }

    const { error: updateErr } = await supabase
      .from('rides')
      .update(updateData)
      .eq('ride_id', rideId);

    if (updateErr) {
      console.error('Error updating ride:', updateErr);
      return json({ error: 'Failed to accept ride' }, { status: 500 });
    }

    // Cancel other pending requests
    await supabase
      .from('ride_requests')
      .update({
        denied: true,
        updated_at: new Date().toISOString(),
      })
      .eq('ride_id', rideId)
      .eq('denied', false)
      .neq('driver_id', user.id);

    return json({ success: true, assigned_vehicle: assignedVehicleId });
  } catch (error: any) {
    console.error('Error in ride acceptance:', error);
    return json({ error: `Internal server error: ${error.message}` }, { status: 500 });
  }
};

