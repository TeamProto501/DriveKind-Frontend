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

    const body = await event.request.json();

    // Insert organization using server-side client (bypasses RLS)
    const { data: organization, error: insertError } = await supabase
      .from('organization')
      .insert(body)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating organization:', insertError);
      return json({ error: `Failed to create organization: ${insertError.message}` }, { status: 500 });
    }

    return json({ success: true, organization });
  } catch (error: any) {
    console.error('Error in organization creation:', error);
    return json({ error: `Internal server error: ${error.message}` }, { status: 500 });
  }
};

