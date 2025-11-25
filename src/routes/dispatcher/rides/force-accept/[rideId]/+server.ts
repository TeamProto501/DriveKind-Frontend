import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const POST: RequestHandler = async (event) => {
  console.log('=== AUTO ASSIGN RIDE ENDPOINT CALLED ===');
  
  try {
    const rideId = parseInt(event.params.rideId);
    console.log('Ride ID:', rideId);
    
    const body = await event.request.json();
    console.log('Request body:', body);
    const { driver_user_id } = body;

    if (!driver_user_id) {
      return json({ error: 'driver_user_id is required' }, { status: 400 });
    }

    // Create Supabase client
    const supabase = createSupabaseServerClient(event);
    console.log('Supabase client created');

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('Current user:', user?.id);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user's profile
    const { data: profile, error: profileError } = await supabase
      .from('staff_profiles')
      .select('user_id, org_id, role')
      .eq('user_id', user.id)
      .single();

    console.log('User profile:', profile);

    if (profileError || !profile) {
      console.error('Profile error:', profileError);
      return json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check role - dispatcher or admin can auto assign
    const hasDispatcherRole = profile.role && (
      Array.isArray(profile.role) 
        ? (profile.role.includes('Dispatcher') || profile.role.includes('Admin') || profile.role.includes('Super Admin'))
        : (profile.role === 'Dispatcher' || profile.role === 'Admin' || profile.role === 'Super Admin')
    );

    console.log('Has dispatcher role:', hasDispatcherRole);

    if (!hasDispatcherRole) {
      return json({ error: 'Access denied. Dispatcher or Admin role required.' }, { status: 403 });
    }

    // Verify the ride exists
    const { data: existingRide, error: rideError } = await supabase
      .from('rides')
      .select('ride_id, org_id, status')
      .eq('ride_id', rideId)
      .eq('org_id', profile.org_id)
      .single();

    console.log('Existing ride:', existingRide);

    if (rideError || !existingRide) {
      console.error('Ride error:', rideError);
      return json({ error: 'Ride not found or access denied' }, { status: 404 });
    }

    // Verify the driver
    const { data: driver, error: driverError } = await supabase
      .from('staff_profiles')
      .select('user_id, org_id, role')
      .eq('user_id', driver_user_id)
      .eq('org_id', profile.org_id)
      .single();

    console.log('Driver profile:', driver);

    if (driverError || !driver) {
      console.error('Driver error:', driverError);
      return json({ error: 'Driver not found' }, { status: 404 });
    }

    // Check driver role
    const hasDriverRole = driver.role && (
      Array.isArray(driver.role) ? driver.role.includes('Driver') : driver.role === 'Driver'
    );

    console.log('Has driver role:', hasDriverRole);

    if (!hasDriverRole) {
      return json({ error: 'Selected user is not a driver' }, { status: 400 });
    }

    // Auto assign: set driver_user_id and status to 'Scheduled' (same as when driver accepts)
    const { error: updateError } = await supabase
      .from('rides')
      .update({
        driver_user_id: driver_user_id,
        status: 'Scheduled'
      })
      .eq('ride_id', rideId);

    if (updateError) {
      console.error('Update error:', updateError);
      return json({ error: `Failed to auto assign ride: ${updateError.message}` }, { status: 500 });
    }

    console.log('=== RIDE AUTO ASSIGNED SUCCESSFULLY ===');
    return json({ success: true });

  } catch (error: any) {
    console.error('=== ERROR IN AUTO ASSIGN ===');
    console.error(error);
    return json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
};

