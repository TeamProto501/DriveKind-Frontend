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
		
		return {
			session
		};
	} catch (error) {
		// If there's any error getting the user, just return no session
		return {
			session: null
		};
	}
};
