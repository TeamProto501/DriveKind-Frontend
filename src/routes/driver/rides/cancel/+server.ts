import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const POST: RequestHandler = async (event) => {
  const supabase = createSupabaseServerClient(event);

  // Auth
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse body
  let body: any;
  try {
    body = await event.request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const rideId = body?.rideId;
  if (!rideId) {
    return json({ error: 'rideId is required' }, { status: 400 });
  }

  // Load ride to verify ownership + status
  const { data: ride, error: rideError } = await supabase
    .from('rides')
    .select('ride_id, status, driver_user_id, org_id')
    .eq('ride_id', rideId)
    .single();

  if (rideError || !ride) {
    console.error('Cancel: ride lookup failed', rideError);
    return json({ error: 'Ride not found' }, { status: 404 });
  }

  // Only the assigned driver can cancel
  if (ride.driver_user_id !== user.id) {
    return json({ error: 'You are not assigned to this ride' }, { status: 403 });
  }

  // Only allow cancel from Scheduled / Assigned (you can tweak this if you want)
  if (ride.status !== 'Scheduled' && ride.status !== 'Assigned') {
    return json(
      { error: `Cannot cancel ride with status ${ride.status}` },
      { status: 400 }
    );
  }

  // Update: unassign driver and return to Requested
  const { error: updateError } = await supabase
    .from('rides')
    .update({
      status: 'Requested',
      driver_user_id: null,
      assigned_vehicle: null
    })
    .eq('ride_id', rideId);

  if (updateError) {
    console.error('Cancel: update error', updateError);
    return json(
      { error: `Failed to cancel ride: ${updateError.message}` },
      { status: 500 }
    );
  }

  // Optional: mark this driver's request as denied so they don't see it again as a pending request
  const { error: reqError } = await supabase
    .from('ride_requests')
    .update({ denied: true })
    .eq('ride_id', rideId)
    .eq('driver_id', user.id);

  if (reqError) {
    // Non-fatal; log but still return success
    console.warn('Cancel: failed to update ride_requests', reqError);
  }

  return json({ success: true });
};