import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const load: PageServerLoad = async (event) => {
  const supabase = createSupabaseServerClient(event);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw redirect(302, '/login');
  }

  // Get user's profile and org
  const { data: profile } = await supabase
    .from('staff_profiles')
    .select('org_id, role')
    .eq('user_id', session.user.id)
    .single();

  if (!profile?.org_id) {
    return {
      session,
      profile,
      roles: [],
      vehicles: [],
      driverOptions: [],
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

  // Get all drivers in org for dropdown (with contact info)
  const { data: drivers } = await supabase
    .from('staff_profiles')
    .select('user_id, first_name, last_name, phone, email, address, address2, city, state, zipcode')
    .eq('org_id', profile.org_id)
    .contains('role', ['Driver']);

  return {
    session,
    profile,
    roles: Array.isArray(profile.role) ? profile.role : [],
    vehicles: vehiclesWithProfiles,
    driverOptions: drivers || []
  };
};

export const actions = {
  create: async (event) => {
    const supabase = createSupabaseServerClient(event);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return fail(401, { error: 'Unauthorized' });
    }

    const { data: profile } = await supabase
      .from('staff_profiles')
      .select('org_id, role')
      .eq('user_id', session.user.id)
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
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return fail(401, { error: 'Unauthorized' });
    }

    const { data: profile } = await supabase
      .from('staff_profiles')
      .select('org_id, role')
      .eq('user_id', session.user.id)
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
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return fail(401, { error: 'Unauthorized' });
    }

    const { data: profile } = await supabase
      .from('staff_profiles')
      .select('org_id, role')
      .eq('user_id', session.user.id)
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
  }
} satisfies Actions;