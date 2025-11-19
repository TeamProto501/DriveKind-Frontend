import { json, type RequestHandler } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const POST: RequestHandler = async (event) => {
  try {
    const supabase = createSupabaseServerClient(event);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const vehicleId = event.params.vehicleId;
    if (!vehicleId) {
      return json({ error: 'Vehicle ID is required' }, { status: 400 });
    }

    const body = await event.request.json();
    const { type_of_vehicle_enum, vehicle_color, nondriver_seats } = body;

    // Validate required fields
    if (!type_of_vehicle_enum || !vehicle_color || nondriver_seats === null || nondriver_seats === undefined) {
      return json({ error: 'Missing required fields: type_of_vehicle_enum, vehicle_color, and nondriver_seats are required' }, { status: 400 });
    }

    // Validate seats is non-negative
    if (nondriver_seats < 0) {
      return json({ error: 'nondriver_seats must be a non-negative integer' }, { status: 400 });
    }

    // Verify the vehicle belongs to the current user
    const { data: existingVehicle, error: fetchError } = await supabase
      .from('vehicles')
      .select('vehicle_id, user_id, org_id')
      .eq('vehicle_id', vehicleId)
      .single();

    if (fetchError || !existingVehicle) {
      return json({ error: 'Vehicle not found' }, { status: 404 });
    }

    if (existingVehicle.user_id !== user.id) {
      return json({ error: 'You do not have permission to update this vehicle' }, { status: 403 });
    }

    // Validate vehicle type against organization's vehicle_types table
    const { data: vehicleTypesData } = await supabase
      .from('vehicle_types')
      .select('type_name')
      .eq('org_id', existingVehicle.org_id);

    const vehicleTypes = vehicleTypesData?.map(vt => vt.type_name) || ['SUV', 'Sedan', 'Van', 'Truck', 'Coupe'];
    if (!vehicleTypes.includes(type_of_vehicle_enum)) {
      return json({ error: `Invalid vehicle type. Must be one of: ${vehicleTypes.join(', ')}` }, { status: 400 });
    }

    const payload = {
      type_of_vehicle_enum: type_of_vehicle_enum,
      vehicle_color: vehicle_color.trim(),
      nondriver_seats: Math.trunc(nondriver_seats)
    };

    const { data: vehicle, error: updateError } = await supabase
      .from('vehicles')
      .update(payload)
      .eq('vehicle_id', vehicleId)
      .eq('user_id', user.id)
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

