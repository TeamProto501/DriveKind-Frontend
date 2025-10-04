// src/routes/calendar/+page.server.ts
import { createSupabaseServerClient } from '$lib/supabase.server';
import { error, redirect } from '@sveltejs/kit';

export const load = async (event) => {
  const supabase = createSupabaseServerClient(event);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw redirect(302, '/login');
  }

  // Get user's org_id
  const { data: userProfile } = await supabase
    .from('staff_profiles')
    .select('org_id')
    .eq('user_id', session.user.id)
    .single();

  if (!userProfile) {
    throw error(403, 'User profile not found');
  }

  // Fetch all driver unavailability for the org
  // Join with staff_profiles to get driver names
  const { data: unavailabilityData, error: fetchError } = await supabase
    .from('driver_unavailability')
    .select(`
      *,
      staff_profiles!fk_staff_profile (
        first_name,
        last_name,
        org_id
      )
    `)
    .eq('staff_profiles.org_id', userProfile.org_id)
    .order('unavailable_date', { ascending: true });

  if (fetchError) {
    console.error('Error fetching unavailability:', fetchError);
  }

  return {
    unavailability: unavailabilityData || [],
    userOrgId: userProfile.org_id,
    session
  };
};