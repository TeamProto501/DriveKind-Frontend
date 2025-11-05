import { json, type RequestHandler } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const POST: RequestHandler = async (event) => {
  try {
    const supabase = createSupabaseServerClient(event);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const vehicleId = event.params.vehicleId;
    if (!vehicleId) {
      return json({ error: 'Vehicle ID is required' }, { status: 400 });
    }

    const body = await event.request.json();
    const { type_of_vehicle_enum, vehicle_color, nondriver_seats, active, user_id, org_id } = body;

    // Validate required fields
    if (!type_of_vehicle_enum || !vehicle_color || nondriver_seats === null || nondriver_seats === undefined) {
      return json({ error: 'Missing required fields: type_of_vehicle_enum, vehicle_color, and nondriver_seats are required' }, { status: 400 });
    }

    // Validate seats is non-negative
    if (nondriver_seats < 0) {
      return json({ error: 'nondriver_seats must be a non-negative integer' }, { status: 400 });
    }

    // Verify user has Admin or Super Admin role
    const { data: profile } = await supabase
      .from('staff_profiles')
      .select('role, org_id')
      .eq('user_id', session.user.id)
      .single();

    if (!profile) {
      return json({ error: 'User profile not found' }, { status: 404 });
    }

    const hasPermission = Array.isArray(profile.role)
      ? (profile.role.includes('Admin') || profile.role.includes('Super Admin'))
      : (profile.role === 'Admin' || profile.role === 'Super Admin');

    if (!hasPermission) {
      return json({ error: 'Access denied. Admin or Super Admin role required.' }, { status: 403 });
    }

    // Get existing vehicle to verify org_id
    const { data: existingVehicle, error: fetchError } = await supabase
      .from('vehicles')
      .select('vehicle_id, org_id, user_id')
      .eq('vehicle_id', vehicleId)
      .single();

    if (fetchError || !existingVehicle) {
      return json({ error: 'Vehicle not found' }, { status: 404 });
    }

    // Verify the organization matches (unless Super Admin)
    const isSuperAdmin = Array.isArray(profile.role)
      ? profile.role.includes('Super Admin')
      : profile.role === 'Super Admin';

    if (!isSuperAdmin && profile.org_id !== existingVehicle.org_id) {
      return json({ error: 'You do not have permission to update vehicles in this organization' }, { status: 403 });
    }

    // If setting this vehicle to Active, first deactivate other vehicles for same user in this org
    if (active && user_id) {
      const { error: offErr } = await supabase
        .from('vehicles')
        .update({ active: false })
        .eq('org_id', existingVehicle.org_id)
        .eq('user_id', user_id)
        .neq('vehicle_id', vehicleId);

      if (offErr) {
        console.error('Error deactivating other vehicles:', offErr);
        return json({ error: `Failed to deactivate other vehicles: ${offErr.message}` }, { status: 500 });
      }
    }

    const payload = {
      type_of_vehicle_enum: type_of_vehicle_enum as 'SUV' | 'Sedan' | 'Van' | 'Motorcycle' | 'Truck' | 'Coupe',
      vehicle_color: vehicle_color.trim(),
      nondriver_seats: Math.trunc(nondriver_seats),
      active: active !== undefined ? !!active : undefined
    };

    // Remove undefined fields
    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

    const { data: vehicle, error: updateError } = await supabase
      .from('vehicles')
      .update(payload)
      .eq('vehicle_id', vehicleId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating vehicle:', updateError);
      return json({ error: `Failed to update vehicle: ${updateError.message}` }, { status: 500 });
    }

    return json({ success: true, vehicle });
  } catch (error: any) {
    console.error('Error in vehicle update:', error);
    return json({ error: `Internal server error: ${error.message}` }, { status: 500 });
  }
};

