import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const POST: RequestHandler = async (event) => {
	console.log('=== ASSIGN DRIVER ENDPOINT CALLED ===');
	
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

		// Check role
		const hasDispatcherRole = profile.role && (
			Array.isArray(profile.role) 
				? (profile.role.includes('Dispatcher') || profile.role.includes('Admin'))
				: (profile.role === 'Dispatcher' || profile.role === 'Admin')
		);

		console.log('Has dispatcher role:', hasDispatcherRole);

		if (!hasDispatcherRole) {
			return json({ error: 'Access denied' }, { status: 403 });
		}

		// Verify the ride exists
		const { data: existingRide, error: rideError } = await supabase
			.from('rides')
			.select('ride_id, org_id')
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

		// Get vehicle (optional)
		const { data: vehicle } = await supabase
			.from('vehicles')
			.select('vehicle_id')
			.eq('user_id', driver_user_id)
			.eq('driver_status', 'active')
			.limit(1)
			.maybeSingle();

		console.log('Vehicle:', vehicle);

		// Update the ride
		const { error: updateError } = await supabase
			.from('rides')
			.update({
				driver_user_id: driver_user_id,
				vehicle_id: vehicle?.vehicle_id || null,
				status: 'Assigned'
			})
			.eq('ride_id', rideId);

		if (updateError) {
			console.error('Update error:', updateError);
			return json({ error: `Failed to assign driver: ${updateError.message}` }, { status: 500 });
		}

		console.log('=== DRIVER ASSIGNED SUCCESSFULLY ===');
		return json({ success: true });

	} catch (error: any) {
		console.error('=== ERROR IN DRIVER ASSIGNMENT ===');
		console.error('Error:', error);
		console.error('Stack:', error.stack);
		return json({ error: `Internal server error: ${error.message}` }, { status: 500 });
	}
};
