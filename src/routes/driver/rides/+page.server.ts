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
			console.error('Profile error:', profileError);
			return {
				rides: [],
				completedRidesData: {},
				profile: null,
				error: 'Profile not found. Please contact your administrator.'
			};
		}

		// Check if user has driver role
		const hasDriverRole = profile.role && (
			Array.isArray(profile.role) ? profile.role.includes('Driver') : profile.role === 'Driver'
		);

		if (!hasDriverRole) {
			return {
				rides: [],
				completedRidesData: {},
				profile,
				error: 'Access denied. Driver role required.'
			};
		}

		// Get rides assigned to this driver - include Scheduled, Assigned, In Progress, Completed, Cancelled, and Reported
		const { data: rides, error: ridesError } = await supabase
			.from('rides')
			.select(`
				ride_id,
				org_id,
				client_id,
				vehicle_id,
				dispatcher_user_id,
				alt_pickup_address,
				dropoff_address,
				appointment_time,
				status,
				notes,
				miles_driven,
				hours,
				donation,
				riders,
				pickup_time,
				driver_user_id,
				round_trip,
				purpose,
				estimated_appointment_length,
				destination_name,
				alt_pickup_city,
				alt_pickup_state,
				alt_pickup_zipcode,
				dropoff_city,
				dropoff_state,
				dropoff_zipcode,
				pickup_from_home,
				call_id,
				alt_pickup_address2,
				dropoff_address2,
				clients:client_id (
					first_name,
					last_name,
					primary_phone
				)
			`)
			.eq('driver_user_id', user.id)
			.in('status', ['Scheduled', 'Assigned', 'In Progress', 'Completed', 'Cancelled', 'Reported'])
			.order('appointment_time', { ascending: true });

		if (ridesError) {
			console.error('Error loading rides:', ridesError);
			return {
				rides: [],
				completedRidesData: {},
				profile,
				error: 'Failed to load rides from database'
			};
		}

		// Get completed rides data if any rides are completed
		const completedRideIds = rides?.filter(ride => 
			ride.status === 'Completed' || ride.status === 'Reported'
		).map(ride => ride.ride_id) || [];
		
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
