import { json, type RequestHandler } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const POST: RequestHandler = async (event) => {
  try {
    const supabase = createSupabaseServerClient(event);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const destinationId = event.params.destinationId;
    if (!destinationId) {
      return json({ error: 'Destination ID is required' }, { status: 400 });
    }

    const body = await event.request.json();
    const { location_name, address, address2, city, state, zipcode } = body;

    // Validate required fields
    if (!location_name || !address || !city || !state) {
      return json({ error: 'Missing required fields: location_name, address, city, and state are required' }, { status: 400 });
    }

    // Get user's profile and org
    const { data: profile } = await supabase
      .from('staff_profiles')
      .select('org_id, role')
      .eq('user_id', session.user.id)
      .single();

    if (!profile) {
      return json({ error: 'User profile not found' }, { status: 404 });
    }

    // Verify user has permission (Dispatcher or Admin role)
    const hasPermission = Array.isArray(profile.role)
      ? (profile.role.includes('Dispatcher') || profile.role.includes('Admin') || profile.role.includes('Super Admin'))
      : (profile.role === 'Dispatcher' || profile.role === 'Admin' || profile.role === 'Super Admin');

    if (!hasPermission) {
      return json({ error: 'You do not have permission to update destinations' }, { status: 403 });
    }

    // Verify the destination belongs to the same org
    const { data: existingDestination, error: fetchError } = await supabase
      .from('destinations')
      .select('destination_id, org_id')
      .eq('destination_id', destinationId)
      .single();

    if (fetchError || !existingDestination) {
      return json({ error: 'Destination not found' }, { status: 404 });
    }

    if (existingDestination.org_id !== profile.org_id) {
      return json({ error: 'You do not have permission to update this destination' }, { status: 403 });
    }

    const payload = {
      location_name: location_name.trim(),
      address: address.trim(),
      address2: address2?.trim() || null,
      city: city.trim(),
      state: state.trim(),
      zipcode: zipcode?.trim() || null
    };

    const { data: destination, error: updateError } = await supabase
      .from('destinations')
      .update(payload)
      .eq('destination_id', destinationId)
      .eq('org_id', profile.org_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating destination:', updateError);
      return json({ error: `Failed to update destination: ${updateError.message}` }, { status: 500 });
    }

    return json({ success: true, destination });
  } catch (error: any) {
    console.error('Error in destination update:', error);
    return json({ error: `Internal server error: ${error.message}` }, { status: 500 });
  }
};

