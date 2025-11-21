import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.server';
import {
  canAccessPersonalReports,
  canAccessOrgReports,
  canExportReports
} from '$lib/utils/permissions';

export interface RideReportData {
  ride_id: number;
  client_name: string;
  driver_name: string;
  dispatcher_name: string;
  appointment_time: string;
  pickup_time: string | null;
  hours: number | null;
  miles_driven: number | null;
  donation_amount: number | null;
  status: string;
  alt_pickup_address: string | null;
  destination_name: string;
  dropoff_address: string;
  driver_user_id: string | null;
  client_id: number | null;
  created_at: string;
  completion_status: string | null;
  purpose: string;
}

export interface StaffProfile {
  user_id: string;
  first_name: string;
  last_name: string;
  role: string[];
}

export interface ClientProfile {
  client_id: number;
  first_name: string;
  last_name: string;
  gender?: string;
  date_of_birth?: string;
  lives_alone?: boolean;
}

export const load: PageServerLoad = async (event) => {
  const supabase = createSupabaseServerClient(event);
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) throw redirect(302, '/login');

  // Get user profile
  const { data: userProfile, error: profileError } = await supabase
    .from('staff_profiles')
    .select('*')
    .eq('user_id', session.user.id)
    .single();

  if (profileError) {
    console.error('Error fetching user profile:', profileError);
  }

  // Get user roles
  const userRoles = Array.isArray(userProfile?.role) 
    ? userProfile.role 
    : userProfile?.role ? [userProfile.role] : [];

  // Check if user has any reports access
  const hasPersonalAccess = canAccessPersonalReports(userRoles);
  const hasOrgAccess = canAccessOrgReports(userRoles);

  if (!hasPersonalAccess && !hasOrgAccess) {
    throw redirect(302, '/');
  }

  // Get organization
  const { data: organization } = await supabase
    .from('organization')
    .select('*')
    .eq('org_id', userProfile?.org_id)
    .single();

  let drivers: StaffProfile[] = [];
  let clients: ClientProfile[] = [];
  let allStaff: StaffProfile[] = [];

  // Only fetch org data if user has org reports access
  if (hasOrgAccess) {
    // Fetch drivers
    const { data: driversData } = await supabase
      .from('staff_profiles')
      .select('user_id, first_name, last_name, role')
      .contains('role', ['Driver'])
      .order('first_name');
    
    // Fetch clients with demographics data for reports
    const { data: clientsData } = await supabase
      .from('clients')
      .select('client_id, first_name, last_name, gender, date_of_birth, lives_alone')
      .eq('org_id', userProfile?.org_id)
      .order('first_name');

    // Fetch all staff
    const { data: allStaffData } = await supabase
      .from('staff_profiles')
      .select('user_id, first_name, last_name, role')
      .order('first_name');

    drivers = (driversData || []).map((d: any) => ({
      user_id: d.user_id,
      first_name: d.first_name || 'Unknown',
      last_name: d.last_name || '',
      role: d.role || []
    }));

    clients = clientsData || [];

    allStaff = (allStaffData || []).map((s: any) => ({
      user_id: s.user_id,
      first_name: s.first_name || 'Unknown',
      last_name: s.last_name || '',
      role: s.role || []
    }));
  }

  return {
    session,
    userProfile,
    organization,
    drivers,
    clients,
    allStaff,
    isAdmin: hasOrgAccess // Reuse for backward compatibility
  };
};

