import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const POST: RequestHandler = async (event) => {
	try {
		const body = await event.request.json();
		const { 
			rideId, 
			hours, 
			miles_driven, 
			donation_received, 
			donation_amount, 
			completion_status, // ← Extracted but not saved!
			comments,
			riders,
			donation,
			notes,
			start_time,
			end_time,
			status
		} = body;

		const finalStatus = status || (completion_status === 'Completed' ? 'Completed' : 'Reported');
		const finalMiles = miles_driven ? parseFloat(miles_driven) : null;
		const finalHours = hours ? parseFloat(hours) : null;
		const finalDonation = donation !== undefined ? donation : (donation_received || false);
		const finalNotes = notes || comments || null;
		const finalRiders = riders ? parseInt(riders) : null;
		const finalDonationAmount = donation_amount ? parseFloat(donation_amount) : null;
		const finalCompletionStatus = completion_status || null; // ← NEW

		if (!rideId || !finalStatus) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}

		if (finalStatus === 'Completed' && (!finalMiles || !finalHours)) {
			return json({ error: 'Miles driven and hours are required for completion' }, { status: 400 });
		}

		const supabase = createSupabaseServerClient(event);

		const { data: { user }, error: userError } = await supabase.auth.getUser();
		
		if (userError || !user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

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
			status: finalStatus,
			miles_driven: finalMiles,
			hours: finalHours,
			donation: finalDonation,
			notes: finalNotes,
			completion_status: finalCompletionStatus // ← ADD THIS LINE
		};

		if (finalRiders !== null) {
			updateData.riders = finalRiders;
		}

		if (finalDonationAmount !== null) {
			updateData.donation_amount = finalDonationAmount;
		}

		const { error: updateError } = await supabase
			.from('rides')
			.update(updateData)
			.eq('ride_id', rideId);

		if (updateError) {
			console.error('Error updating ride:', updateError);
			return json({ error: `Failed to update ride: ${updateError.message}` }, { status: 500 });
		}

		// Create or update completed ride record
		const { data: existingCompleted } = await supabase
			.from('completedrides')
			.select('ride_id')
			.eq('ride_id', rideId)
			.maybeSingle();

		const completedData: any = {
			miles_driven: finalMiles,
			hours: finalHours,
			donation_amount: finalDonationAmount,
			comments: finalNotes
		};

		if (start_time) {
			completedData.actual_start = new Date(start_time).toISOString();
		}
		if (end_time) {
			completedData.actual_end = new Date(end_time).toISOString();
		} else if (finalStatus === 'Completed' || finalStatus === 'Reported') {
			completedData.actual_end = new Date().toISOString();
		}

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
		return json({ error: `Internal server error: ${error.message || 'Unknown error'}` }, { status: 500 });
	}
};
