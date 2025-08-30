import { redirect, fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';
import { authenticatedFetch, API_BASE_URL } from '$lib/api.server';

export const actions: Actions = {
	logout: async (event) => {
		const supabase = createSupabaseServerClient(event);
		const { error } = await supabase.auth.signOut();
		
		if (error) {
			return fail(500, {
				error: 'Error logging out'
			});
		}
		
		throw redirect(302, '/login');
	},

	testProviders: async (event) => {
		try {
			const response = await authenticatedFetch(
				`${API_BASE_URL}/providers`,
				{},
				undefined,
				event
			);
			
			if (response.ok) {
				const data = await response.json();
				return {
					success: true,
					data: data
				};
			} else {
				const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
				return fail(response.status, {
					error: `HTTP ${response.status}: ${errorData.error || 'Unknown error'}`
				});
			}
		} catch (error) {
			return fail(500, {
				error: `Network error: ${error.message}`
			});
		}
	}
};