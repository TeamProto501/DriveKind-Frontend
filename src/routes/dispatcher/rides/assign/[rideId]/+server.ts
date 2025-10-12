import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const POST: RequestHandler = async ({ request, cookies, params }) => {
	try {
		const rideId = parseInt(params.rideId);
		const { driver_user_id } = await request.json();

		// Create Supabase client
		const supabase = createSupabaseServerClient({ cookies });

		// Get the current user
		const { data: { user }, error: userError } = await supabase.auth.getUser();
		
		if (userError || !user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Get the user's profile to verify dispatcher role
		const { data: profile, error: profileError } = await supabase
			.from('staff_profiles')
			.select('user_id, org_id, role')
			.eq('user_id', user.id)
			.single();

		if (profileError || !profile) {
			return json({ error: 'Profile not found' }, { status: 404 });
		}

		// Check if user has dispatcher role
		const hasDispatcherRole = profile.role && (
			Array.isArray(profile.role) ? profile.role.includes('Dispatcher') : profile.role === 'Dispatcher'
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
			return json({ error: 'Driver not found or access denied' }, { status: 404 });
		}

		// Check if the driver has driver role
		const hasDriverRole = driver.role && (
			Array.isArray(driver.role) ? driver.role.includes('Driver') : driver.role === 'Driver'
		);

		if (!hasDriverRole) {
			return json({ error: 'Selected user is not a driver' }, { status: 400 });
		}

		// Assign the driver to the ride
		const { error: updateError } = await supabase
			.from('rides')
			.update({
				driver_user_id: driver_user_id,
				status: 'Assigned'
			})
			.eq('ride_id', rideId);

		if (updateError) {
			console.error('Error assigning driver:', updateError);
			return json({ error: 'Failed to assign driver' }, { status: 500 });
		}

		return json({ success: true });

	} catch (error) {
		console.error('Error in driver assignment:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
