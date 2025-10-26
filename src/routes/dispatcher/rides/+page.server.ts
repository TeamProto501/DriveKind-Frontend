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

		// Get the user's profile to check if they're a dispatcher
		const { data: profile, error: profileError } = await supabase
			.from('staff_profiles')
			.select('user_id, org_id, first_name, last_name, role')
			.eq('user_id', user.id)
			.single();

		if (profileError || !profile) {
			console.error('Profile error:', profileError);
			return {
				rides: [],
				drivers: [],
				clients: [],
				profile: null,
				error: 'Profile not found. Please contact your administrator.'
			};
		}

		// Check if user has dispatcher role
		const hasDispatcherRole = profile.role && (
			Array.isArray(profile.role) ? profile.role.includes('Dispatcher') : profile.role === 'Dispatcher'
		);

		if (!hasDispatcherRole) {
			return {
				rides: [],
				drivers: [],
				clients: [],
				profile,
				error: 'Access denied. Dispatcher role required.'
			};
		}

		// Get all rides for the organization
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
				),
				drivers:driver_user_id (
					first_name,
					last_name
				)
			`)
			.eq('org_id', profile.org_id)
			.order('appointment_time', { ascending: true });

		if (ridesError) {
			console.error('Error loading rides:', ridesError);
		}

		// Get available drivers for assignment
		const { data: drivers, error: driversError } = await supabase
			.from('staff_profiles')
			.select('user_id, first_name, last_name, role')
			.eq('org_id', profile.org_id)
			.contains('role', ['Driver']);

		if (driversError) {
			console.error('Error loading drivers:', driversError);
		}

		// Get clients for ride creation with full address info
		const { data: clients, error: clientsError } = await supabase
			.from('clients')
			.select('client_id, first_name, last_name, primary_phone, address, address2, city, state, zipcode')
			.eq('org_id', profile.org_id)
			.order('first_name', { ascending: true });

		if (clientsError) {
			console.error('Error loading clients:', clientsError);
		}

		return {
			rides: rides || [],
			drivers: drivers || [],
			clients: clients || [],
			profile,
			error: null
		};

	} catch (error) {
		console.error('Error in dispatcher rides page load:', error);
		if (error instanceof Response) {
			throw error; // Re-throw redirects
		}
		return {
			rides: [],
			drivers: [],
			clients: [],
			profile: null,
			error: 'Failed to load rides data'
		};
	}
};
