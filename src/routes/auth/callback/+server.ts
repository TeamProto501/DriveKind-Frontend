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

		// For other flows (magic link, sign up, email confirmation), check if we have a session
		if (data?.session) {
			// Magic link or other auth flows - redirect to role-based home
			const { data: profile } = await supabase
				.from('staff_profiles')
				.select('role')
				.eq('user_id', data.session.user.id)
				.single();

			const roles = Array.isArray(profile?.role) ? profile.role : [];
			
			// Get role-based home page
			let homePage = '/';
			if (roles.includes('Super Admin') || roles.includes('Admin')) {
				homePage = '/admin/dash';
			} else if (roles.includes('Dispatcher')) {
				homePage = '/dispatcher/dashboard';
			} else if (roles.includes('Driver')) {
				homePage = '/driver/rides';
			} else if (roles.includes('Volunteer')) {
				homePage = '/calendar';
			}

			console.log('Magic link login successful, redirecting to:', homePage);
			throw redirect(303, homePage);
		}
	}

	// Default redirect for other auth flows (sign up, email confirmation, etc.)
	throw redirect(303, '/');
};
