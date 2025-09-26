import { redirect, fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { createSupabaseServerClient } from "$lib/supabase.server";

export const load: PageServerLoad = async (event) => {
  try {
    const supabase = createSupabaseServerClient(event);
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      throw redirect(302, '/admin/dash');
    }

    return {};
  } catch (err) {
    console.error('Load error:', err);
    return {};
  }
};

// default action called automatically by <form method="POST">
export const actions: Actions = {
  default: async (event) => {
    try {
      const supabase = createSupabaseServerClient(event);
      const formData = await event.request.formData();

      const email = formData.get('email')?.toString() || '';
      const password = formData.get('password')?.toString() || '';

      if (!email || !password) {
        return fail(400, { error: 'Please fill in all fields', email });
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        console.error('Supabase signIn error:', error);
        return fail(400, { error: error.message, email });
      }

      if (!data.session || !data.user) {
        console.error('No session or user returned:', data);
        return fail(400, { error: 'No session returned from Supabase', email });
      }

      // Debug: log the session/user info
      console.log('Login success:', { userId: data.user.id, session: data.session });

      return {
        success: true,
        token: data.session.access_token,
        userId: data.user.id
      };

    } catch (err: any) {
      console.error('Unexpected login error:', err);
      return fail(500, { error: err?.message || 'Internal Server Error' });
    }
  },

  logout: async (event) => {
    try {
      const supabase = createSupabaseServerClient(event);
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Logout error:', error);
        return fail(500, { error: 'Error logging out' });
      }

      throw redirect(302, '/login');

    } catch (err: any) {
      console.error('Unexpected logout error:', err);
      return fail(500, { error: err?.message || 'Internal Server Error' });
    }
  }
};




