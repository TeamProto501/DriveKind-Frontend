import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const GET: RequestHandler = async (event) => {
	const supabase = createSupabaseServerClient(event);
	const code = event.url.searchParams.get('code');
	const type = event.url.searchParams.get('type'); // 'recovery' for password reset

	console.log('Auth callback - code:', !!code, 'type:', type);

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

		console.log('Code exchanged successfully, session:', !!data?.session);

		// Check if this is a password reset flow
		// Password reset codes have type='recovery'
		if (type === 'recovery') {
			console.log('Recovery type detected, redirecting to reset-password');
			// Session is already set after code exchange, just redirect to reset-password
			// The reset-password page will check for the session
			throw redirect(303, '/reset-password');
		}

		// For other flows (sign up, email confirmation), check if we have a session
		if (data?.session) {
			// Redirect to home for successful authentication
			throw redirect(303, '/');
		}
	}

	// Default redirect for other auth flows (sign up, email confirmation, etc.)
	throw redirect(303, '/');
};
