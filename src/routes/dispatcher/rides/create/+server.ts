import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const rideData = await request.json();

		// Create Supabase client
		const supabase = createSupabaseServerClient({ cookies });

		// Get the current user
		const { data: { user }, error: userError } = await supabase.auth.getUser();
		
		if (userError || !user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Get the user's profile to verify dispatcher role and get org_id
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

		// Create the ride
		const { data: ride, error: rideError } = await supabase
			.from('rides')
			.insert({
				org_id: profile.org_id,
				client_id: parseInt(rideData.client_id),
				dispatcher_user_id: user.id,
				purpose: rideData.purpose,
				destination_name: rideData.destination_name,
				dropoff_address: rideData.dropoff_address,
				dropoff_address2: rideData.dropoff_address2 || null,
				dropoff_city: rideData.dropoff_city,
				dropoff_state: rideData.dropoff_state,
				dropoff_zipcode: rideData.dropoff_zipcode,
				appointment_time: rideData.appointment_time,
				pickup_from_home: rideData.pickup_from_home,
				alt_pickup_address: rideData.alt_pickup_address || null,
				alt_pickup_address2: rideData.alt_pickup_address2 || null,
				alt_pickup_city: rideData.alt_pickup_city || null,
				alt_pickup_state: rideData.alt_pickup_state || null,
				alt_pickup_zipcode: rideData.alt_pickup_zipcode || null,
				round_trip: rideData.round_trip,
				riders: rideData.riders,
				estimated_appointment_length: rideData.estimated_appointment_length || null,
				notes: rideData.notes || null,
				donation: rideData.donation,
				status: 'Requested'
			})
			.select()
			.single();

		if (rideError) {
			console.error('Error creating ride:', rideError);
			return json({ error: 'Failed to create ride' }, { status: 500 });
		}

		return json({ success: true, ride });

	} catch (error) {
		console.error('Error in ride creation:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
