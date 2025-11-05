import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const load: PageServerLoad = async (event) => {
  const supabase = createSupabaseServerClient(event);
  const code = event.url.searchParams.get('code');
  const token = event.url.searchParams.get('token');
  const email = event.url.searchParams.get('email') ?? undefined;

  const recoveryCode = token ?? code;

  if (recoveryCode) {
    const { error } = await supabase.auth.exchangeCodeForSession(recoveryCode);

    if (error) {
      return {
        status: 'error',
        message: error.message || 'This reset link is invalid or has expired.',
        email
      };
    }

    throw redirect(303, '/reset-password/update');
  }

  const {
    data: { session }
  } = await supabase.auth.getSession();

  return {
    status: session ? 'ready' : 'needs_code',
    email
  };
};

export const actions: Actions = {
  update: async (event) => {
    const supabase = createSupabaseServerClient(event);
    const formData = await event.request.formData();

    const password = formData.get('password')?.toString() ?? '';
    const confirmPassword = formData.get('confirmPassword')?.toString() ?? '';

    if (!password || password.length < 8) {
      return fail(400, {
        error: 'Password must be at least 8 characters long.'
      });
    }

    if (password !== confirmPassword) {
      return fail(400, { error: 'Passwords do not match.' });
    }

    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (!session) {
      return fail(400, {
        error: 'Reset link missing or expired. Please request a new one.'
      });
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      console.error('Supabase password update error', error);
      return fail(400, { error: error.message || 'Unable to update password.' });
    }

    return {
      success: true
    };
  }
};
