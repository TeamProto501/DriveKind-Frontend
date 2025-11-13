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

    // For OLD schema (repeating_day)
    if (item.repeating_day && !item.recurring) {
      const dayMap: Record<string, number> = {
        'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
        'Thursday': 4, 'Friday': 5, 'Saturday': 6
      };
      
      const targetDayOfWeek = dayMap[item.repeating_day];
      
      if (targetDayOfWeek === undefined) {
        console.warn('Invalid repeating_day:', item.repeating_day);
        return;
      }
      
      const startDate = new Date(today);
      const endDate = new Date(today);
      endDate.setFullYear(endDate.getFullYear() + 1);
      
      let currentDate = new Date(startDate);
      const maxIterations = 365;
      let iterations = 0;

      while (currentDate <= endDate && iterations < maxIterations) {
        iterations++;
        
        if (currentDate.getDay() === targetDayOfWeek) {
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
    
    // For NEW schema (recurring = true)
    if (item.recurring) {
      if (!item.unavailable_date) {
        console.warn('Recurring item missing unavailable_date:', item);
        return;
      }

      const recordStartDate = new Date(item.unavailable_date);
      const startDate = recordStartDate > today ? recordStartDate : today;
      
      const endDate = item.recurrence_end_date 
        ? new Date(item.recurrence_end_date)
        : new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);
      
      if (endDate < today) {
        return;
      }
      
      const pattern = item.recurrence_pattern || 'weekly';
      const daysOfWeek = item.days_of_week || [startDate.getDay()];
      
      let currentDate = new Date(startDate);
      const maxIterations = 365;
      let iterations = 0;

      while (currentDate <= endDate && iterations < maxIterations) {
        iterations++;
        
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
      return;
    }
    
    // Non-recurring events: only show if not in the past and has valid date
    if (item.unavailable_date) {
      const eventDate = new Date(item.unavailable_date);
      if (eventDate >= today) {
        expanded.push(item);
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
    .order('unavailable_date', { ascending: true });

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
      .order('unavailable_date', { ascending: true });

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

  // Fetch my rides
  const { data: myRidesData } = await supabase
    .from('rides')
    .select('*')
    .eq('driver_user_id', session.user.id)
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

  // Fetch ALL rides for organization
  let allRidesWithDetails: any[] = [];
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