import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const GET: RequestHandler = async (event) => {
	const supabase = createSupabaseServerClient(event);
	const code = event.url.searchParams.get('code');
	const type = event.url.searchParams.get('type'); // 'recovery' for password reset

	console.log('Auth callback - code:', !!code, 'type:', type);

	// For PKCE flow (password reset with PKCE), we need to let the client handle it
	// Server-side exchange won't work for PKCE because code_verifier is stored in browser
	// Check if this is a recovery flow - redirect to reset-password and let client handle code exchange
	if (code && type === 'recovery') {
		console.log('Recovery code detected, redirecting to reset-password for client-side PKCE exchange');
		// Pass the code and type to reset-password page so client can handle PKCE exchange
		throw redirect(303, `/reset-password?code=${code}&type=recovery`);
	}

	if (code) {
		// For non-PKCE flows, try server-side exchange
		try {
			const { data, error } = await supabase.auth.exchangeCodeForSession(code);
			
			if (error) {
				console.error('Error exchanging code for session:', error);
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
