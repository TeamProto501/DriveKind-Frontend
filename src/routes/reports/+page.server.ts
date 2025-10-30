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
      organization: null
    };
  }

  // Get organization data
  const { data: organization } = await supabase
    .from('organization')
    .select('*')
    .eq('org_id', userProfile.org_id)
    .single();

  return {
    session,
    userProfile,
    organization
  };
};