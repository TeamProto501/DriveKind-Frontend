import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const load: PageServerLoad = async (event) => {
  const supabase = createSupabaseServerClient(event);
  
  // Check if there's a code parameter (from Supabase redirect)
  const code = event.url.searchParams.get('code');
  const type = event.url.searchParams.get('type');
  const urlError = event.url.searchParams.get('error');
  
  console.log('Reset password page load - code:', !!code, 'type:', type, 'error:', urlError);
  
  // If there's a code, try to exchange it for a session
  if (code) {
    console.log('Attempting to exchange code for session...');
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('Error exchanging code:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      // Don't return error immediately - let client-side handle it with hash fragments
      // The code might be for PKCE flow which needs client-side handling
      return {
        hasValidToken: false,
        error: null, // Let client-side code try to handle it
      };
    }
    
    if (data?.session) {
      console.log('Code exchanged successfully, session created');
      return {
        hasValidToken: true,
      };
    } else {
      console.log('Code exchanged but no session returned');
    }
  }
  
  // Check if there's already a valid session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    return {
      hasValidToken: true,
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

