import type { LayoutServerLoad } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const load: LayoutServerLoad = async (event) => {
	const supabase = createSupabaseServerClient(event);
	
	const { data: { session }, error } = await supabase.auth.getSession();
	
	if (error) {
		console.error('Error getting session:', error);
	}
	
	return {
		session
	};
};
