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

    // Verify the vehicle belongs to the current user
    const { data: existingVehicle, error: fetchError } = await supabase
      .from('vehicles')
      .select('vehicle_id, user_id')
      .eq('vehicle_id', vehicleId)
      .single();

    if (fetchError || !existingVehicle) {
      return json({ error: 'Vehicle not found' }, { status: 404 });
    }

    if (existingVehicle.user_id !== user.id) {
      return json({ error: 'You do not have permission to delete this vehicle' }, { status: 403 });
    }

    const { error: deleteError } = await supabase
      .from('vehicles')
      .delete()
      .eq('vehicle_id', vehicleId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting vehicle:', deleteError);
      return json({ error: `Failed to delete vehicle: ${deleteError.message}` }, { status: 500 });
    }

    return json({ success: true });
  } catch (error: any) {
    console.error('Error in vehicle deletion:', error);
    return json({ error: `Internal server error: ${error.message}` }, { status: 500 });
  }
};

