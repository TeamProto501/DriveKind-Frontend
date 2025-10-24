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
    // Return session but with empty profile - let the page handle it
    return {
      session,
      userProfile: null
    };
  }

  return {
    session,
    userProfile
  };
};