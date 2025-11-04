// src/routes/admin/config/+page.server.ts
import { redirect } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.server';

export async function load(event) {
  const supabase = createSupabaseServerClient(event);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw redirect(302, '/login');
  }

  const { data: userProfile } = await supabase
    .from('staff_profiles')
    .select('org_id, role')
    .eq('user_id', session.user.id)
    .single();

  if (!userProfile?.org_id) {
    return { 
      session, 
      profile: userProfile,
      roles: [],
      organization: null,
      error: 'No org found' 
    };
  }

  const { data: organization } = await supabase
    .from('organization')
    .select('*')
    .eq('org_id', userProfile.org_id)
    .single();

  return {
    session,
    profile: userProfile,
    roles: Array.isArray(userProfile.role) ? userProfile.role : [],
    organization
  };
}