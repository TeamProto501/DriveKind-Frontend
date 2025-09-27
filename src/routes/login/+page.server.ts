import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';

// Add the missing load function
export const load: PageServerLoad = async (event) => {
  const supabase = createSupabaseServerClient(event);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Redirect if already logged in
  if (session) {
    throw redirect(302, "/admin/dash"); // or wherever you want to redirect
  }

  return {};
};

export const actions: Actions = {
  default: async (event) => {
    const supabase = createSupabaseServerClient(event);
    const formData = await event.request.formData();

    const email = formData.get('email')?.toString() || '';
    const password = formData.get('password')?.toString() || '';

    if (!email || !password) {
      return fail(400, { error: 'Please fill in all fields' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      console.error('Supabase login error:', error);
      return fail(400, { error: error.message });
    }

    if (!data.session) {
      return fail(400, { error: 'No session returned from Supabase' });
    }

    // ✅ Supabase sets cookies automatically here
    throw redirect(302, '/admin/dash');
  }
};






