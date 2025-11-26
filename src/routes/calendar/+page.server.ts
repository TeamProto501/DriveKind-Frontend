// src/routes/calendar/+page.server.ts
import { createSupabaseServerClient } from '$lib/supabase.server';
import { error, redirect } from '@sveltejs/kit';

// Helper function to expand recurring unavailability
function expandRecurringUnavailability(unavail: any[]): any[] {
  if (!unavail || !Array.isArray(unavail)) {
    console.warn('expandRecurringUnavailability received invalid input:', unavail);
    return [];
  }

  const expanded: any[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  unavail.forEach(item => {
    if (!item) {
      console.warn('Skipping null/undefined item in unavailability');
      return;
    }

    // Handle "Weekly" recurring type (your new schema)
    if (item.unavailability_type === 'Weekly' && item.days_of_week && Array.isArray(item.days_of_week)) {
      const startDate = new Date(today);
      const endDate = item.end_date ? new Date(item.end_date) : new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000);
      
      let currentDate = new Date(startDate);
      const maxIterations = 365;
      let iterations = 0;

      while (currentDate <= endDate && iterations < maxIterations) {
        iterations++;
        
        const dayOfWeek = currentDate.getDay();
        if (item.days_of_week.includes(dayOfWeek)) {
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
      return;
    }
    
    // Handle "Date Range" type
    if (item.unavailability_type === 'Date Range' && item.start_date && item.end_date) {
      const startDate = new Date(item.start_date);
      const endDate = new Date(item.end_date);
      
      // Only show if not completely in the past
      if (endDate >= today) {
        let currentDate = new Date(Math.max(startDate.getTime(), today.getTime()));
        
        while (currentDate <= endDate) {
          expanded.push({
            ...item,
            id: `${item.id}-${currentDate.toISOString().split('T')[0]}`,
            unavailable_date: currentDate.toISOString().split('T')[0],
            is_range_instance: true,
            original_id: item.id
          });
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
      return;
    }
    
    // Handle "One-Time" type (single date)
    if (item.unavailability_type === 'One-Time' && item.start_date) {
      const eventDate = new Date(item.start_date);
      if (eventDate >= today) {
        expanded.push({
          ...item,
          unavailable_date: item.start_date  // Map start_date to unavailable_date for the calendar
        });
      }
      return;
    }
    
    // Fallback for any other format
    if (item.start_date) {
      const eventDate = new Date(item.start_date);
      if (eventDate >= today) {
        expanded.push({
          ...item,
          unavailable_date: item.start_date
        });
      }
    }
  });

  console.log(`Expanded ${unavail.length} items to ${expanded.length} events`);
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
  const { data: myUnavailabilityRaw, error: myUnavailError } = await supabase
    .from('driver_unavailability')
    .select('*')
    .eq('user_id', session.user.id)
    .order('start_date', { ascending: true });

  if (myUnavailError) {
    console.error('Error fetching my unavailability:', myUnavailError);
  }

  const { data: myStaffProfile } = await supabase
    .from('staff_profiles')
    .select('user_id, first_name, last_name')
    .eq('user_id', session.user.id)
    .single();

  const myUnavailabilityExpanded = expandRecurringUnavailability(myUnavailabilityRaw || []);
  
  const myUnavailabilityData = myUnavailabilityExpanded.map(item => ({
    ...item,
    staff_profiles: myStaffProfile
  }));

  // Fetch ALL driver unavailability
  let allUnavailabilityData: any[] = [];
  if (isAdminOrDispatcher) {
    const { data: allUnavailRaw, error: allUnavailError } = await supabase
      .from('driver_unavailability')
      .select('*')
      .order('start_date', { ascending: true });

    if (allUnavailError) {
      console.error('Error fetching all unavailability:', allUnavailError);
    }

    if (allUnavailRaw && allUnavailRaw.length > 0) {
      const allUnavailExpanded = expandRecurringUnavailability(allUnavailRaw);
      
      const userIds = [...new Set(allUnavailExpanded.map(u => u.user_id).filter(Boolean))];
      
      const { data: staffProfiles } = await supabase
        .from('staff_profiles')
        .select('user_id, first_name, last_name, org_id')
        .in('user_id', userIds)
        .eq('org_id', userProfile.org_id);

      const staffMap = new Map(staffProfiles?.map(s => [s.user_id, s]) || []);

      allUnavailabilityData = allUnavailExpanded
        .filter(item => staffMap.has(item.user_id))
        .map(item => ({
          ...item,
          staff_profiles: staffMap.get(item.user_id)
        }));
    }
  }

  // Fetch my rides - only Scheduled and In Progress for drivers; add Requested/Pending for admins
  const myRidesStatusFilter = isAdminOrDispatcher 
    ? ['Scheduled', 'In Progress', 'Requested', 'Pending']
    : ['Scheduled', 'In Progress'];

  const { data: myRidesData } = await supabase
    .from('rides')
    .select('*')
    .eq('driver_user_id', session.user.id)
    .in('status', myRidesStatusFilter)
    .order('appointment_time', { ascending: true });

  let myRidesWithDetails: any[] = [];
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

  // Fetch ALL rides for organization - only relevant statuses
  let allRidesWithDetails: any[] = [];
  if (isAdminOrDispatcher) {
    const { data: allRidesData } = await supabase
      .from('rides')
      .select('*')
      .eq('org_id', userProfile.org_id)
      .in('status', ['Scheduled', 'In Progress', 'Requested', 'Pending'])
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
    allUnavailability: allUnavailabilityData || [],
    myRides: myRidesWithDetails || [],
    allRides: allRidesWithDetails || [],
    userOrgId: userProfile.org_id,
    isAdminOrDispatcher,
    session
  };
};