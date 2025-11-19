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
      vehicleTypes: [],
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

  // Get vehicle_types from vehicle_types table
  const { data: vehicleTypesData } = await supabase
    .from('vehicle_types')
    .select('vehicle_type_id, type_name')
    .eq('org_id', profile.org_id)
    .order('type_name', { ascending: true });

  // Extract just the type names
  const vehicleTypes = vehicleTypesData?.map(vt => vt.type_name) || ['SUV', 'Sedan', 'Van', 'Truck', 'Coupe'];

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

    // If creating as Active, first deactivate all other vehicles for this user
    if (active) {
      await supabase
        .from('vehicles')
        .update({ active: false })
        .eq('org_id', profile.org_id)
        .eq('user_id', user_id);
    }

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

    // If setting to Active, deactivate other vehicles for same user
    if (active && owner_user_id) {
      await supabase
        .from('vehicles')
        .update({ active: false })
        .eq('org_id', profile.org_id)
        .eq('user_id', owner_user_id)
        .neq('vehicle_id', vehicle_id);
    }

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

  addVehicleType: async (event) => {
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
    const typeName = (formData.get('type_name') as string)?.trim();
    
    if (!typeName) {
      return fail(400, { error: 'Vehicle type name is required' });
    }

    // Check if already exists (case-insensitive)
    const { data: existing } = await supabase
      .from('vehicle_types')
      .select('vehicle_type_id')
      .eq('org_id', profile.org_id)
      .ilike('type_name', typeName)
      .single();

    if (existing) {
      return fail(400, { error: 'Vehicle type already exists' });
    }

    const { data: newType, error } = await supabase
      .from('vehicle_types')
      .insert({ org_id: profile.org_id, type_name: typeName })
      .select('vehicle_type_id, type_name')
      .single();

    if (error) {
      console.error('Add vehicle type error:', error);
      return fail(500, { error: error.message });
    }

    return { success: true, vehicleType: newType };
  },

  updateVehicleType: async (event) => {
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
    const vehicleTypeId = parseInt(formData.get('vehicle_type_id') as string);
    const typeName = (formData.get('type_name') as string)?.trim();
    
    if (!vehicleTypeId || !typeName) {
      return fail(400, { error: 'Vehicle type ID and name are required' });
    }

    // Verify the vehicle type belongs to this org
    const { data: existing } = await supabase
      .from('vehicle_types')
      .select('vehicle_type_id, org_id')
      .eq('vehicle_type_id', vehicleTypeId)
      .single();

    if (!existing || existing.org_id !== profile.org_id) {
      return fail(404, { error: 'Vehicle type not found' });
    }

    // Check if new name conflicts with another type (case-insensitive)
    const { data: conflict } = await supabase
      .from('vehicle_types')
      .select('vehicle_type_id')
      .eq('org_id', profile.org_id)
      .ilike('type_name', typeName)
      .neq('vehicle_type_id', vehicleTypeId)
      .single();

    if (conflict) {
      return fail(400, { error: 'Vehicle type name already exists' });
    }

    const { data: updated, error } = await supabase
      .from('vehicle_types')
      .update({ type_name: typeName, updated_at: new Date().toISOString() })
      .eq('vehicle_type_id', vehicleTypeId)
      .select('vehicle_type_id, type_name')
      .single();

    if (error) {
      console.error('Update vehicle type error:', error);
      return fail(500, { error: error.message });
    }

    return { success: true, vehicleType: updated };
  },

  deleteVehicleType: async (event) => {
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
    const vehicleTypeId = parseInt(formData.get('vehicle_type_id') as string);
    
    if (!vehicleTypeId) {
      return fail(400, { error: 'Vehicle type ID is required' });
    }

    // Verify the vehicle type belongs to this org
    const { data: existing } = await supabase
      .from('vehicle_types')
      .select('vehicle_type_id, org_id, type_name')
      .eq('vehicle_type_id', vehicleTypeId)
      .single();

    if (!existing || existing.org_id !== profile.org_id) {
      return fail(404, { error: 'Vehicle type not found' });
    }

    // Check if any vehicles are using this type
    const { data: vehiclesUsingType } = await supabase
      .from('vehicles')
      .select('vehicle_id')
      .eq('org_id', profile.org_id)
      .eq('type_of_vehicle_enum', existing.type_name)
      .limit(1);

    if (vehiclesUsingType && vehiclesUsingType.length > 0) {
      return fail(400, { error: `Cannot delete "${existing.type_name}" - vehicles are using this type` });
    }

    const { error } = await supabase
      .from('vehicle_types')
      .delete()
      .eq('vehicle_type_id', vehicleTypeId);

    if (error) {
      console.error('Delete vehicle type error:', error);
      return fail(500, { error: error.message });
    }

    return { success: true };
  }
} satisfies Actions;