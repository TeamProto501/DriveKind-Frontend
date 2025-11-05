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

    const body = await event.request.json();

    // Update organization using server-side client (bypasses RLS)
    // Use .select() without .single() first, then handle the result
    const { data: organizations, error: updateError } = await supabase
      .from('organization')
      .update(body)
      .eq('org_id', parseInt(orgId))
      .select();

    if (updateError) {
      console.error('Error updating organization:', updateError);
      return json({ error: `Failed to update organization: ${updateError.message}` }, { status: 500 });
    }

    // Check if update was successful
    if (!organizations || organizations.length === 0) {
      return json({ error: 'Organization not found' }, { status: 404 });
    }

    // Return the first (and should be only) updated organization
    return json({ success: true, organization: organizations[0] });
  } catch (error: any) {
    console.error('Error in organization update:', error);
    return json({ error: `Internal server error: ${error.message}` }, { status: 500 });
  }
};

