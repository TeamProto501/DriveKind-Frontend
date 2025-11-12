import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';

// Helper function to get role-based home page
function getRoleBasedHomePage(roles: string[]): string {
  if (!roles || roles.length === 0) return '/';
  
  // Priority order: Admin > Dispatcher > Driver > Client
  if (roles.includes('Super Admin') || roles.includes('Admin')) {
    return '/admin/dashboard';
  }
  if (roles.includes('Dispatcher')) {
    return '/dispatcher/rides';
  }
  if (roles.includes('Driver')) {
    return '/driver/rides';
  }
  if (roles.includes('Client')) {
    return '/client/rides';
  }
  
  return '/';
}

export const load: PageServerLoad = async (event) => {
  const supabase = createSupabaseServerClient(event);
  const { data: { session } } = await supabase.auth.getSession();

  // If already logged in, redirect to role-based home
  if (session) {
    const { data: profile } = await supabase
      .from('staff_profiles')
      .select('role')
      .eq('user_id', session.user.id)
      .single();

    const roles = Array.isArray(profile?.role) ? profile.role : [];
    const homePage = getRoleBasedHomePage(roles);
    throw redirect(302, homePage);
  }

  return {};
};

export const actions: Actions = {
  login: async (event) => {
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

    // Fetch user's role to determine redirect
    const { data: profile } = await supabase
      .from('staff_profiles')
      .select('role')
      .eq('user_id', data.session.user.id)
      .single();

    const roles = Array.isArray(profile?.role) ? profile.role : [];
    const homePage = getRoleBasedHomePage(roles);

    // Redirect to role-based home page
    throw redirect(302, homePage);
  },

  logout: async (event) => {
    const supabase = createSupabaseServerClient(event);
    const { error } = await supabase.auth.signOut();

    if (error) {
      return fail(500, {
        error: 'Error logging out'
      });
    }

    throw redirect(302, '/login');
  }
};
