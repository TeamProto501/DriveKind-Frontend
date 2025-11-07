// src/routes/dispatcher/rides/create/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';

function canonEstimatedLen(raw: unknown): string | null {
  const s = (raw ?? '').toString().trim().toLowerCase();
  if (!s) return null;

  // H:MM
  let m = s.match(/^(\d+)\s*:\s*(\d{1,2})$/);
  if (m) {
    const h = parseInt(m[1], 10), mi = parseInt(m[2], 10);
    if (!Number.isFinite(h) || !Number.isFinite(mi) || mi < 0 || mi >= 60) return null;
    const parts = [];
    if (h) parts.push(`${h} ${h === 1 ? 'hr' : 'hrs'}`);
    if (mi) parts.push(`${mi} ${mi === 1 ? 'min' : 'mins'}`);
    return parts.join(' ') || '0 mins';
  }

  // Xh [Ym]
  m = s.match(/^(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)\s*(\d+)?\s*(m|min|mins|minute|minutes)?$/);
  if (m) {
    const hoursNum = parseFloat(m[1]);
    if (!Number.isFinite(hoursNum)) return null;
    let total = Math.round(hoursNum * 60);
    if (m[3]) total += parseInt(m[3], 10);
    const H = Math.floor(total / 60), M = total % 60;
    const parts = [];
    if (H) parts.push(`${H} ${H === 1 ? 'hr' : 'hrs'}`);
    if (M) parts.push(`${M} ${M === 1 ? 'min' : 'mins'}`);
    return parts.join(' ') || '0 mins';
  }

  // Xm
  m = s.match(/^(\d+)\s*(m|min|mins|minute|minutes)$/);
  if (m) {
    const mins = parseInt(m[1], 10);
    if (!Number.isFinite(mins)) return null;
    const H = Math.floor(mins / 60), M = mins % 60;
    const parts = [];
    if (H) parts.push(`${H} ${H === 1 ? 'hr' : 'hrs'}`);
    if (M) parts.push(`${M} ${M === 1 ? 'min' : 'mins'}`);
    return parts.join(' ') || '0 mins';
  }

  // bare number = minutes
  m = s.match(/^(\d+)$/);
  if (m) {
    const mins = parseInt(m[1], 10);
    if (!Number.isFinite(mins)) return null;
    const H = Math.floor(mins / 60), M = mins % 60;
    const parts = [];
    if (H) parts.push(`${H} ${H === 1 ? 'hr' : 'hrs'}`);
    if (M) parts.push(`${M} ${M === 1 ? 'min' : 'mins'}`);
    return parts.join(' ') || '0 mins';
  }

  return null;
}

export const POST: RequestHandler = async (event) => {
  try {
    const body = await event.request.json();
    const supabase = createSupabaseServerClient(event);

    // Auth
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: 'Unauthorized' }, { status: 401 });

    // Role check
    const { data: profile, error: profileError } = await supabase
      .from('staff_profiles')
      .select('user_id, org_id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) return json({ error: 'Profile not found' }, { status: 404 });

    const hasDispatcherRole =
      profile.role &&
      (Array.isArray(profile.role)
        ? (profile.role.includes('Dispatcher') || profile.role.includes('Admin'))
        : (profile.role === 'Dispatcher' || profile.role === 'Admin'));

    if (!hasDispatcherRole) return json({ error: 'Access denied. Dispatcher or Admin role required.' }, { status: 403 });

    // (optional) reject bad len explicitly
    if (body.estimated_appointment_length && !canonEstimatedLen(body.estimated_appointment_length)) {
      return json({ error: "Invalid estimated appointment length. Use '30 mins' or '2 hrs 30 mins'." }, { status: 400 });
    }

    // Build payload (NO vehicle_id, NO driver_user_id)
    const payload = {
      org_id: profile.org_id,
      client_id: body.client_id ?? null,
      dispatcher_user_id: user.id,
      alt_pickup_address: body.alt_pickup_address ?? null,
      alt_pickup_address2: body.alt_pickup_address2 ?? null,
      alt_pickup_city: body.alt_pickup_city ?? null,
      alt_pickup_state: body.alt_pickup_state ?? null,
      alt_pickup_zipcode: body.alt_pickup_zipcode ?? null,
      dropoff_address: body.dropoff_address ?? null,
      dropoff_address2: body.dropoff_address2 ?? null,
      dropoff_city: body.dropoff_city ?? null,
      dropoff_state: body.dropoff_state ?? null,
      dropoff_zipcode: body.dropoff_zipcode ?? null,
      appointment_time: body.appointment_time ?? null,
      pickup_time: body.pickup_time ?? null,
      status: body.status ?? 'Requested',
      notes: body.notes ?? null,
      miles_driven: body.miles_driven ?? null,
      hours: body.hours ?? null,
      donation: body.donation ?? false,
      donation_amount: body.donation_amount ?? null,
      riders: body.riders ?? 1,
      round_trip: body.round_trip ?? false,
      purpose: body.purpose ?? null,
      estimated_appointment_length: canonEstimatedLen(body.estimated_appointment_length) ?? null,
      destination_name: body.destination_name ?? null,
      pickup_from_home: body.pickup_from_home ?? true,
      call_id: body.call_id ?? null,
      completion_status: body.completion_status ?? null
    };

    // Enforce pickup vs appointment window if pickup_time provided
    if (payload.pickup_time) {
      if (!payload.appointment_time) {
        return json({ error: 'Appointment time is required when pickup time is set.' }, { status: 400 });
      }
      const appt = new Date(payload.appointment_time as string);
      const pick = new Date(payload.pickup_time as string);
      if (Number.isNaN(appt.getTime()) || Number.isNaN(pick.getTime())) {
        return json({ error: 'Invalid appointment or pickup time.' }, { status: 400 });
      }
      const diffMs = appt.getTime() - pick.getTime();
      if (diffMs <= 0) {
        return json({ error: 'Pickup time must be before the appointment time.' }, { status: 400 });
      }
      const diffMin = diffMs / 60000;
      if (diffMin > 120) {
        return json({ error: 'Pickup time cannot be more than 2 hours before the appointment.' }, { status: 400 });
      }
    }

    // Basic required fields
    if (!payload.client_id || !payload.dropoff_address || !payload.destination_name || !payload.appointment_time) {
      return json({ error: 'Missing required fields (client_id, dropoff_address, destination_name, appointment_time).' }, { status: 400 });
    }

    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .insert(payload)
      .select()
      .single();

    if (rideError) {
      console.error('Error creating ride:', rideError);
      return json({ error: `Failed to create ride: ${rideError.message}` }, { status: 500 });
    }

    return json({ success: true, ride });
  } catch (error: any) {
    console.error('Error in ride creation:', error);
    return json({ error: `Internal server error: ${error.message}` }, { status: 500 });
  }
};