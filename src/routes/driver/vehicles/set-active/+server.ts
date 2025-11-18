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
    const { vehicle_id } = body;

    if (!vehicle_id) {
      return json({ error: 'Vehicle ID is required' }, { status: 400 });
    }

    // Verify the vehicle belongs to the current user
    const { data: existingVehicle, error: fetchError } = await supabase
      .from('vehicles')
      .select('vehicle_id, user_id')
      .eq('vehicle_id', vehicle_id)
      .single();

    if (fetchError || !existingVehicle) {
      return json({ error: 'Vehicle not found' }, { status: 404 });
    }

    if (existingVehicle.user_id !== user.id) {
      return json({ error: 'You do not have permission to update this vehicle' }, { status: 403 });
    }

    // First, deactivate all other vehicles for this user
    const { error: deactivateError } = await supabase
      .from('vehicles')
      .update({ active: false })
      .eq('user_id', user.id)
      .neq('vehicle_id', vehicle_id);

    if (deactivateError) {
      console.error('Error deactivating other vehicles:', deactivateError);
      return json({ error: `Failed to deactivate other vehicles: ${deactivateError.message}` }, { status: 500 });
    }

    // Then activate the selected vehicle
    const { data: vehicle, error: activateError } = await supabase
      .from('vehicles')
      .update({ active: true })
      .eq('vehicle_id', vehicle_id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (activateError) {
      console.error('Error activating vehicle:', activateError);
      return json({ error: `Failed to activate vehicle: ${activateError.message}` }, { status: 500 });
    }

    return json({ success: true, vehicle });
  } catch (error: any) {
    console.error('Error in setting active vehicle:', error);
    return json({ error: `Internal server error: ${error.message}` }, { status: 500 });
  }
};

