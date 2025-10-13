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

  // Fetch rides - NO JOINS, just raw ride data
  console.log('=== FETCHING MY RIDES (NO JOINS) ===');
  const { data: myRidesData, error: myRidesError } = await supabase
    .from('rides')
    .select('*')
    .eq('driver_user_id', session.user.id)
    .in('status', ['Requested', 'Scheduled', 'Assigned', 'In Progress'])
    .order('appointment_time', { ascending: true });

  console.log('My rides error:', myRidesError);
  console.log('My rides count:', myRidesData?.length || 0);
  if (myRidesData && myRidesData.length > 0) {
    console.log('Sample my ride:', JSON.stringify(myRidesData[0], null, 2));
  }

  // Fetch clients separately
  let clientsMap = new Map();
  if (myRidesData && myRidesData.length > 0) {
    const clientIds = myRidesData.map(r => r.client_id).filter(Boolean);
    if (clientIds.length > 0) {
      const { data: clientsData } = await supabase
        .from('clients')
        .select('client_id, first_name, last_name, primary_phone')
        .in('client_id', clientIds);
      
      if (clientsData) {
        clientsData.forEach(client => {
          clientsMap.set(client.client_id, client);
        });
      }
    }
  }

  // Attach client data to rides
  const myRidesWithClients = myRidesData?.map(ride => ({
    ...ride,
    clients: clientsMap.get(ride.client_id) || null
  })) || [];

  // Fetch ALL rides for organization - NO JOINS
  let allRidesData = null;
  let allRidesWithClients = [];
  if (isAdminOrDispatcher) {
    console.log('=== FETCHING ALL ORG RIDES (NO JOINS) ===');
    const { data, error: allRidesError } = await supabase
      .from('rides')
      .select('*')
      .eq('org_id', userProfile.org_id)
      .in('status', ['Requested', 'Scheduled', 'Assigned', 'In Progress'])
      .order('appointment_time', { ascending: true });

    console.log('All rides error:', allRidesError);
    console.log('All rides count:', data?.length || 0);
    if (data && data.length > 0) {
      console.log('Sample org ride:', JSON.stringify(data[0], null, 2));
    }
    
    allRidesData = data;

    // Fetch clients for all rides
    if (allRidesData && allRidesData.length > 0) {
      const allClientIds = allRidesData.map(r => r.client_id).filter(Boolean);
      if (allClientIds.length > 0) {
        const { data: allClientsData } = await supabase
          .from('clients')
          .select('client_id, first_name, last_name, primary_phone')
          .in('client_id', allClientIds);
        
        if (allClientsData) {
          const allClientsMap = new Map();
          allClientsData.forEach(client => {
            allClientsMap.set(client.client_id, client);
          });
          
          allRidesWithClients = allRidesData.map(ride => ({
            ...ride,
            clients: allClientsMap.get(ride.client_id) || null
          }));
        }
      }
    }
  }

  console.log('Final my rides with clients:', myRidesWithClients.length);
  console.log('Final all rides with clients:', allRidesWithClients.length);
  console.log('================================');

  return {
    unavailability: unavailabilityData || [],
    myRides: myRidesWithClients,
    allRides: allRidesWithClients,
    userOrgId: userProfile.org_id,
    isAdminOrDispatcher,
    session
  };
};