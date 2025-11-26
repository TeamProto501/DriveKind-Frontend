import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.server';
import { canCreateDestinations, type Role } from '$lib/utils/permissions';

export const POST: RequestHandler = async (event) => {
  const supabase = createSupabaseServerClient(event);

  const {
    data: { session },
    error: sessionError
  } = await supabase.auth.getSession();
  if (sessionError || !session) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('staff_profiles')
    .select('org_id, role')
    .eq('user_id', session.user.id)
    .single();

  if (profileError || !profile) {
    return json({ error: 'Profile not found' }, { status: 404 });
  }

  const roles: Role[] = Array.isArray(profile.role)
    ? profile.role
    : profile.role
      ? [profile.role]
      : [];

  // Use shared permission helper for CREATE
  if (!canCreateDestinations(roles)) {
    return json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const body = await event.request.json();
  const { location_name, address, address2, city, state, zipcode, org_id } = body;

  if (!address?.trim() || !city?.trim() || !state?.trim()) {
    return json({ error: 'Address, City, and State are required' }, { status: 400 });
  }

  if (org_id !== profile.org_id) {
    return json({ error: 'Organization mismatch' }, { status: 403 });
  }

  const { data: destination, error: insertError } = await supabase
    .from('destinations')
    .insert({
      location_name: location_name?.trim() || null,
      address: address.trim(),
      address2: address2?.trim() || null,
      city: city.trim(),
      state: state.trim(),
      zipcode: zipcode?.trim() || null,
      org_id: profile.org_id
    })
    .select()
    .single();

  if (insertError) {
    console.error('Insert error:', insertError);
    return json({ error: insertError.message }, { status: 500 });
  }

  return json({ success: true, destination }, { status: 201 });
};