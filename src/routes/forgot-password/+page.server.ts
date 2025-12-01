// src/routes/forgot-password/+page.server.ts
import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';
import { PUBLIC_APP_URL } from '$env/static/public';

export const actions: Actions = {
  default: async (event) => {
    const supabase = createSupabaseServerClient(event);
    const formData = await event.request.formData();
    
    const email = formData.get('email')?.toString()?.trim().toLowerCase();

    if (!email) {
      return fail(400, { 
        error: 'Please enter your email address',
        email: '' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return fail(400, { 
        error: 'Please enter a valid email address',
        email 
      });
    }

    // Get the base URL for redirect
    // Use PUBLIC_APP_URL if set, otherwise construct from request
    const baseUrl = PUBLIC_APP_URL || `${event.url.protocol}//${event.url.host}`;
    const redirectTo = `${baseUrl}/reset-password`;
    
    console.log('Sending password reset email to:', email);
    console.log('Redirect URL:', redirectTo);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo,
    });

    if (error) {
      console.error('Password reset error:', error);
      
      // Don't reveal if email exists or not for security
      // But log the actual error for debugging
      if (error.message?.includes('rate limit')) {
        return fail(429, { 
          error: 'Too many requests. Please wait a few minutes before trying again.',
          email 
        });
      }
      
      // Generic success message even on error (security best practice)
      // This prevents email enumeration attacks
    }

    // Always show success message (don't reveal if email exists)
    return { 
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link shortly. Please check your inbox and spam folder.'
    };
  },
};