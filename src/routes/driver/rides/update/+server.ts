import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const POST: RequestHandler = async (event) => {
	try {
		const { rideId, status } = await event.request.json();

		if (!rideId || !status) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}

		// Create Supabase client - pass the full event object
		const supabase = createSupabaseServerClient(event);

		// Get the current user
		const { data: { user }, error: userError } = await supabase.auth.getUser();
		
		if (userError || !user) {
			console.error('Auth error:', userError);
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Verify the ride belongs to this driver
		const { data: ride, error: rideError } = await supabase
			.from('rides')
			.select('ride_id, driver_user_id, status')
			.eq('ride_id', rideId)
			.eq('driver_user_id', user.id)
			.single();

		if (rideError || !ride) {
			console.error('Ride error:', rideError);
			return json({ error: 'Ride not found or access denied' }, { status: 404 });
		}

		console.log(`Updating ride ${rideId} from ${ride.status} to ${status}`);

		// Update the ride status
		const { error: updateError } = await supabase
			.from('rides')
			.update({ 
				status
			})
			.eq('ride_id', rideId);

		if (updateError) {
			console.error('Error updating ride status:', updateError);
			return json({ error: `Failed to update ride status: ${updateError.message}` }, { status: 500 });
		}

		// If reporting as complete (pending review), create/update completed ride record
		if (status === 'Reported') {
			console.log(`Creating/updating completed ride record for ride ${rideId}`);
			
			// Check if completed ride record exists
			const { data: existingCompleted } = await supabase
				.from('completedrides')
				.select('ride_id')
				.eq('ride_id', rideId)
				.maybeSingle();

			if (!existingCompleted) {
				// Create new completed ride record with end time
				const { error: completedError } = await supabase
					.from('completedrides')
					.insert({
						ride_id: rideId,
						actual_end: new Date().toISOString()
					});

				if (completedError) {
					console.error('Error creating completed ride record:', completedError);
					// Don't fail the request, just log the error
				} else {
					console.log('Created completed ride record');
				}
			} else {
				// Update existing record with end time
				const { error: updateCompletedError } = await supabase
					.from('completedrides')
					.update({
						actual_end: new Date().toISOString()
					})
					.eq('ride_id', rideId);

				if (updateCompletedError) {
					console.error('Error updating completed ride record:', updateCompletedError);
				} else {
					console.log('Updated completed ride record');
				}
			}
		}

		// If starting a ride, update the actual_start in completedrides
		if (status === 'In Progress') {
			console.log(`Recording ride start for ride ${rideId}`);
			
			// Check if completed ride record exists
			const { data: existingCompleted } = await supabase
				.from('completedrides')
				.select('ride_id')
				.eq('ride_id', rideId)
				.maybeSingle();

			if (!existingCompleted) {
				// Create new completed ride record with start time
				const { error: completedError } = await supabase
					.from('completedrides')
					.insert({
						ride_id: rideId,
						actual_start: new Date().toISOString()
					});

				if (completedError) {
					console.error('Error creating completed ride record:', completedError);
				} else {
					console.log('Created completed ride record with start time');
				}
			} else {
				// Update existing record with start time
				const { error: updateCompletedError } = await supabase
					.from('completedrides')
					.update({
						actual_start: new Date().toISOString()
					})
					.eq('ride_id', rideId);

				if (updateCompletedError) {
					console.error('Error updating completed ride record:', updateCompletedError);
				} else {
					console.log('Updated completed ride record with start time');
				}
			}
		}

		console.log(`Successfully updated ride ${rideId} to status ${status}`);
		return json({ success: true });

	} catch (error: any) {
		console.error('Error in ride status update:', error);
		console.error('Error stack:', error.stack);
		return json({ error: `Internal server error: ${error.message}` }, { status: 500 });
	}
};
