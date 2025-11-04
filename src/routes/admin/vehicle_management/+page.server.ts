import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.server';

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
      roles: [],
      vehicles: [],
      driverOptions: [],
      error: 'No org found'
    };
  }

  // Get all vehicles in org (bypasses RLS)
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('*')
    .eq('org_id', profile.org_id)
    .order('vehicle_id', { ascending: true });

  // Get all drivers in org for dropdown
  const { data: drivers } = await supabase
    .from('staff_profiles')
    .select('user_id, first_name, last_name')
    .eq('org_id', profile.org_id)
    .contains('role', ['Driver']);

  console.log('Server-side vehicles for org', profile.org_id, ':', vehicles);

  return {
    session,
    profile,
    roles: Array.isArray(profile.role) ? profile.role : [],
    vehicles: vehicles || [],
    driverOptions: drivers || []
  };
};