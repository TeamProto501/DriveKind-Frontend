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
    const { location_name, address, address2, city, state, zipcode, org_id } = body;

    // Validate required fields
    if (!location_name || !address || !city || !state) {
      return json({ error: 'Missing required fields: location_name, address, city, and state are required' }, { status: 400 });
    }

    // Get user's org_id if not provided
    let userOrgId = org_id;
    if (!userOrgId) {
      const { data: profile } = await supabase
        .from('staff_profiles')
        .select('org_id')
        .eq('user_id', session.user.id)
        .single();
      
      if (!profile) {
        return json({ error: 'User profile not found' }, { status: 404 });
      }
      userOrgId = profile.org_id;
    }

    // Verify user has permission (Dispatcher or Admin role)
    const { data: profile } = await supabase
      .from('staff_profiles')
      .select('org_id, role')
      .eq('user_id', session.user.id)
      .single();

    if (!profile) {
      return json({ error: 'User profile not found' }, { status: 404 });
    }

    if (profile.org_id !== userOrgId) {
      return json({ error: 'You do not have permission to create destinations for this organization' }, { status: 403 });
    }

    const hasPermission = Array.isArray(profile.role)
      ? (profile.role.includes('Dispatcher') || profile.role.includes('Admin') || profile.role.includes('Super Admin'))
      : (profile.role === 'Dispatcher' || profile.role === 'Admin' || profile.role === 'Super Admin');

    if (!hasPermission) {
      return json({ error: 'You do not have permission to create destinations' }, { status: 403 });
    }

    const payload = {
      location_name: location_name.trim(),
      address: address.trim(),
      address2: address2?.trim() || null,
      city: city.trim(),
      state: state.trim(),
      zipcode: zipcode?.trim() || null,
      org_id: userOrgId
    };

    const { data: destination, error: destinationError } = await supabase
      .from('destinations')
      .insert(payload)
      .select()
      .single();

    if (destinationError) {
      console.error('Error creating destination:', destinationError);
      return json({ error: `Failed to create destination: ${destinationError.message}` }, { status: 500 });
    }

    return json({ success: true, destination });
  } catch (error: any) {
    console.error('Error in destination creation:', error);
    return json({ error: `Internal server error: ${error.message}` }, { status: 500 });
  }
};

