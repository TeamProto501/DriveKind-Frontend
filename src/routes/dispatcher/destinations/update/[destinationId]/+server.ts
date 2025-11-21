import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const POST: RequestHandler = async (event) => {
  const supabase = createSupabaseServerClient(event);
  
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const destinationId = event.params.destinationId;
  if (!destinationId) {
    return json({ error: 'Destination ID is required' }, { status: 400 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('staff_profiles')
    .select('org_id, role')
    .eq('user_id', session.user.id)
    .single();

  if (profileError || !profile) {
    return json({ error: 'Profile not found' }, { status: 404 });
  }

  const roles = Array.isArray(profile.role) ? profile.role : (profile.role ? [profile.role] : []);
  const hasPermission = roles.some(r => ['Admin', 'Super Admin'].includes(r));
  
  if (!hasPermission) {
    return json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { data: existingDest, error: fetchError } = await supabase
    .from('destinations')
    .select('org_id')
    .eq('destination_id', destinationId)
    .single();

  if (fetchError || !existingDest) {
    return json({ error: 'Destination not found' }, { status: 404 });
  }

  if (existingDest.org_id !== profile.org_id) {
    return json({ error: 'Unauthorized to modify this destination' }, { status: 403 });
  }

  const body = await event.request.json();
  const { location_name, address, address2, city, state, zipcode } = body;

  // Location name is optional now

  if (!address?.trim() || !city?.trim() || !state?.trim()) {
    return json({ error: 'Address, City, and State are required' }, { status: 400 });
  }

  const { data: destination, error: updateError } = await supabase
    .from('destinations')
    .update({
      location_name: location_name?.trim() || null,
      address: address.trim(),
      address2: address2?.trim() || null,
      city: city.trim(),
      state: state.trim(),
      zipcode: zipcode?.trim() || null
    })
    .eq('destination_id', destinationId)
    .select()
    .single();

  if (updateError) {
    console.error('Update error:', updateError);
    return json({ error: updateError.message }, { status: 500 });
  }

  return json({ success: true, destination }, { status: 200 });
};