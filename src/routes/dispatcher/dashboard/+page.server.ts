import type { PageServerLoad } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
	const supabase = createSupabaseServerClient(event);
	
	try {
		// Get the current user
		const { data: { session }, error: sessionError } = await supabase.auth.getSession();
		
		if (sessionError || !session) {
			throw redirect(302, '/login');
		}

		// Get the user's profile to check if they're a dispatcher
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
				session,
				rides: [],
				profile,
				error: 'Access denied. Dispatcher role required.'
			};
		}

		// Get recent ride requests for the organization (limit to most recent 10, ordered by creation)
		const { data: rides, error: ridesError } = await supabase
			.from('rides')
			.select(`
				ride_id,
				org_id,
				client_id,
				alt_pickup_address,
				dropoff_address,
				appointment_time,
				status,
				purpose,
				destination_name,
				alt_pickup_city,
				alt_pickup_state,
				dropoff_city,
				dropoff_state,
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
			.order('appointment_time', { ascending: true })
			.limit(10);

		if (ridesError) {
			console.error('Error loading rides:', ridesError);
		}

		// Get ride counts for stats
		const { data: allRides } = await supabase
			.from('rides')
			.select('status')
			.eq('org_id', profile.org_id);

		const rideCounts = {
			pending: allRides?.filter(r => r.status === 'Requested').length || 0,
			assigned: allRides?.filter(r => r.status === 'Assigned' || r.status === 'Scheduled').length || 0,
			inProgress: allRides?.filter(r => r.status === 'In Progress').length || 0,
			completed: allRides?.filter(r => r.status === 'Completed').length || 0
		};

		// Get active drivers count
		const { data: drivers } = await supabase
			.from('staff_profiles')
			.select('user_id')
			.eq('org_id', profile.org_id)
			.contains('role', ['Driver']);

		return {
			session,
			rides: rides || [],
			profile,
			rideCounts,
			activeDrivers: drivers?.length || 0,
			error: null
		};

	} catch (error) {
		console.error('Error in dispatcher dashboard page load:', error);
		if (error instanceof Response) {
			throw error; // Re-throw redirects
		}
		return {
			session: null,
			rides: [],
			profile: null,
			rideCounts: { pending: 0, assigned: 0, inProgress: 0, completed: 0 },
			activeDrivers: 0,
			error: 'Failed to load dashboard data'
		};
	}
};

