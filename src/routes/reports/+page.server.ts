import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.server';

export interface RideReportData {
  ride_id: number;
  appointment_time: string;
  driver_name: string | null;
  client_name: string | null;
  client_id: number | null;
  alt_pickup_address: string | null;
  destination_name: string | null;
  dropoff_address: string | null;
  purpose: string | null;
  hours: number | null;
  miles_driven: number | null;
  donation_amount: number | null;
  completion_status: string | null;
}

export const load: PageServerLoad = async (event) => {
  const supabase = createSupabaseServerClient(event);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw redirect(302, '/login');
  }

  // Get user profile
  const { data: userProfile, error: profileError } = await supabase
    .from('staff_profiles')
    .select('*')
    .eq('user_id', session.user.id)
    .single();

  if (profileError || !userProfile) {
    console.error('Error fetching user profile:', profileError);
    return {
      session,
      userProfile: null,
      organization: null,
      drivers: [],
      clients: [],
      isAdmin: false
    };
  }

  // Check if user is admin
  const isAdmin = userProfile.role && (
    Array.isArray(userProfile.role)
      ? (userProfile.role.includes('Admin') || userProfile.role.includes('Super Admin'))
      : (userProfile.role === 'Admin' || userProfile.role === 'Super Admin')
  );

  // Get organization data
  const { data: organization } = await supabase
    .from('organization')
    .select('*')
    .eq('org_id', userProfile.org_id)
    .single();

  // Fetch drivers and clients for dropdowns (admin only)
  let drivers: any[] = [];
  let clients: any[] = [];

  if (isAdmin) {
    const { data: driversData } = await supabase
      .from('staff_profiles')
      .select('user_id, first_name, last_name')
      .eq('org_id', userProfile.org_id)
      .order('last_name', { ascending: true });

    // Fetch clients with demographics data for reports
    const { data: clientsData } = await supabase
      .from('clients')
      .select('client_id, first_name, last_name, gender, lives_alone, date_of_birth')
      .eq('org_id', userProfile.org_id)
      .order('last_name', { ascending: true });

    drivers = driversData || [];
    clients = clientsData || [];
  }

  return {
    session,
    userProfile,
    organization,
    drivers,
    clients,
    isAdmin
  };
};

