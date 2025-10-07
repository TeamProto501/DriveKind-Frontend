// src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const load: LayoutServerLoad = async (event) => {
	const supabase = createSupabaseServerClient(event);
	
	try {
		// Use getUser() instead of getSession() for better security
		const { data: { user }, error } = await supabase.auth.getUser();
		
		// Don't log "Auth session missing" as an error - it's normal when not logged in
		if (error && !error.message?.includes('Auth session missing')) {
			console.error('Error getting user:', error);
		}
		
		// Convert user to session format for compatibility
		const session = user ? { user } : null;

		// Fetch staff profile linked to the auth user when logged in
		let profile: any = null;
		let roles: string[] | null = null;
		if (user) {
			const { data: profileRow, error: profileError } = await supabase
				.from('staff_profiles')
				.select('user_id, org_id, first_name, last_name, email, role')
				.eq('user_id', user.id)
				.maybeSingle();

			if (profileError && profileError.code !== 'PGRST116') {
				console.error('Error loading staff profile:', profileError);
			}

			if (profileRow) {
				profile = profileRow;
				// Handle PostgreSQL enum array format
				if (profileRow.role) {
					if (Array.isArray(profileRow.role)) {
						roles = profileRow.role;
					} else if (typeof profileRow.role === 'string') {
						// If it's a single role string, convert to array
						roles = [profileRow.role];
					}
				}
				console.log('Loaded profile roles:', roles);
			}
		}
		
		return {
			session,
			profile,
			roles
		};
	} catch (error) {
		// If there's any error getting the user, just return no session
		return {
			session: null,
			profile: null,
			roles: null
		};
	}
};
