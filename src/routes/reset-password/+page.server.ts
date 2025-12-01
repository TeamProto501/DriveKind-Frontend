// src/routes/reset-password/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const load: PageServerLoad = async (event) => {
  const supabase = createSupabaseServerClient(event);
  
  // Check for existing session FIRST
  const { data: { session: existingSession } } = await supabase.auth.getSession();
  
  if (existingSession) {
    console.log('Found existing session for user:', existingSession.user?.email);
    return {
      hasValidToken: true,
    };
  }
  
  // Check URL parameters
  const code = event.url.searchParams.get('code');
  const urlError = event.url.searchParams.get('error');
  const errorDescription = event.url.searchParams.get('error_description');
  
  console.log('Reset password page load:', { hasCode: !!code, error: urlError });
  
  // Handle error from Supabase redirect
  if (urlError) {
    console.error('URL error from Supabase:', urlError, errorDescription);
    return {
      hasValidToken: false,
      error: errorDescription || 'Invalid or expired reset token.',
    };
  }
  
  // If there's a code, attempt exchange
  if (code) {
    console.log('Attempting server-side code exchange...');
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('Server-side code exchange error:', error.message);
        
        // Check session again - Supabase might have set it via the redirect
        const { data: { session: retrySession } } = await supabase.auth.getSession();
        if (retrySession) {
          console.log('Found session after PKCE error - proceeding');
          return { hasValidToken: true };
        }
        
        if (error.message?.includes('verifier') || error.message?.includes('code_verifier')) {
          return { hasValidToken: false, error: null, isPKCEError: true };
        }
        
        return { hasValidToken: false, error: 'This reset link has expired or already been used.' };
      }
      
      if (data?.session) {
        console.log('Server-side code exchange successful');
        return { hasValidToken: true };
      }
    } catch (e) {
      console.error('Exception during code exchange:', e);
    }
  }
  
  // No code, no session
  return { hasValidToken: false, error: null };
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