export const actions: Actions = {
  // Fetch rides for organization reports (admin only)
  fetchRides: async (event) => {
    const supabase = createSupabaseServerClient(event);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await event.request.formData();
    const filterType = formData.get('filterType') as string;
    const selectedId = formData.get('selectedId') as string;
    const fromDate = formData.get('fromDate') as string;
    const toDate = formData.get('toDate') as string;

    // Get user's org_id
    const { data: userProfile } = await supabase
      .from('staff_profiles')
      .select('org_id, role')
      .eq('user_id', session.user.id)
      .single();

    if (!userProfile) {
      return fail(403, { error: 'User profile not found' });
    }

    // Check admin access
    const isAdmin = userProfile.role && (
      Array.isArray(userProfile.role)
        ? (userProfile.role.includes('Admin') || userProfile.role.includes('Super Admin'))
        : (userProfile.role === 'Admin' || userProfile.role === 'Super Admin')
    );

    if (!isAdmin) {
      return fail(403, { error: 'Admin access required' });
    }

    // Build query
    let query = supabase
      .from('rides')
      .select(`
        ride_id,
        appointment_time,
        alt_pickup_address,
        destination_name,
        dropoff_address,
        purpose,
        hours,
        miles_driven,
        donation_amount,
        completion_status,
        client_id,
        driver_user_id
      `)
      .eq('org_id', userProfile.org_id)
      .eq('status', 'Completed');

    // Apply filters
    if (filterType === 'driver' && selectedId) {
      query = query.eq('driver_user_id', selectedId);
    } else if (filterType === 'client' && selectedId) {
      query = query.eq('client_id', parseInt(selectedId));
    }

    // Apply date filters
    if (fromDate) {
      query = query.gte('appointment_time', `${fromDate}T00:00:00`);
    }
    if (toDate) {
      query = query.lte('appointment_time', `${toDate}T23:59:59`);
    }

    query = query.order('appointment_time', { ascending: false });

    const { data: rides, error } = await query;

    if (error) {
      console.error('Error fetching rides:', error);
      return fail(500, { error: 'Failed to fetch rides' });
    }

    // Fetch driver and client names
    const driverIds = [...new Set(rides?.map(r => r.driver_user_id).filter(Boolean))];
    const clientIds = [...new Set(rides?.map(r => r.client_id).filter(Boolean))];

    let driverMap = new Map();
    let clientMap = new Map();

    if (driverIds.length > 0) {
      const { data: driversData } = await supabase
        .from('staff_profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', driverIds);
      
      driversData?.forEach(d => {
        driverMap.set(d.user_id, `${d.first_name} ${d.last_name}`);
      });
    }

    if (clientIds.length > 0) {
      const { data: clientsData } = await supabase
        .from('clients')
        .select('client_id, first_name, last_name')
        .in('client_id', clientIds);
      
      clientsData?.forEach(c => {
        clientMap.set(c.client_id, `${c.first_name} ${c.last_name}`);
      });
    }

    // Map rides with names
    const ridesWithNames: RideReportData[] = (rides || []).map(ride => ({
      ride_id: ride.ride_id,
      appointment_time: ride.appointment_time,
      driver_name: driverMap.get(ride.driver_user_id) || null,
      client_name: clientMap.get(ride.client_id) || null,
      client_id: ride.client_id,
      alt_pickup_address: ride.alt_pickup_address,
      destination_name: ride.destination_name,
      dropoff_address: ride.dropoff_address,
      purpose: ride.purpose,
      hours: ride.hours,
      miles_driven: ride.miles_driven,
      donation_amount: ride.donation_amount,
      completion_status: ride.completion_status
    }));

    return {
      success: true,
      rides: ridesWithNames,
      message: ridesWithNames.length > 0 
        ? `Found ${ridesWithNames.length} completed ride(s)` 
        : 'No completed rides found for the selected criteria'
    };
  },

  // Get personal driver rides for auto-fill
  getPersonalDriverRides: async (event) => {
    const supabase = createSupabaseServerClient(event);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return fail(401, { error: 'Not authenticated' });
    }

    // Get rides from the past month
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const { data: rides, error } = await supabase
      .from('rides')
      .select(`
        ride_id,
        hours,
        miles_driven,
        client_id,
        completion_status
      `)
      .eq('driver_user_id', session.user.id)
      .eq('status', 'Completed')
      .gte('appointment_time', oneMonthAgo.toISOString());

    if (error) {
      console.error('Error fetching personal rides:', error);
      return fail(500, { error: 'Failed to fetch rides' });
    }

    // Calculate totals
    const totalHours = rides?.reduce((sum, r) => sum + (r.hours || 0), 0) || 0;
    const totalMiles = rides?.reduce((sum, r) => sum + (r.miles_driven || 0), 0) || 0;
    const uniqueClients = new Set(rides?.map(r => r.client_id).filter(Boolean)).size;
    
    // Count one-way trips (round trips count as 2)
    const oneWayTrips = rides?.reduce((count, r) => {
      if (r.completion_status === 'Completed Round Trip') {
        return count + 2;
      } else if (r.completion_status === 'Completed One Way To' || r.completion_status === 'Completed One Way From') {
        return count + 1;
      }
      return count;
    }, 0) || 0;

    return {
      success: true,
      personalAutoFill: {
        hours: totalHours,
        miles: totalMiles,
        clients: uniqueClients,
        rides: oneWayTrips
      },
      message: `Loaded ${rides?.length || 0} rides from the past month`
    };
  }
};