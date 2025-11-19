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
  sendMagicLink: async (event) => {
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

    // Send magic link - redirect to auth callback which will handle the login
    const callbackUrl = `${event.url.origin}/auth/callback`;
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: callbackUrl,
      }
    });

    if (error) {
      console.error('Magic link error:', error);
      // Don't reveal if email exists or not for security
      return {
        success: true,
        message: 'If an account with that email exists, a magic link has been sent. Click the link to sign in.',
      };
    }

    return {
      success: true,
      message: 'If an account with that email exists, a magic link has been sent. Click the link to sign in.',
    };
  },
};

