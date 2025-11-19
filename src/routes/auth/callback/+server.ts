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
		// Password reset codes have type='recovery' or we can check the session
		if (type === 'recovery') {
			console.log('Recovery type detected, redirecting to reset-password');
			// Pass the code along so reset-password can use it
			throw redirect(303, `/reset-password?code=${code}&type=recovery`);
		}

		// For other flows (sign up, email confirmation), check if we have a session
		if (data?.session) {
			// Check if user needs to set password (recovery flow)
			// For now, if we have a session from a recovery code, go to reset-password
			// Otherwise, redirect to home
			throw redirect(303, '/');
		}
	}

	// Default redirect for other auth flows (sign up, email confirmation, etc.)
	throw redirect(303, '/');
};
