import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const load: PageServerLoad = async (event) => {
  const supabase = createSupabaseServerClient(event);
  
  // Check if there's already a valid session first (might have been set by auth callback)
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    console.log('Valid session found, user can reset password');
    return {
      hasValidToken: true,
    };
  }

  // Check if there's a code parameter (from Supabase redirect)
  const code = event.url.searchParams.get('code');
  const type = event.url.searchParams.get('type');
  const urlError = event.url.searchParams.get('error');
  
  console.log('Reset password page load - code:', !!code, 'type:', type, 'error:', urlError);
  
  // For PKCE flow (recovery codes), we need client-side exchange
  // Server-side exchange won't work because code_verifier is stored in browser
  // So we skip server-side exchange and let client handle it
  if (code && type === 'recovery') {
    console.log('PKCE recovery code detected, will be handled client-side');
    return {
      hasValidToken: false,
      error: null, // Client will handle the PKCE exchange
    };
  }
  

  // If there's an error parameter, show it
  if (urlError) {
    return {
      hasValidToken: false,
      error: 'Invalid or expired reset token. Please request a new password reset link.',
    };
  }

  // No valid session - user needs to request a new reset link
  return {
    hasValidToken: false,
    error: null, // Don't show error yet - let client-side code check for hash fragments
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

