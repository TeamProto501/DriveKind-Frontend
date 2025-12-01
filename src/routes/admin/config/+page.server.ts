// src/routes/admin/config/+page.server.ts
import { redirect, fail } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.server';
import type { Actions } from './$types';

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

export const actions: Actions = {
  updateOrganization: async (event) => {
    const supabase = createSupabaseServerClient(event);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return fail(401, { error: 'Not authenticated' });
    }

    // Verify user has Admin or Super Admin role
    const { data: userProfile, error: profileError } = await supabase
      .from('staff_profiles')
      .select('org_id, role')
      .eq('user_id', session.user.id)
      .single();

    if (profileError || !userProfile?.org_id) {
      return fail(403, { error: 'Could not verify user permissions' });
    }

    // Check if user has Admin or Super Admin role
    // role is an array of role_enum, so we need to check if it contains the enum values
    const roles = Array.isArray(userProfile.role) ? userProfile.role : [];
    const hasAdmin = roles.includes('Admin' as any) || roles.includes('Super Admin' as any);

    if (!hasAdmin) {
      return fail(403, { error: 'Insufficient permissions. Admin or Super Admin role required.' });
    }

    const formData = await event.request.formData();
    const orgId = formData.get('org_id');
    const payloadJson = formData.get('payload');

    if (!orgId || !payloadJson) {
      return fail(400, { error: 'Missing required fields' });
    }

    const orgIdNum = Number(orgId);
    if (isNaN(orgIdNum)) {
      return fail(400, { error: 'Invalid org_id' });
    }

    // Verify user can update this org (same org_id or Super Admin)
    const isSuperAdmin = roles.includes('Super Admin' as any);
    if (!isSuperAdmin && userProfile.org_id !== orgIdNum) {
      return fail(403, { error: 'Cannot update organization from different org' });
    }

    let payload;
    try {
      payload = JSON.parse(payloadJson as string);
    } catch (e) {
      return fail(400, { error: 'Invalid payload format' });
    }

    // Remove fields that shouldn't be updated
    delete payload.org_creation_date;
    delete payload.first_ride_date;
    delete payload.last_activity_in_portal;

    const { data, error } = await supabase
      .from('organization')
      .update(payload)
      .eq('org_id', orgIdNum)
      .select('*')
      .single();

    if (error) {
      console.error('Update error:', error);
      return fail(500, { error: error.message || 'Failed to update organization' });
    }

    if (!data) {
      return fail(500, { error: 'No rows were updated — check orgId / RLS' });
    }

    return {
      success: true,
      organization: data
    };
  }
};