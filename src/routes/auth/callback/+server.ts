import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const GET: RequestHandler = async (event) => {
	const supabase = createSupabaseServerClient(event);
	const code = event.url.searchParams.get('code');
	const type = event.url.searchParams.get('type'); // 'recovery' for password reset
	const error = event.url.searchParams.get('error');

	console.log('Auth callback - code:', !!code, 'type:', type, 'error:', error);

	// If there's an error, redirect to reset-password with error
	if (error && type === 'recovery') {
		throw redirect(303, `/reset-password?error=${error}`);
	}

	// For recovery (password reset) flows, always redirect to reset-password
	// The reset-password page will handle code exchange (if hash fragments) or show appropriate error
	if (type === 'recovery') {
		console.log('Recovery flow detected, redirecting to reset-password');
		// Pass code if present (for PKCE flow - client will handle it)
		const redirectUrl = code 
			? `/reset-password?code=${code}&type=recovery`
			: '/reset-password';
		throw redirect(303, redirectUrl);
	}

	if (code) {
		// For non-recovery flows, try server-side exchange
		try {
			const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
			
			if (exchangeError) {
				console.error('Error exchanging code for session:', exchangeError);
				throw redirect(303, '/login?error=auth_failed');
			}

			console.log('Code exchanged successfully, session:', !!data?.session);

			// For other flows (sign up, email confirmation), check if we have a session
			if (data?.session) {
				// Redirect to home for successful authentication
				throw redirect(303, '/');
			}
		} catch (e) {
			console.error('Exception during code exchange:', e);
			throw redirect(303, '/login?error=auth_failed');
		}
	}

	// Default redirect for other auth flows (sign up, email confirmation, etc.)
	throw redirect(303, '/');
};
