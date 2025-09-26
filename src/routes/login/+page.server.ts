import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const load: PageServerLoad = async (event) => {
	const supabase = createSupabaseServerClient(event);
	const { data: { session } } = await supabase.auth.getSession();

	// Redirect if already logged in
	if (session) {
		throw redirect(302, '/');
	}

	return {};
};

export const actions: Actions = {
	login: async (event) => {
		const supabase = createSupabaseServerClient(event);
		const formData = await event.request.formData();

		const email = formData.get('email') as string;
		const password = formData.get('password') as string;

		if (!email || !password) {
			return fail(400, {
				error: 'Please fill in all fields',
				email
			});
		}

		const { data, error } = await supabase.auth.signInWithPassword({
			email,
			password
		});

		if (error) {
			return fail(400, {
				error: error.message,
				email
			});
		}

		// ✅ session cookie is automatically set by supabase server client
		if (!data.session) {
			return fail(400, {
				error: 'No session returned from Supabase',
				email
			});
		}

		// Redirect wherever you want authenticated users to land
		throw redirect(302, '/dashboard'); 
	},

	logout: async (event) => {
		const supabase = createSupabaseServerClient(event);
		const { error } = await supabase.auth.signOut();

		if (error) {
			return fail(500, {
				error: 'Error logging out'
			});
		}

		throw redirect(302, '/login');
	}
};
