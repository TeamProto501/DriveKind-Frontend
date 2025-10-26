import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const { rideId, miles_driven, hours, riders, donation, notes, status } = await request.json();

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
			.select('ride_id, driver_user_id, status')
			.eq('ride_id', rideId)
			.eq('driver_user_id', user.id)
			.single();

		if (rideError || !ride) {
			return json({ error: 'Ride not found or access denied' }, { status: 404 });
		}

		// Update the ride with completion data
		const updateData: any = {
			status,
			miles_driven,
			hours,
			riders: riders ? parseInt(riders) : null,
			donation,
			notes
		};

		const { error: updateError } = await supabase
			.from('rides')
			.update(updateData)
			.eq('ride_id', rideId);

		if (updateError) {
			console.error('Error updating ride status:', updateError);
			return json({ error: 'Failed to update ride' }, { status: 500 });
		}

		// Create or update completed ride record
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
					actual_end: new Date().toISOString(),
					miles_driven: miles_driven ? parseFloat(miles_driven) : null,
					hours: hours ? parseFloat(hours) : null,
					donation_amount: donation ? null : null // We'll need to handle this separately if there's a donation amount
				});

			if (completedError) {
				console.error('Error creating completed ride record:', completedError);
			}
		} else {
			// Update existing record
			const { error: updateCompletedError } = await supabase
				.from('completedrides')
				.update({
					actual_end: new Date().toISOString(),
					miles_driven: miles_driven ? parseFloat(miles_driven) : null,
					hours: hours ? parseFloat(hours) : null
				})
				.eq('ride_id', rideId);

			if (updateCompletedError) {
				console.error('Error updating completed ride record:', updateCompletedError);
			}
		}

		return json({ success: true });

	} catch (error) {
		console.error('Error in ride completion:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
