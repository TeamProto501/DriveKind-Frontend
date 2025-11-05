import { json, type RequestHandler } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const POST: RequestHandler = async (event) => {
  try {
    const supabase = createSupabaseServerClient(event);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has Super Admin role
    const { data: profile } = await supabase
      .from('staff_profiles')
      .select('role')
      .eq('user_id', session.user.id)
      .single();

    if (!profile) {
      return json({ error: 'User profile not found' }, { status: 404 });
    }

    const hasPermission = Array.isArray(profile.role)
      ? (profile.role.includes('Super Admin'))
      : (profile.role === 'Super Admin');

    if (!hasPermission) {
      return json({ error: 'Access denied. Super Admin role required.' }, { status: 403 });
    }

    const orgId = event.params.orgId;
    if (!orgId) {
      return json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Delete organization using server-side client (bypasses RLS)
    const { error: deleteError } = await supabase
      .from('organization')
      .delete()
      .eq('org_id', parseInt(orgId));

    if (deleteError) {
      console.error('Error deleting organization:', deleteError);
      return json({ error: `Failed to delete organization: ${deleteError.message}` }, { status: 500 });
    }

    return json({ success: true });
  } catch (error: any) {
    console.error('Error in organization deletion:', error);
    return json({ error: `Internal server error: ${error.message}` }, { status: 500 });
  }
};

