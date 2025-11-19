import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const load: PageServerLoad = async (event) => {
  const supabase = createSupabaseServerClient(event);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw redirect(302, '/login');
  }

  // Get user's profile and org
  const { data: profile } = await supabase
    .from('staff_profiles')
    .select('org_id, role')
    .eq('user_id', user.id)
    .single();

  if (!profile?.org_id) {
    return {
      session: { user },
      profile,
      roles: [],
      vehicles: [],
      driverOptions: [],
      vehicleTypes: ['SUV', 'Sedan', 'Van', 'Truck', 'Coupe'],
      error: 'No org found'
    };
  }

  // Get all vehicles in org
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('*')
    .eq('org_id', profile.org_id)
    .order('vehicle_id', { ascending: true });

  // Get driver names separately
  const userIds = [...new Set((vehicles || []).map(v => v.user_id).filter(Boolean))];
  const { data: staffProfiles } = await supabase
    .from('staff_profiles')
    .select('user_id, first_name, last_name')
    .in('user_id', userIds);

  // Merge staff profiles into vehicles
  const profileMap = new Map(staffProfiles?.map(p => [p.user_id, p]) || []);
  const vehiclesWithProfiles = (vehicles || []).map(v => ({
    ...v,
    staff_profile: v.user_id ? profileMap.get(v.user_id) : null
  }));

  // Get all drivers in org for dropdown
  const { data: drivers } = await supabase
    .from('staff_profiles')
    .select('user_id, first_name, last_name')
    .eq('org_id', profile.org_id)
    .contains('role', ['Driver']);

  // Get vehicle_types from organization
  const { data: org } = await supabase
    .from('organization')
    .select('vehicle_types')
    .eq('org_id', profile.org_id)
    .single();

  // Default vehicle types if not set (excluding Motorcycle)
  const vehicleTypes = org?.vehicle_types || ['SUV', 'Sedan', 'Van', 'Truck', 'Coupe'];

  return {
    session: { user },
    profile,
    roles: Array.isArray(profile.role) ? profile.role : [],
    vehicles: vehiclesWithProfiles,
    driverOptions: drivers || [],
    vehicleTypes
  };
};

