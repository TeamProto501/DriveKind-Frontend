// src/routes/reset-password/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const load: PageServerLoad = async (event) => {
  const supabase = createSupabaseServerClient(event);
  
  // Check URL parameters
  const code = event.url.searchParams.get('code');
  const type = event.url.searchParams.get('type');
  const urlError = event.url.searchParams.get('error');
  const errorDescription = event.url.searchParams.get('error_description');
  
  console.log('Reset password page load:', { 
    hasCode: !!code, 
    type, 
    error: urlError,
    errorDescription 
  });
  
  // Handle error from Supabase redirect
  if (urlError) {
    console.error('URL error from Supabase:', urlError, errorDescription);
    return {
      hasValidToken: false,
      error: errorDescription || 'Invalid or expired reset token. Please request a new password reset link.',
    };
  }
  
  // If there's a code, attempt server-side exchange
  // Note: This will only work if using PKCE and cookies contain the verifier
  // For implicit flow, tokens come in the URL hash which client-side handles
  if (code) {
    console.log('Attempting server-side code exchange...');
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('Server-side code exchange error:', error.message);
        
        // If it's a verifier error, let client handle it
        // Client can show appropriate message about same-browser requirement
        if (error.message?.includes('verifier') || error.message?.includes('code_verifier')) {
          return {
            hasValidToken: false,
            error: null, // Let client detect and show same-browser warning
            isPKCEError: true,
          };
        }
        
        // Other errors - token expired, already used, etc.
        return {
          hasValidToken: false,
          error: 'This reset link has expired or already been used. Please request a new one.',
        };
      }
      
      if (data?.session) {
        console.log('Server-side code exchange successful');
        return {
          hasValidToken: true,
        };
      }
    } catch (e) {
      console.error('Exception during code exchange:', e);
      return {
        hasValidToken: false,
        error: null, // Let client-side try
      };
    }
  }
  
  // Check for existing session (might be set from previous page load or client-side)
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    console.log('Found existing session for user:', session.user?.email);
    return {
      hasValidToken: true,
    };
  }

  // No code, no session - could be:
  // 1. Direct navigation to page (show error)
  // 2. Implicit flow with tokens in hash (client handles)
  // 3. User needs to request new link
  console.log('No code or session found, letting client-side check URL hash');
  return {
    hasValidToken: false,
    error: null, // Client will check for hash tokens or show appropriate error
  };
};

export const actions: Actions = {
  updatePassword: async (event) => {
    const supabase = createSupabaseServerClient(event);
    const formData = await event.request.formData();

    const password = formData.get('password')?.toString() || '';
    const confirmPassword = formData.get('confirmPassword')?.toString() || '';

    // Validation
    if (!password || !confirmPassword) {
      return fail(400, { error: 'Please fill in all fields' });
    }

    if (password.length < 6) {
      return fail(400, { error: 'Password must be at least 6 characters long' });
    }

    if (password !== confirmPassword) {
      return fail(400, { error: 'Passwords do not match' });
    }

    // Check if we have a valid session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.error('No session found when trying to update password');
      return fail(401, { 
        error: 'Your session has expired. Please request a new password reset link.' 
      });
    }

    // Update the password
    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      console.error('Password update error:', error);
      
      // Handle specific errors
      if (error.message?.includes('expired')) {
        return fail(400, {
          error: 'Your reset session has expired. Please request a new password reset link.',
        });
      }
      
      if (error.message?.includes('same password')) {
        return fail(400, {
          error: 'New password cannot be the same as your current password.',
        });
      }
      
      return fail(400, {
        error: error.message || 'Failed to update password. Please try again.',
      });
    }

    // Sign out after password change for security
    await supabase.auth.signOut();

    // Redirect to login with success message
    throw redirect(302, '/login?passwordReset=success');
  },
};