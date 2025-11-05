import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const actions: Actions = {
  request: async (event) => {
    const supabase = createSupabaseServerClient(event);
    const formData = await event.request.formData();

    const email = formData.get('email')?.toString().trim();

    if (!email) {
      return fail(400, { error: 'Please provide the email associated with your account.' });
    }

    const redirectTo = `${event.url.origin}/reset-password/update`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo
    });

    if (error) {
      console.error('Supabase password reset error:', error);
      return fail(400, { error: error.message || 'Unable to send reset email. Please try again.' });
    }

    return {
      success: true
    };
  }
};
