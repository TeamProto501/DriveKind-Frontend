// +page.server.ts
import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const load: PageServerLoad = async (event) => {
  const supabase = createSupabaseServerClient(event);
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    throw redirect(302, '/login');
  }

  // Get user's org
  const { data: profile } = await supabase
    .from('staff_profiles')
    .select('org_id')
    .eq('user_id', user.id)
    .single();

  // Get user's vehicles
  const { data: vehicles, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('user_id', user.id)
    .order('vehicle_id', { ascending: true });

  // NEW: get vehicle_types for this org
  let vehicleTypes: string[] = ['SUV', 'Sedan', 'Van', 'Truck', 'Coupe'];
  if (profile?.org_id) {
    const { data: org } = await supabase
      .from('organization')
      .select('vehicle_types')
      .eq('org_id', profile.org_id)
      .single();

    if (org?.vehicle_types && Array.isArray(org.vehicle_types)) {
      vehicleTypes = org.vehicle_types;
    }
  }

  console.log('Server-side vehicles for', user.id, ':', vehicles);

  return {
    session: { user },
    vehicles: vehicles || [],
    userOrgId: profile?.org_id || null,
    vehicleTypes,                     // <── send to page
    error: error?.message || null
  };
};