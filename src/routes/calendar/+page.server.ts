// src/routes/schedule/+page.server.ts
import { createSupabaseServerClient } from '$lib/supabase.server';
import { error, redirect } from '@sveltejs/kit';

export const load = async (event) => {
  const supabase = createSupabaseServerClient(event);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw redirect(302, '/login');
  }

  console.log('===== SCHEDULE PAGE SERVER =====');
  console.log('Current user:', session.user.id);

  const { data: userProfile, error: profileError } = await supabase
    .from('staff_profiles')
    .select('org_id, role')
    .eq('user_id', session.user.id)
    .single();

  if (profileError || !userProfile) {
    console.error('Profile error:', profileError);
    throw error(403, 'User profile not found');
  }

  console.log('User profile:', userProfile);

  // Check if user is admin or dispatcher
  const isAdminOrDispatcher = userProfile.role && (
    Array.isArray(userProfile.role)
      ? (userProfile.role.includes('Admin') || userProfile.role.includes('Dispatcher'))
      : (userProfile.role === 'Admin' || userProfile.role === 'Dispatcher')
  );

  console.log('Is admin/dispatcher:', isAdminOrDispatcher);

  // Fetch driver unavailability
  const { data: unavailabilityData, error: fetchError } = await supabase
    .from('driver_unavailability')
    .select(`
      *,
      staff_profiles!fk_staff_profile (
        first_name,
        last_name,
        org_id
      )
    `)
    .eq('staff_profiles.org_id', userProfile.org_id)
    .order('unavailable_date', { ascending: true });

  if (fetchError) {
    console.error('Error fetching unavailability:', fetchError);
  }

  // Fetch rides assigned to current user - SIMPLIFIED QUERY
  console.log('=== FETCHING MY RIDES ===');
  const { data: myRidesData, error: myRidesError } = await supabase
    .from('rides')
    .select(`
      *,
      clients!rides_client_id_fkey (
        first_name,
        last_name,
        primary_phone
      )
    `)
    .eq('driver_user_id', session.user.id)
    .in('status', ['Requested', 'Scheduled', 'Assigned', 'In Progress'])
    .order('appointment_time', { ascending: true });

  console.log('My rides error:', myRidesError);
  console.log('My rides count:', myRidesData?.length || 0);
  if (myRidesData && myRidesData.length > 0) {
    console.log('Sample my ride:', JSON.stringify(myRidesData[0], null, 2));
  }

  // Fetch ALL rides for organization - SIMPLIFIED QUERY
  let allRidesData = null;
  if (isAdminOrDispatcher) {
    console.log('=== FETCHING ALL ORG RIDES ===');
    const { data, error: allRidesError } = await supabase
      .from('rides')
      .select(`
        *,
        clients!rides_client_id_fkey (
          first_name,
          last_name,
          primary_phone
        )
      `)
      .eq('org_id', userProfile.org_id)
      .in('status', ['Requested', 'Scheduled', 'Assigned', 'In Progress'])
      .order('appointment_time', { ascending: true });

    console.log('All rides error:', allRidesError);
    console.log('All rides count:', data?.length || 0);
    if (data && data.length > 0) {
      console.log('Sample org ride:', JSON.stringify(data[0], null, 2));
    }
    allRidesData = data;
  }

  console.log('================================');

  return {
    unavailability: unavailabilityData || [],
    myRides: myRidesData || [],
    allRides: allRidesData || [],
    userOrgId: userProfile.org_id,
    isAdminOrDispatcher,
    session
  };
};