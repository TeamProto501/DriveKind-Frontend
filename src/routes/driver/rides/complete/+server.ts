import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const POST: RequestHandler = async (event) => {
	try {
		const { rideId, hours, miles_driven, donation_received, donation_amount, completion_status, comments } = await event.request.json();

		if (!rideId || !hours || !miles_driven || !completion_status) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}

		const supabase = createSupabaseServerClient(event);

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

		// Update the ride with completion data
		const { error: updateError } = await supabase
			.from('rides')
			.update({ 
				status: 'Reported',
				hours: parseFloat(hours),
				miles_driven: parseFloat(miles_driven),
				donation: donation_received || false,
				donation_amount: donation_received && donation_amount ? parseFloat(donation_amount) : null,
				completion_status: completion_status
			})
			.eq('ride_id', rideId);

		if (updateError) {
			console.error('Error updating ride:', updateError);
			return json({ error: `Failed to update ride: ${updateError.message}` }, { status: 500 });
		}

		// Create/update completed ride record
		const { data: existingCompleted } = await supabase
			.from('completedrides')
			.select('ride_id')
			.eq('ride_id', rideId)
			.maybeSingle();

		const completedData = {
			actual_end: new Date().toISOString(),
			miles_driven: parseFloat(miles_driven),
			hours: parseFloat(hours),
			donation_amount: donation_received && donation_amount ? parseFloat(donation_amount) : null,
			comments: comments || null
		};

		if (!existingCompleted) {
			const { error: completedError } = await supabase
				.from('completedrides')
				.insert({
					ride_id: rideId,
					...completedData
				});

			if (completedError) {
				console.error('Error creating completed ride record:', completedError);
			}
		} else {
			const { error: updateCompletedError } = await supabase
				.from('completedrides')
				.update(completedData)
				.eq('ride_id', rideId);

			if (updateCompletedError) {
				console.error('Error updating completed ride record:', updateCompletedError);
			}
		}

		return json({ success: true });

	} catch (error: any) {
		console.error('Error in ride completion:', error);
		return json({ error: `Internal server error: ${error.message}` }, { status: 500 });
	}
};