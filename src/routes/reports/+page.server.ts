import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const load: PageServerLoad = async (event) => {
  const supabase = createSupabaseServerClient(event);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw redirect(302, '/login');
  }

  // Get user profile
  const { data: userProfile, error } = await supabase
    .from('staff_profiles')
    .select('*')
    .eq('user_id', session.user.id)
    .single();

  if (error) {
    console.error('Error fetching user profile:', error);
  }

  if (!userProfile) {
    console.error('No user profile found for user:', session.user.id);
    return {
      session,
      userProfile: null,
      organization: null,
      completedRides: []
    };
  }

  // Get organization data
  const { data: organization } = await supabase
    .from('organization')
    .select('*')
    .eq('org_id', userProfile.org_id)
    .single();

  // Fetch completed rides for the user (for the last 12 months)
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const { data: completedRides } = await supabase
    .from('rides')
    .select(`
      ride_id,
      appointment_time,
      miles_driven,
      hours,
      destination_name,
      status,
      clients:client_id (
        first_name,
        last_name
      )
    `)
    .eq('driver_user_id', session.user.id)
    .in('status', ['Completed', 'Reported'])
    .gte('appointment_time', twelveMonthsAgo.toISOString())
    .order('appointment_time', { ascending: false });

  return {
    session,
    userProfile,
    organization,
    completedRides: completedRides || []
  };
};