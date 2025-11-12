import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const POST: RequestHandler = async (event) => {
	try {
		const { rideId, miles_driven, hours, notes, completion_status } = await event.request.json();

		if (!rideId) {
			return json({ error: 'Missing ride ID' }, { status: 400 });
		}

		const supabase = createSupabaseServerClient(event);

		// Get current user
		const { data: { user }, error: userError } = await supabase.auth.getUser();
		if (userError || !user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Verify this ride belongs to this driver
		const { data: ride, error: rideError } = await supabase
			.from('rides')
			.select('ride_id, driver_user_id')
			.eq('ride_id', rideId)
			.eq('driver_user_id', user.id)
			.single();

		if (rideError || !ride) {
			return json({ error: 'Ride not found or access denied' }, { status: 404 });
		}

		// Build update object
		const updateData: any = {};
		
		if (miles_driven !== undefined && miles_driven !== null && miles_driven !== '') {
			updateData.miles_driven = parseFloat(miles_driven);
		}
		if (hours !== undefined && hours !== null && hours !== '') {
			updateData.hours = parseFloat(hours);
		}
		if (notes !== undefined) {
			updateData.notes = notes;
		}
		if (completion_status !== undefined) {
			updateData.completion_status = completion_status;
		}

		// Update the ride
		const { error: updateError } = await supabase
			.from('rides')
			.update(updateData)
			.eq('ride_id', rideId);

		if (updateError) {
			console.error('Error updating ride:', updateError);
			return json({ error: `Failed to update ride: ${updateError.message}` }, { status: 500 });
		}

		// Also update completedrides if it exists
		if (miles_driven !== undefined || hours !== undefined) {
			const completedUpdateData: any = {};
			if (miles_driven !== undefined && miles_driven !== null && miles_driven !== '') {
				completedUpdateData.miles_driven = parseFloat(miles_driven);
			}
			if (hours !== undefined && hours !== null && hours !== '') {
				completedUpdateData.hours = parseFloat(hours);
			}
			if (notes !== undefined) {
				completedUpdateData.comments = notes;
			}

			if (Object.keys(completedUpdateData).length > 0) {
				const { error: completedError } = await supabase
					.from('completedrides')
					.update(completedUpdateData)
					.eq('ride_id', rideId);

				if (completedError) {
					console.error('Error updating completedrides:', completedError);
					// Don't fail the request, just log
				}
			}
		}

		return json({ success: true });

	} catch (error: any) {
		console.error('Error in driver ride edit:', error);
		return json({ error: `Internal server error: ${error.message}` }, { status: 500 });
	}
};