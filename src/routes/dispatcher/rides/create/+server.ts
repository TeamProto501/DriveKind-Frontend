// src/routes/dispatcher/rides/create/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const POST: RequestHandler = async (event) => {
	try {
		const rideData = await event.request.json();

		// Create Supabase client - pass the full event object
		const supabase = createSupabaseServerClient(event);

		// Get the current user
		const { data: { user }, error: userError } = await supabase.auth.getUser();
		
		if (userError || !user) {
			console.error('User error:', userError);
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Get the user's profile to verify dispatcher role and get org_id
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
			return json({ error: 'Access denied. Dispatcher or Admin role required.' }, { status: 403 });
		}

		console.log('Creating ride with data:', rideData);

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
				pickup_from_home: rideData.pickup_from_home === true || rideData.pickup_from_home === 'true',
				alt_pickup_address: rideData.alt_pickup_address || null,
				alt_pickup_address2: rideData.alt_pickup_address2 || null,
				alt_pickup_city: rideData.alt_pickup_city || null,
				alt_pickup_state: rideData.alt_pickup_state || null,
				alt_pickup_zipcode: rideData.alt_pickup_zipcode || null,
				round_trip: rideData.round_trip === true || rideData.round_trip === 'true',
				riders: parseInt(rideData.riders) || 1,
				estimated_appointment_length: rideData.estimated_appointment_length || null,
				notes: rideData.notes || null,
				donation: rideData.donation === true || rideData.donation === 'true',
				status: 'Requested'
			})
			.select()
			.single();

		if (rideError) {
			console.error('Error creating ride:', rideError);
			return json({ error: `Failed to create ride: ${rideError.message}` }, { status: 500 });
		}

		console.log('Ride created successfully:', ride);
		return json({ success: true, ride });

	} catch (error) {
		console.error('Error in ride creation:', error);
		return json({ error: `Internal server error: ${error.message}` }, { status: 500 });
	}
};
