// src/routes/schedule/+page.server.ts
import { createSupabaseServerClient } from '$lib/supabase.server';
import { error, redirect } from '@sveltejs/kit';

export const load = async (event) => {
  const supabase = createSupabaseServerClient(event);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw redirect(302, '/login');
  }

  const { data: userProfile } = await supabase
    .from('staff_profiles')
    .select('org_id')
    .eq('user_id', session.user.id)
    .single();

  if (!userProfile) {
    throw error(403, 'User profile not found');
  }

  // Fetch driver unavailability
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

  // Fetch scheduled rides
  const { data: ridesData, error: ridesError } = await supabase
    .from('rides')
    .select(`
      ride_id,
      appointment_time,
      pickup_time,
      destination_name,
      dropoff_address,
      dropoff_city,
      status,
      round_trip,
      purpose,
      clients (
        first_name,
        last_name,
        primary_phone
      ),
      driver:staff_profiles!rides_driver_user_id_fkey (
        first_name,
        last_name
      )
    `)
    .eq('org_id', userProfile.org_id)
    .in('status', ['Requested', 'Scheduled', 'Assigned', 'In Progress'])
    .order('appointment_time', { ascending: true });

  if (ridesError) {
    console.error('Error fetching rides:', ridesError);
  }

  console.log('Server: Fetched unavailability records:', unavailabilityData?.length || 0);
  console.log('Server: Fetched rides:', ridesData?.length || 0);

  return {
    unavailability: unavailabilityData || [],
    rides: ridesData || [],
    userOrgId: userProfile.org_id,
    session
  };
};