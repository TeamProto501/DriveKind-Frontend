import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const load: PageServerLoad = async (event) => {
  const supabase = createSupabaseServerClient(event);
  const { data: { session } } = await supabase.auth.getSession();

  // Redirect if already logged in
  if (session) {
    throw redirect(302, '/admin/dash');
  }

  return {};
};

// ✅ default action called automatically by <form method="POST">
export const actions: Actions = {
  default: async (event) => {
    const supabase = createSupabaseServerClient(event);
    const formData = await event.request.formData();

    const email = formData.get('email')?.toString() || '';
    const password = formData.get('password')?.toString() || '';

    if (!email || !password) {
      return fail(400, { error: 'Please fill in all fields', email });
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return fail(400, { error: error.message, email });
    }

    if (!data.session || !data.user) {
      return fail(400, { error: 'No session returned from Supabase', email });
    }

    // ✅ Return token + userId for frontend reactive store
    return {
      success: true,
      token: data.session.access_token,
      userId: data.user.id
    };
  },

  logout: async (event) => {
    const supabase = createSupabaseServerClient(event);
    const { error } = await supabase.auth.signOut();
    if (error) return fail(500, { error: 'Error logging out' });
    throw redirect(302, '/login');
  }
};



