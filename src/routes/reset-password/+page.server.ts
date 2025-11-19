import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const load: PageServerLoad = async (event) => {
  const supabase = createSupabaseServerClient(event);

  // Check if there's a valid session (user might have already been authenticated via the reset link)
  // Note: Hash fragments are handled on the client side by Supabase SSR
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If user has a session, they likely came from a valid reset link
  // (Supabase automatically creates a session when hash fragments are processed)
  if (session) {
    return {
      hasValidToken: true,
    };
  }

  // No valid session - user needs to request a new reset link
  return {
    error: 'Invalid or expired reset token. Please request a new password reset link.',
  };
};

export const actions: Actions = {
  updatePassword: async (event) => {
    const supabase = createSupabaseServerClient(event);
    const formData = await event.request.formData();

    const password = formData.get('password')?.toString() || '';
    const confirmPassword = formData.get('confirmPassword')?.toString() || '';

    if (!password || !confirmPassword) {
      return fail(400, { error: 'Please fill in all fields' });
    }

    if (password.length < 6) {
      return fail(400, { error: 'Password must be at least 6 characters long' });
    }

    if (password !== confirmPassword) {
      return fail(400, { error: 'Passwords do not match' });
    }

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      console.error('Password update error:', error);
      return fail(400, {
        error: error.message || 'Failed to update password. The reset link may have expired.',
      });
    }

    throw redirect(302, '/login?passwordReset=success');
  },
};

