import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const load: PageServerLoad = async (event) => {
  const supabase = createSupabaseServerClient(event);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    throw redirect(302, '/admin/dash');
  }

  return {};
};

export const actions: Actions = {
  resetPassword: async (event) => {
    const supabase = createSupabaseServerClient(event);
    const formData = await event.request.formData();

    const email = formData.get('email')?.toString() || '';

    if (!email) {
      return fail(400, { error: 'Please enter your email address' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return fail(400, { error: 'Please enter a valid email address' });
    }

    // Use auth callback which will handle the code exchange and redirect to reset-password
    // The callback will detect it's a recovery type and redirect accordingly
    // Make sure to use the full URL with protocol
    const callbackUrl = `${event.url.origin}/auth/callback`;
    console.log('Sending password reset email with redirect URL:', callbackUrl);
    console.log('Event URL origin:', event.url.origin);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: callbackUrl,
      // Add email options to ensure proper redirect
      emailRedirectTo: callbackUrl,
    });

    if (error) {
      console.error('Password reset error:', error);
      return {
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      };
    }

    return {
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    };
  },
};

