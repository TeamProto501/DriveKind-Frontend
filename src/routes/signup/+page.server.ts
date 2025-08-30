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
	signup: async (event) => {
		const supabase = createSupabaseServerClient(event);
		const formData = await event.request.formData();
		
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;
		const confirmPassword = formData.get('confirmPassword') as string;
		
		if (!email || !password || !confirmPassword) {
			return fail(400, {
				error: 'Please fill in all fields',
				email
			});
		}
		
		if (password !== confirmPassword) {
			return fail(400, {
				error: 'Passwords do not match',
				email
			});
		}
		
		if (password.length < 6) {
			return fail(400, {
				error: 'Password must be at least 6 characters long',
				email
			});
		}
		
		const { error } = await supabase.auth.signUp({
			email,
			password
		});
		
		if (error) {
			return fail(400, {
				error: error.message,
				email
			});
		}
		
		return {
			message: 'Check your email for confirmation link',
			email
		};
	}
};