import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const GET: RequestHandler = async (event) => {
	const supabase = createSupabaseServerClient(event);
	const code = event.url.searchParams.get('code');
	const type = event.url.searchParams.get('type'); // 'recovery' for password reset

	if (code) {
		const { data, error } = await supabase.auth.exchangeCodeForSession(code);
		
		if (error) {
			console.error('Error exchanging code for session:', error);
			// If it's a recovery code and exchange fails, redirect to reset-password anyway
			// The reset-password page will handle the error
			if (type === 'recovery') {
				throw redirect(303, '/reset-password?error=invalid_token');
			}
			throw redirect(303, '/login?error=auth_failed');
		}

		// If this is a password reset (recovery), redirect to reset-password page
		if (type === 'recovery' || (data?.session && data.session.user)) {
			// Check if this is a recovery session by checking the user's metadata or session
			// For password reset, redirect to reset-password page
			throw redirect(303, '/reset-password');
		}
	}

	// Default redirect for other auth flows (sign up, email confirmation, etc.)
	throw redirect(303, '/');
};
