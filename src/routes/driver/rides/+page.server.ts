import type { PageServerLoad } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
	const supabase = createSupabaseServerClient(event);
	
	try {
		// Get the session
		const { data: { session }, error: sessionError } = await supabase.auth.getSession();
		
		if (sessionError || !session) {
			throw redirect(302, '/login');
		}

		// Get the user's profile to check if they're a driver
		const { data: profile, error: profileError } = await supabase
			.from('staff_profiles')
			.select('user_id, org_id, first_name, last_name, role')
			.eq('user_id', session.user.id)
			.single();

		if (profileError || !profile) {
			console.error('Profile error:', profileError);
			return {
				session,
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
				session,
				rides: [],
				completedRidesData: {},
				profile,
				error: 'Access denied. Driver role required.'
			};
		}

		// Get ALL rides assigned to this driver
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
			.eq('driver_user_id', session.user.id)
			.order('appointment_time', { ascending: true });

		if (ridesError) {
			console.error('Error loading rides:', ridesError);
			console.error('Rides error details:', JSON.stringify(ridesError, null, 2));
			return {
				session,
				rides: [],
				completedRidesData: {},
				profile,
				error: `Failed to load rides: ${ridesError.message}`
			};
		}

		console.log(`Loaded ${rides?.length || 0} rides for driver ${session.user.id}`);

		// Get completed rides data
		const completedRideIds = rides?.filter(ride => 
			ride.status === 'Completed' || ride.status === 'Reported' || ride.status === 'Cancelled'
		).map(ride => ride.ride_id) || [];
		
		let completedRidesData = {};
		
		if (completedRideIds.length > 0) {
			const { data: completedRides, error: completedError } = await supabase
				.from('completedrides')
				.select('ride_id, actual_start, actual_end, miles_driven, hours, donation_amount')
				.in('ride_id', completedRideIds);

			if (completedError) {
				console.error('Error loading completed rides data:', completedError);
			}

			if (!completedError && completedRides) {
				completedRidesData = completedRides.reduce((acc, completed) => {
					acc[completed.ride_id] = completed;
					return acc;
				}, {} as Record<number, any>);
			}
		}

		return {
			session, // ← MAKE SURE THIS IS HERE!
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
			session: null,
			rides: [],
			completedRidesData: {},
			profile: null,
			error: `Failed to load rides data: ${error.message || 'Unknown error'}`
		};
	}
};
