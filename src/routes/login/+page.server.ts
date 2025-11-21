import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';

// Helper function to get role-based home page
function getRoleBasedHomePage(roles: string[]): string {
  if (!roles || roles.length === 0) return '/';
  
  // Priority order for role-based landing pages
  // Super Admin and Admin go to admin dashboard
  if (roles.includes('Super Admin') || roles.includes('Admin')) {
    return '/admin/dash';
  }
  
  // Dispatcher goes to dispatcher dashboard
  if (roles.includes('Dispatcher')) {
    return '/dispatcher/dashboard';
  }
  
  // Driver goes to driver rides
  if (roles.includes('Driver')) {
    return '/driver/rides';
  }
  
  // Volunteer goes to calendar
  if (roles.includes('Volunteer')) {
    return '/calendar';
  }
  
  // NEW ROLES - All administrative/reporting roles go to reports or admin dash
  if (roles.includes('Report Manager')) {
    return '/admin/reports';
  }
  
  if (roles.includes('Report View Only')) {
    return '/admin/reports';
  }
  
  if (roles.includes('List Manager')) {
    return '/admin/dash'; // Can access dashboard
  }
  
  if (roles.includes('New Client Enroller')) {
    return '/admin/users?tab=clients'; // Direct to clients tab
  }
  
  if (roles.includes('Coordinator')) {
    return '/calendar'; // Similar to volunteer
  }
  
  // Add-on roles (these should be combined with other roles, but provide fallback)
  if (roles.includes('WSPS Dispatcher Add-on')) {
    return '/dispatcher/destinations'; // Can view destinations
  }
  
  if (roles.includes('BPSR Dispatcher Add-on')) {
    return '/dispatcher/destinations'; // Can edit destinations
  }

  if (roles.includes('Bri Pen Driver Add-on')) {
    return '/admin/users?tab=clients'; // View clients only
  }
  
  // Fallback to root if no recognized role
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

    const roles = Array.isArray(profile?.role) ? profile.role : (profile?.role ? [profile.role] : []);
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

    const roles = Array.isArray(profile?.role) ? profile.role : (profile?.role ? [profile.role] : []);
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
