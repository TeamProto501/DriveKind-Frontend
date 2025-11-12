import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { createSupabaseServerClient, createSupabaseAdminClient } from '$lib/supabase.server';

export const POST: RequestHandler = async (event) => {
  try {
    const supabase = createSupabaseServerClient(event);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return json({ success: false, error: 'No session found' }, { status: 401 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return json({ success: false, error: 'User not authenticated' }, { status: 401 });
    }

    // Verify current user has Admin or Super Admin role
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('staff_profiles')
      .select('user_id, org_id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !currentUserProfile) {
      console.error('Failed to fetch current user profile:', profileError);
      return json({ success: false, error: 'Failed to verify user permissions' }, { status: 403 });
    }

    const userRole = currentUserProfile.role;
    const isAuthorized = Array.isArray(userRole)
      ? (userRole.includes('Admin') || userRole.includes('Super Admin'))
      : (userRole === 'Admin' || userRole === 'Super Admin');

    if (!isAuthorized) {
      console.error('User does not have permission to update users. Role:', userRole);
      return json({ success: false, error: 'You do not have permission to update users. Admin or Super Admin role required.' }, { status: 403 });
    }

    const userId = event.params.userId;
    if (!userId) {
      return json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    const body = await event.request.json();
    const updateData = body;

    // Ensure the user being updated is in the same organization (unless Super Admin)
    const { data: targetUserProfile } = await supabase
      .from('staff_profiles')
      .select('org_id')
      .eq('user_id', userId)
      .single();

    if (targetUserProfile) {
      const isSuperAdmin = Array.isArray(userRole)
        ? userRole.includes('Super Admin')
        : userRole === 'Super Admin';

      if (!isSuperAdmin && targetUserProfile.org_id !== currentUserProfile.org_id) {
        return json({ success: false, error: 'You can only update users in your organization' }, { status: 403 });
      }
    }

    // Use admin client to bypass RLS for the update
    let adminSupabase;
    try {
      adminSupabase = createSupabaseAdminClient();
    } catch (err) {
      // Fallback to regular client if admin client not available
      adminSupabase = supabase;
    }

    // Update the staff profile
    const { data: updatedProfile, error: updateError } = await adminSupabase
      .from('staff_profiles')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update staff profile:', updateError);
      let errorMessage = 'Failed to update staff profile';
      if (updateError.message) {
        errorMessage = updateError.message;
      }
      return json({ success: false, error: errorMessage }, { status: 400 });
    }

    return json({ success: true, profile: updatedProfile });
  } catch (err: any) {
    console.error('Error updating user:', err);
    return json({ success: false, error: err.message || 'Unknown error occurred' }, { status: 500 });
  }
};