export const actions: Actions = {
  // Get driver's rides for personal report (past month)
  getPersonalDriverRides: async (event) => {
    const supabase = createSupabaseServerClient(event);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) return fail(401, { error: 'Unauthorized' });

    // Get user profile to check permissions
    const { data: userProfile } = await supabase
      .from('staff_profiles')
      .select('role')
      .eq('user_id', session.user.id)
      .single();

    const userRoles = Array.isArray(userProfile?.role) 
      ? userProfile.role 
      : [userProfile?.role];

    // Check if user has personal reports access
    if (!canAccessPersonalReports(userRoles)) {
      return fail(403, { error: 'You don\'t have permission to access personal reports' });
    }

    try {
      // Get rides from past month
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      
      const query = supabase
        .from('rides')
        .select('hours, miles_driven, ride_id, client_id, round_trip')
        .eq('driver_user_id', session.user.id)
        .eq('status', 'Completed')
        .gte('appointment_time', oneMonthAgo.toISOString());

      const { data: rides, error: ridesError } = await query;

      if (ridesError) {
        console.error('Error fetching rides:', ridesError);
        return fail(500, { error: 'Failed to fetch rides' });
      }

      // Calculate totals
      const totalHours = rides?.reduce((sum, r) => sum + (r.hours || 0), 0) || 0;
      const totalMiles = rides?.reduce((sum, r) => sum + (r.miles_driven || 0), 0) || 0;
      
      // Count one-way rides (round trip = 2 one-ways)
      const oneWayRides = rides?.reduce((sum, r) => {
        return sum + (r.round_trip ? 2 : 1);
      }, 0) || 0;
      
      // Count unique clients
      const uniqueClients = new Set(rides?.map(r => r.client_id).filter(Boolean)).size;

      return {
        success: true,
        personalAutoFill: {
          hours: totalHours,
          miles: totalMiles,
          rides: oneWayRides,
          clients: uniqueClients
        },
        message: `Loaded ${rides?.length || 0} completed rides from the past month`
      };
    } catch (err) {
      console.error('Error in getPersonalDriverRides:', err);
      return fail(500, { error: 'An unexpected error occurred' });
    }
  },

  fetchRides: async (event) => {
    const supabase = createSupabaseServerClient(event);
    const { request } = event;
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) return fail(401, { error: 'Unauthorized' });

    // Get user profile to check permissions
    const { data: userProfile } = await supabase
      .from('staff_profiles')
      .select('role')
      .eq('user_id', session.user.id)
      .single();

    const userRoles = Array.isArray(userProfile?.role) 
      ? userProfile.role 
      : [userProfile?.role];

    // Check if user has org reports access
    if (!canAccessOrgReports(userRoles)) {
      return fail(403, { error: 'You don\'t have permission to access organization reports' });
    }

    const formData = await request.formData();
    const filterType = formData.get('filterType') as string;
    const selectedId = formData.get('selectedId') as string;
    const fromDate = formData.get('fromDate') as string;
    const toDate = formData.get('toDate') as string;

    try {
      let query = supabase
        .from('rides')
        .select(`
          ride_id,
          client_id,
          driver_user_id,
          dispatcher_user_id,
          alt_pickup_address,
          dropoff_address,
          destination_name,
          appointment_time,
          pickup_time,
          status,
          hours,
          miles_driven,
          donation_amount,
          completion_status,
          purpose,
          created_at
        `)
        .eq('status', 'Completed')
        .order('appointment_time', { ascending: false });

      // Apply filter based on type
      if (filterType === 'driver' && selectedId && selectedId !== 'all') {
        query = query.eq('driver_user_id', selectedId);
      } else if (filterType === 'client' && selectedId && selectedId !== 'all') {
        query = query.eq('client_id', parseInt(selectedId));
      }

      // Apply date range filter
      if (fromDate) {
        query = query.gte('appointment_time', new Date(fromDate).toISOString());
      }
      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setDate(endDate.getDate() + 1);
        query = query.lt('appointment_time', endDate.toISOString());
      }

      const { data: ridesData, error: ridesError } = await query;

      if (ridesError) {
        console.error('Error fetching rides:', ridesError);
        return fail(500, { error: 'Failed to fetch rides data' });
      }

      // Fetch driver and client names
      const driverUserIds = [...new Set(ridesData?.map((r: any) => r.driver_user_id).filter(Boolean))];
      const clientIds = [...new Set(ridesData?.map((r: any) => r.client_id).filter(Boolean))];
      const dispatcherUserIds = [...new Set(ridesData?.map((r: any) => r.dispatcher_user_id).filter(Boolean))];

      const { data: driversData } = await supabase
        .from('staff_profiles')
        .select('user_id, first_name, last_name, role')
        .in('user_id', driverUserIds);

      const { data: dispatchersData } = await supabase
        .from('staff_profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', dispatcherUserIds);

      const { data: clientsData } = await supabase
        .from('clients')
        .select('client_id, first_name, last_name')
        .in('client_id', clientIds);

      // Create lookup maps
      const driverMap = new Map(
        (driversData || []).map((d: any) => [
          d.user_id,
          {
            name: `${d.first_name || ''} ${d.last_name || ''}`.trim() || 'Unknown Driver',
            role: d.role
          }
        ])
      );

      const dispatcherMap = new Map(
        (dispatchersData || []).map((d: any) => [
          d.user_id,
          `${d.first_name || ''} ${d.last_name || ''}`.trim() || 'Unknown Dispatcher'
        ])
      );

      const clientMap = new Map(
        (clientsData || []).map((c: any) => [
          c.client_id,
          `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown Client'
        ])
      );

      // Transform the data
      const rides: RideReportData[] = (ridesData || []).map((ride: any) => {
        const driverInfo = driverMap.get(ride.driver_user_id);
        return {
          ride_id: ride.ride_id,
          client_name: clientMap.get(ride.client_id) || 'Unknown Client',
          driver_name: driverInfo?.name || 'Unknown Driver',
          dispatcher_name: dispatcherMap.get(ride.dispatcher_user_id) || 'Unknown',
          appointment_time: ride.appointment_time,
          pickup_time: ride.pickup_time || null,
          hours: ride.hours || 0,
          miles_driven: ride.miles_driven || 0,
          donation_amount: ride.donation_amount || 0,
          status: ride.status,
          alt_pickup_address: ride.alt_pickup_address || '',
          destination_name: ride.destination_name || '',
          dropoff_address: ride.dropoff_address || '',
          driver_user_id: ride.driver_user_id,
          client_id: ride.client_id,
          created_at: ride.created_at,
          completion_status: ride.completion_status,
          purpose: ride.purpose || ''
        };
      });

      return {
        success: true,
        rides,
        driversData: driversData || [],
        message: `Found ${rides.length} completed ride${rides.length !== 1 ? 's' : ''}`
      };
    } catch (err) {
      console.error('Error in fetchRides action:', err);
      return fail(500, { error: 'An unexpected error occurred' });
    }
  }
};