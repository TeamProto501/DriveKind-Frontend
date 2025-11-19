import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const load: PageServerLoad = async (event) => {
  // Don't check session on server - hash fragments are only available on client
  // The client-side code will handle the token verification
  return {
    hasValidToken: false, // Will be set to true on client after processing hash
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

