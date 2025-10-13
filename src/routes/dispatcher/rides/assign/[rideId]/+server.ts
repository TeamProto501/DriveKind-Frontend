import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const POST: RequestHandler = async (event) => {
	try {
		const rideId = parseInt(event.params.rideId);
		const { driver_user_id } = await event.request.json();

		// Create Supabase client - pass the full event object
		const supabase = createSupabaseServerClient(event);

		// Get the current user
		const { data: { user }, error: userError } = await supabase.auth.getUser();
		
		if (userError || !user) {
			console.error('Auth error:', userError);
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Get the user's profile to verify dispatcher role
		const { data: profile, error: profileError } = await supabase
			.from('staff_profiles')
			.select('user_id, org_id, role')
			.eq('user_id', user.id)
			.single();

		if (profileError || !profile) {
			console.error('Profile error:', profileError);
			return json({ error: 'Profile not found' }, { status: 404 });
		}

		// Check if user has dispatcher or admin role
		const hasDispatcherRole = profile.role && (
			Array.isArray(profile.role) 
				? (profile.role.includes('Dispatcher') || profile.role.includes('Admin'))
				: (profile.role === 'Dispatcher' || profile.role === 'Admin')
		);

		if (!hasDispatcherRole) {
			return json({ error: 'Access denied. Dispatcher role required.' }, { status: 403 });
		}

		// Verify the ride belongs to the same organization
		const { data: existingRide, error: rideError } = await supabase
			.from('rides')
			.select('ride_id, org_id')
			.eq('ride_id', rideId)
			.eq('org_id', profile.org_id)
			.single();

		if (rideError || !existingRide) {
			console.error('Ride error:', rideError);
			return json({ error: 'Ride not found or access denied' }, { status: 404 });
		}

		// Verify the driver belongs to the same organization
		const { data: driver, error: driverError } = await supabase
			.from('staff_profiles')
			.select('user_id, org_id, role')
			.eq('user_id', driver_user_id)
			.eq('org_id', profile.org_id)
			.single();

		if (driverError || !driver) {
			console.error('Driver error:', driverError);
			return json({ error: 'Driver not found or access denied' }, { status: 404 });
		}

		// Check if the driver has driver role
		const hasDriverRole = driver.role && (
			Array.isArray(driver.role) ? driver.role.includes('Driver') : driver.role === 'Driver'
		);

		if (!hasDriverRole) {
			return json({ error: 'Selected user is not a driver' }, { status: 400 });
		}

		// Get the driver's active vehicle
		const { data: vehicle, error: vehicleError } = await supabase
			.from('vehicles')
			.select('vehicle_id')
			.eq('user_id', driver_user_id)
			.eq('driver_status', 'active')
			.limit(1)
			.maybeSingle();

		console.log('Assigning driver:', driver_user_id, 'vehicle:', vehicle?.vehicle_id);

		// Assign the driver to the ride (and vehicle if found)
		const { error: updateError } = await supabase
			.from('rides')
			.update({
				driver_user_id: driver_user_id,
				vehicle_id: vehicle?.vehicle_id || null,
				status: 'Assigned'
			})
			.eq('ride_id', rideId);

		if (updateError) {
			console.error('Error assigning driver:', updateError);
			return json({ error: 'Failed to assign driver' }, { status: 500 });
		}

		console.log('Driver assigned successfully to ride:', rideId);
		return json({ success: true });

	} catch (error) {
		console.error('Error in driver assignment:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
