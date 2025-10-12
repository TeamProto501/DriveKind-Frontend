import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const POST: RequestHandler = async ({ request, cookies, params }) => {
	try {
		const rideId = parseInt(params.rideId);
		const rideData = await request.json();

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

		// Update the ride
		const { error: updateError } = await supabase
			.from('rides')
			.update({
				client_id: parseInt(rideData.client_id),
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
				donation: rideData.donation
			})
			.eq('ride_id', rideId);

		if (updateError) {
			console.error('Error updating ride:', updateError);
			return json({ error: 'Failed to update ride' }, { status: 500 });
		}

		return json({ success: true });

	} catch (error) {
		console.error('Error in ride update:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
