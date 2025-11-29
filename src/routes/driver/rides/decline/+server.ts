// src/routes/driver/rides/decline/+server.ts
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
    return json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await event.request.json().catch(() => null) as {
    rideId?: number;
  } | null;

  const rideId = body?.rideId;
  if (!rideId) {
    return json({ error: 'rideId is required' }, { status: 400 });
  }

  // Mark this driver’s request as denied
  const { error: updateError } = await supabase
    .from('ride_requests')
    .update({ denied: true })
    .eq('ride_id', rideId)
    .eq('driver_id', user.id);

  if (updateError) {
    console.error('Error declining ride request:', updateError);
    return json(
      { error: updateError.message ?? 'Failed to decline ride request' },
      { status: 500 }
    );
  }

  return json({ success: true });
};