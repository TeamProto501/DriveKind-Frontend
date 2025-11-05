// src/routes/schedule/+page.server.ts
import { createSupabaseServerClient } from '$lib/supabase.server';
import { error, redirect } from '@sveltejs/kit';

export const load = async (event) => {
  const supabase = createSupabaseServerClient(event);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw redirect(302, '/login');
  }

  const { data: userProfile, error: profileError } = await supabase
    .from('staff_profiles')
    .select('org_id, role')
    .eq('user_id', session.user.id)
    .single();

  if (profileError || !userProfile) {
    throw error(403, 'User profile not found');
  }

  const isAdminOrDispatcher = userProfile.role && (
    Array.isArray(userProfile.role)
      ? (userProfile.role.includes('Admin') || userProfile.role.includes('Dispatcher') || userProfile.role.includes('Super Admin'))
      : (userProfile.role === 'Admin' || userProfile.role === 'Dispatcher' || userProfile.role === 'Super Admin')
  );

  // Fetch MY unavailability (for all users)
  const { data: myUnavailabilityData } = await supabase
    .from('driver_unavailability')
    .select(`
      *,
      staff_profiles!fk_staff_profile (
        first_name,
        last_name
      )
    `)
    .eq('user_id', session.user.id)
    .order('unavailable_date', { ascending: true });

  // Fetch ALL driver unavailability (admin/dispatcher only)
  let allUnavailabilityData = [];
  if (isAdminOrDispatcher) {
    const { data: unavailData } = await supabase
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
    
    allUnavailabilityData = unavailData || [];
  }

  // Fetch my rides
  const { data: myRidesData } = await supabase
    .from('rides')
    .select('*')
    .eq('driver_user_id', session.user.id)
    .order('appointment_time', { ascending: true });

  // Fetch clients and staff for my rides
  let myRidesWithDetails = [];
  if (myRidesData && myRidesData.length > 0) {
    const clientIds = [...new Set(myRidesData.map(r => r.client_id).filter(Boolean))];
    const driverIds = [...new Set(myRidesData.map(r => r.driver_user_id).filter(Boolean))];
    const dispatcherIds = [...new Set(myRidesData.map(r => r.dispatcher_user_id).filter(Boolean))];
    const allUserIds = [...new Set([...driverIds, ...dispatcherIds])];
    
    const { data: clientsData } = await supabase
      .from('clients')
      .select('client_id, first_name, last_name, primary_phone')
      .in('client_id', clientIds);
    
    const { data: staffData } = await supabase
      .from('staff_profiles')
      .select('user_id, first_name, last_name')
      .in('user_id', allUserIds);
    
    const clientsMap = new Map(clientsData?.map(c => [c.client_id, c]) || []);
    const staffMap = new Map(staffData?.map(s => [s.user_id, s]) || []);
    
    myRidesWithDetails = myRidesData.map(ride => ({
      ...ride,
      clients: clientsMap.get(ride.client_id) || null,
      driver: staffMap.get(ride.driver_user_id) || null,
      dispatcher: staffMap.get(ride.dispatcher_user_id) || null
    }));
  }

  // Fetch ALL rides for organization (admin/dispatcher only)
  let allRidesWithDetails = [];
  if (isAdminOrDispatcher) {
    const { data: allRidesData } = await supabase
      .from('rides')
      .select('*')
      .eq('org_id', userProfile.org_id)
      .order('appointment_time', { ascending: true });
    
    if (allRidesData && allRidesData.length > 0) {
      const allClientIds = [...new Set(allRidesData.map(r => r.client_id).filter(Boolean))];
      const allDriverIds = [...new Set(allRidesData.map(r => r.driver_user_id).filter(Boolean))];
      const allDispatcherIds = [...new Set(allRidesData.map(r => r.dispatcher_user_id).filter(Boolean))];
      const allStaffIds = [...new Set([...allDriverIds, ...allDispatcherIds])];
      
      const { data: allClientsData } = await supabase
        .from('clients')
        .select('client_id, first_name, last_name, primary_phone')
        .in('client_id', allClientIds);
      
      const { data: allStaffData } = await supabase
        .from('staff_profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', allStaffIds);
      
      const allClientsMap = new Map(allClientsData?.map(c => [c.client_id, c]) || []);
      const allStaffMap = new Map(allStaffData?.map(s => [s.user_id, s]) || []);
      
      allRidesWithDetails = allRidesData.map(ride => ({
        ...ride,
        clients: allClientsMap.get(ride.client_id) || null,
        driver: allStaffMap.get(ride.driver_user_id) || null,
        dispatcher: allStaffMap.get(ride.dispatcher_user_id) || null
      }));
    }
  }

  return {
    myUnavailability: myUnavailabilityData || [],
    allUnavailability: allUnavailabilityData,
    myRides: myRidesWithDetails,
    allRides: allRidesWithDetails,
    userOrgId: userProfile.org_id,
    isAdminOrDispatcher,
    session
  };
};