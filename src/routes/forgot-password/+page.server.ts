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

    // Use www subdomain consistently - normalize the origin to include www
    // This ensures the redirect URL matches what Supabase expects
    let baseUrl = event.url.origin;
    
    // If origin doesn't have www but we're on production, add it
    if (baseUrl.includes('drivekind.info') && !baseUrl.includes('www.')) {
      baseUrl = baseUrl.replace('https://drivekind.info', 'https://www.drivekind.info');
    }
    
    // Redirect through auth callback which will handle token exchange and redirect to reset-password
    // Using auth callback ensures proper handling of both PKCE and hash fragment flows
    const callbackUrl = `${baseUrl}/auth/callback`;
    console.log('Sending password reset email with redirect URL:', callbackUrl);
    console.log('Event URL origin:', event.url.origin);
    console.log('Normalized base URL:', baseUrl);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: callbackUrl,
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

