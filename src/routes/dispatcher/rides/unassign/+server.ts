import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.server';
import { canManageRides } from '$lib/utils/permissions';

export const POST: RequestHandler = async (event) => {
  const supabase = createSupabaseServerClient(event);

  let body: any;
  try {
    body = await event.request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400
    });
  }

  const rideId = body?.rideId;
  if (!rideId) {
    return new Response(JSON.stringify({ error: 'Missing rideId' }), {
      status: 400
    });
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401
    });
  }

  const { data: profile, error: profileError } = await supabase
    .from('staff_profiles')
    .select('org_id, role')
    .eq('user_id', user.id)
    .single();

  if (profileError || !profile) {
    return new Response(JSON.stringify({ error: 'Profile not found' }), {
      status: 403
    });
  }

  const roles = Array.isArray(profile.role)
    ? profile.role
    : profile.role
      ? [profile.role]
      : [];

  if (!canManageRides(roles)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403
    });
  }

  const { data: ride, error: rideError } = await supabase
    .from('rides')
    .select('ride_id, org_id, status, driver_user_id')
    .eq('ride_id', rideId)
    .single();

  if (rideError || !ride) {
    return new Response(JSON.stringify({ error: 'Ride not found' }), {
      status: 404
    });
  }

  if (ride.org_id !== profile.org_id) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403
    });
  }

  const { error: updateError } = await supabase
    .from('rides')
    .update({
      status: 'Requested',
      driver_user_id: null,
      assigned_vehicle: null
    })
    .eq('ride_id', rideId);

  if (updateError) {
    console.error('Unassign driver error:', updateError);
    return new Response(
      JSON.stringify({ error: updateError.message || 'Update failed' }),
      { status: 500 }
    );
  }

  return json({ success: true });
};