import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const { rideId, status } = await request.json();

		if (!rideId || !status) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}

		// Create Supabase client
		const supabase = createSupabaseServerClient({ cookies });

		// Get the current user
		const { data: { user }, error: userError } = await supabase.auth.getUser();
		
		if (userError || !user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Verify the ride belongs to this driver
		const { data: ride, error: rideError } = await supabase
			.from('rides')
			.select('ride_id, driver_id, status')
			.eq('ride_id', rideId)
			.eq('driver_id', user.id)
			.single();

		if (rideError || !ride) {
			return json({ error: 'Ride not found or access denied' }, { status: 404 });
		}

		// Update the ride status
		const { error: updateError } = await supabase
			.from('rides')
			.update({ 
				status,
				updated_at: new Date().toISOString()
			})
			.eq('ride_id', rideId);

		if (updateError) {
			console.error('Error updating ride status:', updateError);
			return json({ error: 'Failed to update ride status' }, { status: 500 });
		}

		// If completing a ride, create a completed ride record
		if (status === 'Completed') {
			const { error: completedError } = await supabase
				.from('completedrides')
				.insert({
					ride_id: rideId,
					actual_end: new Date().toISOString()
				});

			if (completedError) {
				console.error('Error creating completed ride record:', completedError);
				// Don't fail the request, just log the error
			}
		}

		// If starting a ride, update the actual_start in completedrides
		if (status === 'In Progress') {
			// Check if completed ride record exists
			const { data: existingCompleted } = await supabase
				.from('completedrides')
				.select('ride_id')
				.eq('ride_id', rideId)
				.single();

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
				}
			}
		}

		return json({ success: true });

	} catch (error) {
		console.error('Error in ride status update:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
