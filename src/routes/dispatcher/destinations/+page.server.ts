import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.server';
import { canViewDestinations } from '$lib/utils/permissions';

export const load: PageServerLoad = async (event) => {
  const supabase = createSupabaseServerClient(event);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw redirect(302, '/login');
  }

  // Get user's profile and org
  const { data: profile } = await supabase
    .from('staff_profiles')
    .select('org_id, role')
    .eq('user_id', session.user.id)
    .single();

  if (!profile?.org_id) {
    return {
      session,
      profile,
      roles: Array.isArray(profile?.role) ? profile.role : (profile?.role ? [profile.role] : []),
      destinations: [],
      error: 'No organization found'
    };
  }

  // Check if user can view destinations
  const userRoles = Array.isArray(profile.role) ? profile.role : (profile.role ? [profile.role] : []);
  
  if (!canViewDestinations(userRoles)) {
    throw redirect(302, '/');
  }

  // Get destinations for the user's org
  const { data: destinations, error } = await supabase
    .from('destinations')
    .select(`
      destination_id,
      created_at,
      address,
      address2,
      city,
      state,
      zipcode,
      location_name,
      org_id
    `)
    .eq('org_id', profile.org_id)
    .order('destination_id', { ascending: true });

  console.log('Server-side destinations for org', profile.org_id, ':', destinations);

  return {
    session,
    profile,
    roles: userRoles,
    destinations: destinations || [],
    error: error?.message || null
  };
};

