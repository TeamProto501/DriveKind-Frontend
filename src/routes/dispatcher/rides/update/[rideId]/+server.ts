// src/routes/dispatcher/rides/update/[rideId]/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';

const ALLOWED_KEYS = new Set([
  'client_id',
  'dispatcher_user_id',
  'alt_pickup_address',
  'alt_pickup_address2',
  'alt_pickup_city',
  'alt_pickup_state',
  'alt_pickup_zipcode',
  'dropoff_address',
  'dropoff_address2',
  'dropoff_city',
  'dropoff_state',
  'dropoff_zipcode',
  'appointment_time',
  'pickup_time',
  'status',
  'notes',
  'miles_driven',
  'hours',
  'donation',
  'donation_amount',
  'riders',
  'round_trip',
  'purpose',
  'estimated_appointment_length',
  'destination_name',
  'pickup_from_home',
  'call_id',
  'completion_status'
]);

function canonEstimatedLen(raw: unknown): string | null {
  const s = (raw ?? '').toString().trim().toLowerCase();
  if (!s) return null;

  // H:MM
  let m = s.match(/^(\d+)\s*:\s*(\d{1,2})$/);
  if (m) {
    const h = parseInt(m[1], 10), mi = parseInt(m[2], 10);
    if (!Number.isFinite(h) || !Number.isFinite(mi) || mi < 0 || mi >= 60) return null;
    const parts: string[] = [];
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
    const parts: string[] = [];
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
    const parts: string[] = [];
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
    const parts: string[] = [];
    if (H) parts.push(`${H} ${H === 1 ? 'hr' : 'hrs'}`);
    if (M) parts.push(`${M} ${M === 1 ? 'min' : 'mins'}`);
    return parts.join(' ') || '0 mins';
  }

  return null;
}

// Coerce/clean known fields (including canonicalizing estimated_appointment_length)
function normalize(update: Record<string, unknown>) {
  const out: Record<string, any> = {};

  for (const [k, v] of Object.entries(update)) {
    if (!ALLOWED_KEYS.has(k)) continue;

    switch (k) {
      // integers
      case 'client_id':
      case 'riders':
      case 'call_id': {
        out[k] = v === '' || v == null ? null : Number(v as number);
        break;
      }

      // floats
      case 'miles_driven':
      case 'hours':
      case 'donation_amount': {
        out[k] = v === '' || v == null ? null : Number(v as number);
        break;
      }

      // booleans
      case 'donation':
      case 'round_trip':
      case 'pickup_from_home': {
        out[k] = Boolean(v);
        break;
      }

      // datetimes (accept local datetime-local value, convert to ISO)
      case 'appointment_time':
      case 'pickup_time': {
        const s = v as string | null | undefined;
        out[k] = s ? new Date(s as string).toISOString() : null;
        break;
      }

      // canonicalize estimated length
      case 'estimated_appointment_length': {
        if (v == null || v === '') {
          out[k] = null;
        } else {
          const c = canonEstimatedLen(v);
          if (!c) {
            // mark invalid — caller will handle and 400 out
            out.__invalid_est_len__ = true;
          } else {
            out[k] = c;
          }
        }
        break;
      }

      // strings
      case 'status':
      case 'completion_status':
      case 'purpose':
      case 'destination_name':
      case 'notes':
      case 'alt_pickup_address':
      case 'alt_pickup_address2':
      case 'alt_pickup_city':
      case 'alt_pickup_state':
      case 'alt_pickup_zipcode':
      case 'dropoff_address':
      case 'dropoff_address2':
      case 'dropoff_city':
      case 'dropoff_state':
      case 'dropoff_zipcode': {
        out[k] = typeof v === 'string' ? v.trim() : v ?? null;
        break;
      }

      case 'dispatcher_user_id': {
        out[k] = typeof v === 'string' ? v : null;
        break;
      }

      default: {
        out[k] = v ?? null;
      }
    }
  }

  return out;
}

export const POST: RequestHandler = async (event) => {
  try {
    const rideId = Number(event.params.rideId);
    if (!Number.isFinite(rideId)) {
      return json({ error: 'Invalid ride id' }, { status: 400 });
    }

    const body = await event.request.json();
    const supabase = createSupabaseServerClient(event);

    // Auth
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Profile / role
    const { data: profile, error: profileError } = await supabase
      .from('staff_profiles')
      .select('user_id, org_id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return json({ error: 'Profile not found' }, { status: 404 });
    }

    const hasDispatcherRole =
      profile.role &&
      (Array.isArray(profile.role)
        ? (profile.role.includes('Dispatcher') || profile.role.includes('Admin'))
        : (profile.role === 'Dispatcher' || profile.role === 'Admin'));

    if (!hasDispatcherRole) {
      return json({ error: 'Access denied. Dispatcher or Admin role required.' }, { status: 403 });
    }

    // Fetch existing ride (org gate)
    const { data: existing, error: rideError } = await supabase
      .from('rides')
      .select('*')
      .eq('ride_id', rideId)
      .eq('org_id', profile.org_id)
      .single();

    if (rideError || !existing) {
      return json({ error: 'Ride not found or access denied' }, { status: 404 });
    }

    // Normalize & whitelist
    const updateIn = normalize(body);

    // Fail fast on invalid estimated length
    if ((updateIn as any).__invalid_est_len__) {
      return json(
        { error: "Invalid estimated appointment length. Use '30 mins' or '2 hrs 30 mins'." },
        { status: 400 }
      );
    }

    // Ensure dispatcher_user_id reflects the current user
    updateIn.dispatcher_user_id = user.id;

    // If nothing valid to update
    const keys = Object.keys(updateIn).filter(k => k !== '__invalid_est_len__');
    if (keys.length === 0) {
      return json({ error: 'No valid fields provided' }, { status: 400 });
    }

    // Validate requireds on resulting values (existing merged with update)
    const resulting = { ...existing, ...updateIn };

    // Enforce pickup vs appointment window
    {
      const apptISO = resulting.appointment_time as string | null | undefined;
      const pickISO = resulting.pickup_time as string | null | undefined;

      if (pickISO) {
        if (!apptISO) {
          return json({ error: 'Appointment time is required when pickup time is set.' }, { status: 400 });
        }
        const appt = new Date(apptISO);
        const pick = new Date(pickISO);
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
    }

    const missing: string[] = [];
    if (!resulting.client_id) missing.push('client_id');
    if (!resulting.dropoff_address) missing.push('dropoff_address');
    if (!resulting.destination_name) missing.push('destination_name');
    if (body.hasOwnProperty('appointment_time') && !resulting.appointment_time) {
      missing.push('appointment_time');
    }
    if (missing.length) {
      return json({ error: 'Missing required fields', details: missing }, { status: 400 });
    }

    // Perform update
    const { data: updated, error: updateError } = await supabase
      .from('rides')
      .update(updateIn)
      .eq('ride_id', rideId)
      .select()
      .single();

    if (updateError) {
      return json({ error: `Failed to update ride: ${updateError.message}` }, { status: 500 });
    }

    return json({ success: true, ride: updated });
  } catch (err: any) {
    console.error('Dispatcher update error:', err);
    return json({ error: `Internal server error: ${err.message}` }, { status: 500 });
  }
};