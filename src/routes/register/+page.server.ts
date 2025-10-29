import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const actions: Actions = {
	default: async (event) => {
		const formData = await event.request.formData();
		const email = formData.get('email')?.toString();
		const password = formData.get('password')?.toString();
		const confirmPassword = formData.get('confirmPassword')?.toString();

		if (!email || !password || !confirmPassword) {
			return fail(400, {
				error: 'All fields are required'
			});
		}

		if (password !== confirmPassword) {
			return fail(400, {
				error: 'Passwords do not match'
			});
		}

		if (password.length < 6) {
			return fail(400, {
				error: 'Password must be at least 6 characters'
			});
		}

		const supabase = createSupabaseServerClient(event);

		const { error } = await supabase.auth.signUp({
			email,
			password,
			options: {
				emailRedirectTo: `${event.url.origin}/auth/callback`
			}
		});

		if (error) {
			return fail(500, {
				error: error.message
			});
		}

		return {
			success: true,
			message: 'Account created! Please check your email to verify your account.'
		};
	}
};
