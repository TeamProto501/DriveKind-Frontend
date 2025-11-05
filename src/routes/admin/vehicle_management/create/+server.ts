import { json, type RequestHandler } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const POST: RequestHandler = async (event) => {
  try {
    const supabase = createSupabaseServerClient(event);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await event.request.json();
    const { user_id, org_id, type_of_vehicle_enum, vehicle_color, nondriver_seats, active } = body;

    // Validate required fields
    if (!user_id || !org_id || !type_of_vehicle_enum || !vehicle_color || nondriver_seats === null || nondriver_seats === undefined) {
      return json({ error: 'Missing required fields: user_id, org_id, type_of_vehicle_enum, vehicle_color, and nondriver_seats are required' }, { status: 400 });
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

    // Verify the organization matches (unless Super Admin)
    const isSuperAdmin = Array.isArray(profile.role)
      ? profile.role.includes('Super Admin')
      : profile.role === 'Super Admin';

    if (!isSuperAdmin && profile.org_id !== org_id) {
      return json({ error: 'You do not have permission to create vehicles for this organization' }, { status: 403 });
    }

    // If creating as Active, first deactivate all other vehicles for this user in this org
    if (active) {
      const { error: offErr } = await supabase
        .from('vehicles')
        .update({ active: false })
        .eq('org_id', org_id)
        .eq('user_id', user_id);

      if (offErr) {
        console.error('Error deactivating other vehicles:', offErr);
        return json({ error: `Failed to deactivate other vehicles: ${offErr.message}` }, { status: 500 });
      }
    }

    const payload = {
      user_id,
      org_id,
      type_of_vehicle_enum: type_of_vehicle_enum as 'SUV' | 'Sedan' | 'Van' | 'Motorcycle' | 'Truck' | 'Coupe',
      vehicle_color: vehicle_color.trim(),
      nondriver_seats: Math.trunc(nondriver_seats),
      active: !!active
    };

    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .insert(payload)
      .select()
      .single();

    if (vehicleError) {
      console.error('Error creating vehicle:', vehicleError);
      return json({ error: `Failed to create vehicle: ${vehicleError.message}` }, { status: 500 });
    }

    return json({ success: true, vehicle });
  } catch (error: any) {
    console.error('Error in vehicle creation:', error);
    return json({ error: `Internal server error: ${error.message}` }, { status: 500 });
  }
};

