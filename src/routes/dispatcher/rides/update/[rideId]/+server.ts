import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const POST: RequestHandler = async (event) => {
	try {
		const rideData = await event.request.json();
		const rideId = parseInt(event.params.rideId || '');

		if (!rideId) {
			return json({ error: 'Missing ride ID' }, { status: 400 });
		}

		// Create Supabase client
		const supabase = createSupabaseServerClient(event);

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

		// Check if user has dispatcher or admin role
		const hasDispatcherRole = profile.role && (
			Array.isArray(profile.role) 
				? (profile.role.includes('Dispatcher') || profile.role.includes('Admin'))
				: (profile.role === 'Dispatcher' || profile.role === 'Admin')
		);

		if (!hasDispatcherRole) {
			return json({ error: 'Access denied. Dispatcher or Admin role required.' }, { status: 403 });
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

		// Prepare update data - only include fields that are present and valid
		const updateData: any = {};

		// Update status if provided - validate it's a valid enum value
		if (rideData.status) {
			const validStatuses = ['Requested', 'Scheduled', 'In Progress', 'Completed', 'Cancelled'];
			const statusValue = typeof rideData.status === 'string' ? rideData.status.trim() : String(rideData.status || '').trim();
			
			if (statusValue && validStatuses.includes(statusValue)) {
				updateData.status = statusValue;
			} else {
				console.error('Invalid status value received:', rideData.status, 'Expected one of:', validStatuses);
				return json({ error: `Invalid status value: ${statusValue}. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 });
			}
		}

		// Update purpose (ride type) if provided
		if (rideData.purpose) {
			updateData.purpose = rideData.purpose;
		}

		// Update number of clients (riders) if provided
		if (rideData.riders !== undefined && rideData.riders !== null) {
			updateData.riders = parseInt(rideData.riders) || 1;
		}

		// Update mileage if provided
		if (rideData.miles_driven !== undefined && rideData.miles_driven !== null && rideData.miles_driven !== '') {
			updateData.miles_driven = parseFloat(rideData.miles_driven);
		}

		// Update hours if provided
		if (rideData.hours !== undefined && rideData.hours !== null && rideData.hours !== '') {
			updateData.hours = parseFloat(rideData.hours);
		}

		// Update comments (notes) if provided
		if (rideData.notes !== undefined) {
			updateData.notes = rideData.notes || null;
		}

		// Update other ride fields if provided
		if (rideData.client_id !== undefined) {
			updateData.client_id = parseInt(rideData.client_id);
		}

		if (rideData.destination_name !== undefined) {
			updateData.destination_name = rideData.destination_name;
		}

		if (rideData.dropoff_address !== undefined) {
			updateData.dropoff_address = rideData.dropoff_address;
		}

		if (rideData.dropoff_address2 !== undefined) {
			updateData.dropoff_address2 = rideData.dropoff_address2 || null;
		}

		if (rideData.dropoff_city !== undefined) {
			updateData.dropoff_city = rideData.dropoff_city;
		}

		if (rideData.dropoff_state !== undefined) {
			updateData.dropoff_state = rideData.dropoff_state;
		}

		if (rideData.dropoff_zipcode !== undefined) {
			updateData.dropoff_zipcode = rideData.dropoff_zipcode;
		}

		if (rideData.appointment_time !== undefined) {
			updateData.appointment_time = rideData.appointment_time;
		}

		if (rideData.pickup_from_home !== undefined) {
			updateData.pickup_from_home = rideData.pickup_from_home === true || rideData.pickup_from_home === 'true';
		}

		if (rideData.alt_pickup_address !== undefined) {
			updateData.alt_pickup_address = rideData.alt_pickup_address || null;
		}

		if (rideData.alt_pickup_address2 !== undefined) {
			updateData.alt_pickup_address2 = rideData.alt_pickup_address2 || null;
		}

		if (rideData.alt_pickup_city !== undefined) {
			updateData.alt_pickup_city = rideData.alt_pickup_city || null;
		}

		if (rideData.alt_pickup_state !== undefined) {
			updateData.alt_pickup_state = rideData.alt_pickup_state || null;
		}

		if (rideData.alt_pickup_zipcode !== undefined) {
			updateData.alt_pickup_zipcode = rideData.alt_pickup_zipcode || null;
		}

		if (rideData.round_trip !== undefined) {
			updateData.round_trip = rideData.round_trip === true || rideData.round_trip === 'true';
		}

		if (rideData.estimated_appointment_length !== undefined) {
			updateData.estimated_appointment_length = rideData.estimated_appointment_length || null;
		}

		if (rideData.donation !== undefined) {
			updateData.donation = rideData.donation === true || rideData.donation === 'true';
		}

		// Update the ride
		const { error: updateError } = await supabase
			.from('rides')
			.update(updateData)
			.eq('ride_id', rideId)
			.eq('org_id', profile.org_id);

		if (updateError) {
			console.error('Error updating ride:', updateError);
			return json({ error: `Failed to update ride: ${updateError.message}` }, { status: 500 });
		}

		// If miles_driven or hours are provided, also update completedrides table
		if ((rideData.miles_driven !== undefined && rideData.miles_driven !== null && rideData.miles_driven !== '') ||
			(rideData.hours !== undefined && rideData.hours !== null && rideData.hours !== '')) {
			
			const completedRideData: any = {};
			
			if (rideData.miles_driven !== undefined && rideData.miles_driven !== null && rideData.miles_driven !== '') {
				completedRideData.miles_driven = parseFloat(rideData.miles_driven);
			}
			
			if (rideData.hours !== undefined && rideData.hours !== null && rideData.hours !== '') {
				completedRideData.hours = parseFloat(rideData.hours);
			}

			// Check if completed ride record exists
			const { data: existingCompleted } = await supabase
				.from('completedrides')
				.select('ride_id')
				.eq('ride_id', rideId)
				.single();

			if (!existingCompleted) {
				// Create new completed ride record
				const { error: completedError } = await supabase
					.from('completedrides')
					.insert({
						ride_id: rideId,
						...completedRideData
					});

				if (completedError) {
					console.error('Error creating completed ride record:', completedError);
					// Don't fail the whole request if this fails
				}
			} else {
				// Update existing record
				const { error: updateCompletedError } = await supabase
					.from('completedrides')
					.update(completedRideData)
					.eq('ride_id', rideId);

				if (updateCompletedError) {
					console.error('Error updating completed ride record:', updateCompletedError);
					// Don't fail the whole request if this fails
				}
			}
		}

		return json({ success: true });

	} catch (error: any) {
		console.error('Error in ride update:', error);
		return json({ error: `Internal server error: ${error.message}` }, { status: 500 });
	}
};

