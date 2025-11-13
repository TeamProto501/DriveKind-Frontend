import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.server';

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
}

export const load: PageServerLoad = async (event) => {
  const supabase = createSupabaseServerClient(event);

  // Fetch all staff with Driver role
  const { data: staffData, error: staffError } = await supabase
    .from('staff_profiles')
    .select('user_id, first_name, last_name, role')
    .contains('role', ['Driver']);

  if (staffError) {
    console.error('Error fetching drivers:', staffError);
    error(500, 'Failed to load drivers');
  }

  // Transform staff data to driver format
  const drivers: StaffProfile[] = (staffData || []).map((s: any) => ({
    user_id: s.user_id,
    first_name: s.first_name || 'Unknown',
    last_name: s.last_name || 'Driver',
    role: s.role || []
  }));

  // Fetch all clients
  const { data: clientsData, error: clientsError } = await supabase
    .from('clients')
    .select('client_id, first_name, last_name');

  if (clientsError) {
    console.error('Error fetching clients:', clientsError);
    error(500, 'Failed to load clients');
  }

  const clients: ClientProfile[] = clientsData || [];

  // Fetch all dispatchers (staff with Dispatcher role)
  const { data: dispatchersData, error: dispatchersError } = await supabase
    .from('staff_profiles')
    .select('user_id, first_name, last_name, role')
    .contains('role', ['Dispatcher']);

  if (dispatchersError) {
    console.error('Error fetching dispatchers:', dispatchersError);
  }

  const dispatchers: StaffProfile[] = (dispatchersData || []).map((s: any) => ({
    user_id: s.user_id,
    first_name: s.first_name || 'Unknown',
    last_name: s.last_name || 'Dispatcher',
    role: s.role || []
  }));

  return {
    drivers,
    clients,
    dispatchers
  };
};

export const actions: Actions = {
  fetchRides: async (event) => {
    const supabase = createSupabaseServerClient(event);
    const { request } = event;
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
      // 'organization' type doesn't need additional filtering (shows all)

      // Apply date range filter
      if (fromDate) {
        query = query.gte('appointment_time', new Date(fromDate).toISOString());
      }
      if (toDate) {
        // Add one day to include the entire end date
        const endDate = new Date(toDate);
        endDate.setDate(endDate.getDate() + 1);
        query = query.lt('appointment_time', endDate.toISOString());
      }

      const { data: ridesData, error: ridesError } = await query;

      if (ridesError) {
        console.error('Error fetching rides:', ridesError);
        return fail(500, { error: 'Failed to fetch rides data' });
      }

      // Fetch driver and client names for all rides
      const driverUserIds = [...new Set(ridesData?.map((r: any) => r.driver_user_id).filter(Boolean))];
      const clientIds = [...new Set(ridesData?.map((r: any) => r.client_id).filter(Boolean))];
      const dispatcherUserIds = [...new Set(ridesData?.map((r: any) => r.dispatcher_user_id).filter(Boolean))];

      // Fetch drivers
      const { data: driversData } = await supabase
        .from('staff_profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', driverUserIds);

      // Fetch dispatchers
      const { data: dispatchersData } = await supabase
        .from('staff_profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', dispatcherUserIds);

      // Fetch clients
      const { data: clientsData } = await supabase
        .from('clients')
        .select('client_id, first_name, last_name')
        .in('client_id', clientIds);

      // Create lookup maps
      const driverMap = new Map(
        (driversData || []).map((d: any) => [
          d.user_id,
          `${d.first_name || ''} ${d.last_name || ''}`.trim() || 'Unknown Driver'
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
        return {
          ride_id: ride.ride_id,
          client_name: clientMap.get(ride.client_id) || 'Unknown Client',
          driver_name: driverMap.get(ride.driver_user_id) || 'Unknown Driver',
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
        message: `Found ${rides.length} completed ride${rides.length !== 1 ? 's' : ''}`
      };
    } catch (err) {
      console.error('Error in fetchRides action:', err);
      return fail(500, { error: 'An unexpected error occurred' });
    }
  }
};
