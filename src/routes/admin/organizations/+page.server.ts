import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const load: PageServerLoad = async (event) => {
  const supabase = createSupabaseServerClient(event);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw redirect(302, '/login');
  }

  // Verify user has Super Admin role
  const { data: profile } = await supabase
    .from('staff_profiles')
    .select('role')
    .eq('user_id', session.user.id)
    .single();

  if (!profile) {
    return {
      session,
      organizations: [],
      error: 'User profile not found'
    };
  }

  const hasPermission = Array.isArray(profile.role)
    ? (profile.role.includes('Super Admin'))
    : (profile.role === 'Super Admin');

  if (!hasPermission) {
    return {
      session,
      organizations: [],
      error: 'Access denied. Super Admin role required.'
    };
  }

  // Get all organizations (server-side bypasses RLS)
  const { data: organizations, error } = await supabase
    .from('organization')
    .select('*')
    .order('org_id', { ascending: true });

  return {
    session,
    organizations: organizations || [],
    error: error?.message || null
  };
};

