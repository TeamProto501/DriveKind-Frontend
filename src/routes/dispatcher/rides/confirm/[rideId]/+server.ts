import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const POST: RequestHandler = async (event) => {
	try {
		const rideId = parseInt(event.params.rideId);
		const { miles_driven, hours, donation_amount } = await event.request.json();

		// Create Supabase client
		const supabase = createSupabaseServerClient(event);

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

		// Check if user has dispatcher or admin role
		const hasDispatcherRole = profile.role && (
			Array.isArray(profile.role) 
				? (profile.role.includes('Dispatcher') || profile.role.includes('Admin'))
				: (profile.role === 'Dispatcher' || profile.role === 'Admin')
		);

		if (!hasDispatcherRole) {
			return json({ error: 'Access denied. Dispatcher or Admin role required.' }, { status: 403 });
		}

		// Verify the ride exists and is in Reported status
		const { data: existingRide, error: rideError } = await supabase
			.from('rides')
			.select('ride_id, org_id, status')
			.eq('ride_id', rideId)
			.eq('org_id', profile.org_id)
			.single();

		if (rideError || !existingRide) {
			return json({ error: 'Ride not found or access denied' }, { status: 404 });
		}

		if (existingRide.status !== 'Reported') {
			return json({ error: 'Ride must be in Reported status to confirm' }, { status: 400 });
		}

		// Update the ride status to Completed
		const { error: updateError } = await supabase
			.from('rides')
			.update({ 
				status: 'Completed',
				miles_driven: miles_driven || null,
				hours: hours || null
			})
			.eq('ride_id', rideId);

		if (updateError) {
			console.error('Error confirming ride completion:', updateError);
			return json({ error: 'Failed to confirm ride completion' }, { status: 500 });
		}

		// Update completed rides record
		const { error: completedError } = await supabase
			.from('completedrides')
			.update({
				miles_driven: miles_driven || null,
				hours: hours || null,
				donation_amount: donation_amount || null
			})
			.eq('ride_id', rideId);

		if (completedError) {
			console.error('Error updating completed ride record:', completedError);
			// Don't fail the request, just log the error
		}

		return json({ success: true });

	} catch (error: any) {
		console.error('Error confirming ride completion:', error);
		return json({ error: `Internal server error: ${error.message}` }, { status: 500 });
	}
};