// src/routes/reset-password/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const load: PageServerLoad = async () => {
  // Let the client handle all token verification
  // Server just returns minimal data
  return {};
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