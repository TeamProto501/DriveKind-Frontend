import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const load: PageServerLoad = async (event) => {
  const supabase = createSupabaseServerClient(event);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw redirect(302, '/login');
  }

  // Get user's org
  const { data: profile } = await supabase
    .from('staff_profiles')
    .select('org_id')
    .eq('user_id', session.user.id)
    .single();

  // Get user's vehicles (bypasses RLS with service role)
  const { data: vehicles, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('user_id', session.user.id)
    .order('vehicle_id', { ascending: true });

  console.log('Server-side vehicles for', session.user.id, ':', vehicles);

  return {
    session,
    vehicles: vehicles || [],
    userOrgId: profile?.org_id || null,
    error: error?.message || null
  };
};