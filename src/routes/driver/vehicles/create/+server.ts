import { json, type RequestHandler } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const POST: RequestHandler = async (event) => {
  try {
    const supabase = createSupabaseServerClient(event);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await event.request.json();
    const { type_of_vehicle_enum, vehicle_color, nondriver_seats, org_id } = body;

    // Validate required fields
    if (!type_of_vehicle_enum || !vehicle_color || nondriver_seats === null || nondriver_seats === undefined) {
      return json({ error: 'Missing required fields: type_of_vehicle_enum, vehicle_color, and nondriver_seats are required' }, { status: 400 });
    }

    // Validate seats is non-negative
    if (nondriver_seats < 0) {
      return json({ error: 'nondriver_seats must be a non-negative integer' }, { status: 400 });
    }

    // Get user's org_id if not provided
    let userOrgId = org_id;
    if (!userOrgId) {
      const { data: profile } = await supabase
        .from('staff_profiles')
        .select('org_id')
        .eq('user_id', user.id)
        .single();
      
      if (!profile) {
        return json({ error: 'User profile not found' }, { status: 404 });
      }
      userOrgId = profile.org_id;
    }

    // Validate vehicle type against organization's vehicle_types
    const { data: org } = await supabase
      .from('organization')
      .select('vehicle_types')
      .eq('org_id', userOrgId)
      .single();

    const vehicleTypes = org?.vehicle_types || ['SUV', 'Sedan', 'Van', 'Truck', 'Coupe'];
    if (!vehicleTypes.includes(type_of_vehicle_enum)) {
      return json({ error: `Invalid vehicle type. Must be one of: ${vehicleTypes.join(', ')}` }, { status: 400 });
    }

    const payload = {
      user_id: user.id,
      org_id: userOrgId,
      type_of_vehicle_enum: type_of_vehicle_enum,
      vehicle_color: vehicle_color.trim(),
      nondriver_seats: Math.trunc(nondriver_seats),
      active: false
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

