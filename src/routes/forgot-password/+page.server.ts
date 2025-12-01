// src/routes/forgot-password/+page.server.ts
import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';

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

    const redirectTo = `https://drivekind.info/reset-password`;
    
    console.log('Sending password reset email to:', email);
    console.log('Redirect URL:', redirectTo);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo,
    });

    if (error) {
      console.error('Password reset error:', error);
      
      if (error.message?.includes('rate limit')) {
        return fail(429, { 
          error: 'Too many requests. Please wait a few minutes before trying again.',
          email 
        });
      }
    }

    // Always show success message (don't reveal if email exists)
    return { 
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link shortly. Please check your inbox and spam folder.'
    };
  },
};