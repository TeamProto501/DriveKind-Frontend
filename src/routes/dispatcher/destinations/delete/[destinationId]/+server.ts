import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const POST: RequestHandler = async (event) => {
  const supabase = createSupabaseServerClient(event);
  
  // Verify session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get destination_id from URL params
  const destinationId = event.params.destinationId;
  if (!destinationId) {
    return json({ error: 'Destination ID is required' }, { status: 400 });
  }

  // Get user's profile to verify org and permissions
  const { data: profile, error: profileError } = await supabase
    .from('staff_profiles')
    .select('org_id, role')
    .eq('user_id', session.user.id)
    .single();

  if (profileError || !profile) {
    return json({ error: 'Profile not found' }, { status: 404 });
  }

  // Check if user has permission (Admin or Super Admin)
  const roles = Array.isArray(profile.role) ? profile.role : (profile.role ? [profile.role] : []);
  const hasPermission = roles.some(r => ['Admin', 'Super Admin'].includes(r));
  
  if (!hasPermission) {
    return json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  // Verify destination belongs to user's org
  const { data: existingDest, error: fetchError } = await supabase
    .from('destinations')
    .select('org_id')
    .eq('destination_id', destinationId)
    .single();

  if (fetchError || !existingDest) {
    return json({ error: 'Destination not found' }, { status: 404 });
  }

  if (existingDest.org_id !== profile.org_id) {
    return json({ error: 'Unauthorized to delete this destination' }, { status: 403 });
  }

  // Delete destination
  const { error: deleteError } = await supabase
    .from('destinations')
    .delete()
    .eq('destination_id', destinationId);

  if (deleteError) {
    console.error('Delete error:', deleteError);
    return json({ error: deleteError.message }, { status: 500 });
  }

  return json({ success: true }, { status: 200 });
};

