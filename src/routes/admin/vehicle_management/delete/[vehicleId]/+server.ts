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
      .select('vehicle_id, org_id')
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
      return json({ error: 'You do not have permission to delete vehicles in this organization' }, { status: 403 });
    }

    const { error: deleteError } = await supabase
      .from('vehicles')
      .delete()
      .eq('vehicle_id', vehicleId);

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

