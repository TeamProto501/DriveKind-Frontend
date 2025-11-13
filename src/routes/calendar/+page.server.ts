// src/routes/schedule/+page.server.ts
import { createSupabaseServerClient } from '$lib/supabase.server';
import { error, redirect } from '@sveltejs/kit';

// Helper function to expand recurring unavailability
function expandRecurringUnavailability(unavail: any[]): any[] {
  const expanded: any[] = [];
  
  unavail.forEach(item => {
    if (!item.recurring) {
      // Non-recurring, add as-is
      expanded.push(item);
      return;
    }

    // Expand recurring unavailability
    const startDate = new Date(item.unavailable_date);
    const endDate = item.recurrence_end_date 
      ? new Date(item.recurrence_end_date)
      : new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000); // Default 1 year
    
    const pattern = item.recurrence_pattern || 'weekly';
    const daysOfWeek = item.days_of_week || [startDate.getDay()];
    
    let currentDate = new Date(startDate);
    const maxIterations = 365; // Safety limit
    let iterations = 0;

    while (currentDate <= endDate && iterations < maxIterations) {
      iterations++;
      
      // Check if current day matches pattern
      if (pattern === 'daily') {
        expanded.push({
          ...item,
          id: `${item.id}-${currentDate.toISOString().split('T')[0]}`,
          unavailable_date: currentDate.toISOString().split('T')[0],
          is_recurring_instance: true,
          original_id: item.id
        });
        currentDate.setDate(currentDate.getDate() + 1);
      } else if (pattern === 'weekly') {
        const dayOfWeek = currentDate.getDay();
        if (daysOfWeek.includes(dayOfWeek)) {
          expanded.push({
            ...item,
            id: `${item.id}-${currentDate.toISOString().split('T')[0]}`,
            unavailable_date: currentDate.toISOString().split('T')[0],
            is_recurring_instance: true,
            original_id: item.id
          });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      } else if (pattern === 'monthly') {
        if (currentDate.getDate() === startDate.getDate()) {
          expanded.push({
            ...item,
            id: `${item.id}-${currentDate.toISOString().split('T')[0]}`,
            unavailable_date: currentDate.toISOString().split('T')[0],
            is_recurring_instance: true,
            original_id: item.id
          });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
  });

  return expanded;
}

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

  // Fetch MY unavailability
  const { data: myUnavailabilityRaw } = await supabase
    .from('driver_unavailability')
    .select('*')
    .eq('user_id', session.user.id)
    .order('unavailable_date', { ascending: true });

  console.log('My unavailability raw:', myUnavailabilityRaw);

  // Fetch staff profile for current user
  const { data: myStaffProfile } = await supabase
    .from('staff_profiles')
    .select('user_id, first_name, last_name')
    .eq('user_id', session.user.id)
    .single();

  // Expand recurring unavailability
  const myUnavailabilityExpanded = expandRecurringUnavailability(myUnavailabilityRaw || []);
  
  const myUnavailabilityData = myUnavailabilityExpanded.map(item => ({
    ...item,
    staff_profiles: myStaffProfile
  }));

  console.log('My unavailability expanded:', myUnavailabilityData.length);

  // Fetch ALL driver unavailability (admin/dispatcher only)
  let allUnavailabilityData = [];
  if (isAdminOrDispatcher) {
    const { data: allUnavailRaw } = await supabase
      .from('driver_unavailability')
      .select('*')
      .order('unavailable_date', { ascending: true });

    console.log('All unavail raw:', allUnavailRaw?.length || 0);

    if (allUnavailRaw && allUnavailRaw.length > 0) {
      // Expand recurring unavailability
      const allUnavailExpanded = expandRecurringUnavailability(allUnavailRaw);
      
      // Get unique user_ids
      const userIds = [...new Set(allUnavailExpanded.map(u => u.user_id).filter(Boolean))];
      
      // Fetch staff profiles for these users in the org
      const { data: staffProfiles } = await supabase
        .from('staff_profiles')
        .select('user_id, first_name, last_name, org_id')
        .in('user_id', userIds)
        .eq('org_id', userProfile.org_id);

      console.log('Staff profiles fetched:', staffProfiles?.length || 0);

      const staffMap = new Map(staffProfiles?.map(s => [s.user_id, s]) || []);

      // Only include unavailability for users in this org
      allUnavailabilityData = allUnavailExpanded
        .filter(item => staffMap.has(item.user_id))
        .map(item => ({
          ...item,
          staff_profiles: staffMap.get(item.user_id)
        }));

      console.log('All unavail expanded with profiles:', allUnavailabilityData.length);
    }
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
      .order('appointment_time', { ascending: true});
    
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

  console.log('Returning data:', {
    myUnavail: myUnavailabilityData.length,
    allUnavail: allUnavailabilityData.length,
    myRides: myRidesWithDetails.length,
    allRides: allRidesWithDetails.length
  });

  return {
    myUnavailability: myUnavailabilityData,
    allUnavailability: allUnavailabilityData,
    myRides: myRidesWithDetails,
    allRides: allRidesWithDetails,
    userOrgId: userProfile.org_id,
    isAdminOrDispatcher,
    session
  };
};