import type { PageServerLoad } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
	const supabase = createSupabaseServerClient(event);
	
	try {
		// Get the current user
		const { data: { user }, error: userError } = await supabase.auth.getUser();
		
		if (userError || !user) {
			throw redirect(302, '/login');
		}

		// Get the user's profile to check if they're a driver
		const { data: profile, error: profileError } = await supabase
			.from('staff_profiles')
			.select('user_id, org_id, first_name, last_name, role')
			.eq('user_id', user.id)
			.single();

		if (profileError || !profile) {
			throw redirect(302, '/login');
		}

		// Check if user has driver role
		const hasDriverRole = profile.role && (
			Array.isArray(profile.role) ? profile.role.includes('Driver') : profile.role === 'Driver'
		);

		if (!hasDriverRole) {
			throw redirect(302, '/login');
		}

		// Get rides assigned to this driver
		const { data: rides, error: ridesError } = await supabase
			.from('rides')
			.select(`
				ride_id,
				client_id,
				driver_id,
				dispatcher_id,
				org_id,
				ride_type,
				pickup_address,
				pickup_address2,
				pickup_city,
				pickup_state,
				pickup_zip,
				dropoff_address,
				dropoff_address2,
				dropoff_city,
				dropoff_state,
				dropoff_zip,
				scheduled_date,
				scheduled_time,
				is_one_way,
				is_recurring,
				recurring_pattern,
				status,
				notes,
				special_requirements,
				created_at,
				updated_at,
				clients:client_id (
					first_name,
					last_name,
					primary_phone
				)
			`)
			.eq('driver_id', user.id)
			.order('scheduled_date', { ascending: true })
			.order('scheduled_time', { ascending: true });

		if (ridesError) {
			console.error('Error loading rides:', ridesError);
			return {
				rides: [],
				profile,
				error: 'Failed to load rides'
			};
		}

		// Get completed rides data if any rides are completed
		const completedRideIds = rides?.filter(ride => ride.status === 'Completed').map(ride => ride.ride_id) || [];
		let completedRidesData = {};
		
		if (completedRideIds.length > 0) {
			const { data: completedRides, error: completedError } = await supabase
				.from('completedrides')
				.select('ride_id, actual_start, actual_end, miles_driven, hours, donation_amount')
				.in('ride_id', completedRideIds);

			if (!completedError && completedRides) {
				completedRidesData = completedRides.reduce((acc, completed) => {
					acc[completed.ride_id] = completed;
					return acc;
				}, {} as Record<number, any>);
			}
		}

		return {
			rides: rides || [],
			completedRidesData,
			profile,
			error: null
		};

	} catch (error) {
		console.error('Error in driver rides page load:', error);
		if (error instanceof Response) {
			throw error; // Re-throw redirects
		}
		return {
			rides: [],
			completedRidesData: {},
			profile: null,
			error: 'Failed to load rides data'
		};
	}
};