export const actions = {
  create: async (event) => {
    const supabase = createSupabaseServerClient(event);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return fail(401, { error: 'Unauthorized' });
    }

    const { data: profile } = await supabase
      .from('staff_profiles')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile?.org_id) {
      return fail(400, { error: 'No organization found' });
    }

    const roles = Array.isArray(profile.role) ? profile.role : [];
    if (!roles.includes('Admin') && !roles.includes('Super Admin')) {
      return fail(403, { error: 'Permission denied' });
    }

    const formData = await event.request.formData();
    const user_id = formData.get('user_id') as string;
    const type_of_vehicle_enum = formData.get('type_of_vehicle_enum') as string;
    const vehicle_color = formData.get('vehicle_color') as string;
    const nondriver_seats = parseInt(formData.get('nondriver_seats') as string);
    const active = formData.get('active') === 'true';

    // Validate vehicle type against organization's vehicle_types
    const { data: org } = await supabase
      .from('organization')
      .select('vehicle_types')
      .eq('org_id', profile.org_id)
      .single();

    const vehicleTypes = org?.vehicle_types || ['SUV', 'Sedan', 'Van', 'Truck', 'Coupe'];
    if (!vehicleTypes.includes(type_of_vehicle_enum)) {
      return fail(400, { error: `Invalid vehicle type. Must be one of: ${vehicleTypes.join(', ')}` });
    }

    // REMOVED: No longer deactivating other vehicles - allow multiple active vehicles

    const { error } = await supabase
      .from('vehicles')
      .insert({
        org_id: profile.org_id,
        user_id,
        type_of_vehicle_enum,
        vehicle_color,
        nondriver_seats,
        active
      });

    if (error) {
      console.error('Create vehicle error:', error);
      return fail(500, { error: error.message });
    }

    return { success: true };
  },

  update: async (event) => {
    const supabase = createSupabaseServerClient(event);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return fail(401, { error: 'Unauthorized' });
    }

    const { data: profile } = await supabase
      .from('staff_profiles')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile?.org_id) {
      return fail(400, { error: 'No organization found' });
    }

    const roles = Array.isArray(profile.role) ? profile.role : [];
    if (!roles.includes('Admin') && !roles.includes('Super Admin')) {
      return fail(403, { error: 'Permission denied' });
    }

    const formData = await event.request.formData();
    const vehicle_id = parseInt(formData.get('vehicle_id') as string);
    const owner_user_id = formData.get('owner_user_id') as string;
    const type_of_vehicle_enum = formData.get('type_of_vehicle_enum') as string;
    const vehicle_color = formData.get('vehicle_color') as string;
    const nondriver_seats = parseInt(formData.get('nondriver_seats') as string);
    const active = formData.get('active') === 'true';

    // Validate vehicle type against organization's vehicle_types
    const { data: org } = await supabase
      .from('organization')
      .select('vehicle_types')
      .eq('org_id', profile.org_id)
      .single();

    const vehicleTypes = org?.vehicle_types || ['SUV', 'Sedan', 'Van', 'Truck', 'Coupe'];
    if (!vehicleTypes.includes(type_of_vehicle_enum)) {
      return fail(400, { error: `Invalid vehicle type. Must be one of: ${vehicleTypes.join(', ')}` });
    }

    // REMOVED: No longer deactivating other vehicles - allow multiple active vehicles

    const { error } = await supabase
      .from('vehicles')
      .update({
        type_of_vehicle_enum,
        vehicle_color,
        nondriver_seats,
        active
      })
      .eq('vehicle_id', vehicle_id)
      .eq('org_id', profile.org_id);

    if (error) {
      console.error('Update vehicle error:', error);
      return fail(500, { error: error.message });
    }

    return { success: true };
  },

  delete: async (event) => {
    const supabase = createSupabaseServerClient(event);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return fail(401, { error: 'Unauthorized' });
    }

    const { data: profile } = await supabase
      .from('staff_profiles')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile?.org_id) {
      return fail(400, { error: 'No organization found' });
    }

    const roles = Array.isArray(profile.role) ? profile.role : [];
    if (!roles.includes('Admin') && !roles.includes('Super Admin')) {
      return fail(403, { error: 'Permission denied' });
    }

    const formData = await event.request.formData();
    const vehicle_id = parseInt(formData.get('vehicle_id') as string);

    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('vehicle_id', vehicle_id)
      .eq('org_id', profile.org_id);

    if (error) {
      console.error('Delete vehicle error:', error);
      return fail(500, { error: error.message });
    }

    return { success: true };
  },

  updateVehicleTypes: async (event) => {
    const supabase = createSupabaseServerClient(event);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return fail(401, { error: 'Unauthorized' });
    }

    const { data: profile } = await supabase
      .from('staff_profiles')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile?.org_id) {
      return fail(400, { error: 'No organization found' });
    }

    const roles = Array.isArray(profile.role) ? profile.role : [];
    if (!roles.includes('Admin') && !roles.includes('Super Admin')) {
      return fail(403, { error: 'Permission denied' });
    }

    const formData = await event.request.formData();
    const vehicleTypesJson = formData.get('vehicle_types') as string;
    
    if (!vehicleTypesJson) {
      return fail(400, { error: 'vehicle_types is required' });
    }

    let vehicleTypes: string[];
    try {
      vehicleTypes = JSON.parse(vehicleTypesJson);
      if (!Array.isArray(vehicleTypes)) {
        return fail(400, { error: 'vehicle_types must be an array' });
      }
    } catch (e) {
      return fail(400, { error: 'Invalid JSON format for vehicle_types' });
    }

    // Validate that vehicle types are non-empty strings
    if (vehicleTypes.some(t => typeof t !== 'string' || !t.trim())) {
      return fail(400, { error: 'All vehicle types must be non-empty strings' });
    }

    // Remove duplicates (case-insensitive) and trim
    const uniqueTypes = Array.from(new Set(vehicleTypes.map(t => t.trim()).filter(t => t.length > 0)));

    const { data: updatedOrg, error } = await supabase
      .from('organization')
      .update({ vehicle_types: uniqueTypes })
      .eq('org_id', profile.org_id)
      .select('vehicle_types')
      .single();

    if (error) {
      console.error('Update vehicle types error:', error);
      return fail(500, { error: error.message });
    }

    return { success: true, vehicleTypes: updatedOrg.vehicle_types };
  }
} satisfies Actions;