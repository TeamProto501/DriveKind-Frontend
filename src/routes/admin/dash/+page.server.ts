import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const load: PageServerLoad = async (event) => {
  const supabase = createSupabaseServerClient(event);

  // --- Auth ---
  const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr || !session) throw redirect(302, '/login');

  // --- Viewer profile / org ---
  const { data: profile, error: profileErr } = await supabase
    .from('staff_profiles')
    .select('user_id, org_id, role')
    .eq('user_id', session.user.id)
    .single();

  if (profileErr || !profile?.org_id) {
    return { 
      tab: 'clients', 
      data: [], 
      metrics: null,
      error: 'No organization found for user.' 
    };
  }

  const orgId = profile.org_id as number;
  const tab = event.url.searchParams.get('tab') ?? 'clients';

  // Helpers
  const isRoleArray = Array.isArray(profile.role);
  const roles: string[] = isRoleArray ? (profile.role as string[]) : (profile.role ? [String(profile.role)] : []);

  // --- Fetch metrics for dashboard cards ---
  const metrics = {
    totalUsers: 0,
    activeClients: 0,
    activeDrivers: 0,
    volunteers: 0,
    dispatchers: 0,
    pendingRides: 0,
    scheduledRides: 0,
    completedRidesThisMonth: 0,
    totalVehicles: 0
  };

  try {
    // Get all staff profiles count
    const { count: staffCount } = await supabase
      .from('staff_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId);
    
    // Get clients count
    const { count: clientCount } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId);
    
    // Get drivers count
    const { count: driverCount } = await supabase
      .from('staff_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .contains('role', ['Driver']);
    
    // Get volunteers count
    const { count: volunteerCount } = await supabase
      .from('staff_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .contains('role', ['Volunteer']);
    
    // Get dispatchers count
    const { count: dispatcherCount } = await supabase
      .from('staff_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .contains('role', ['Dispatcher']);
    
    // Get pending rides
    const { count: pendingCount } = await supabase
      .from('rides')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', 'Requested');
    
    // Get scheduled rides
    const { count: scheduledCount } = await supabase
      .from('rides')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .in('status', ['Scheduled', 'Assigned', 'In Progress']);
    
    // Get completed rides this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const { count: completedCount } = await supabase
      .from('rides')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', 'Completed')
      .gte('appointment_time', startOfMonth.toISOString());
    
    // Get vehicles count
    const { count: vehicleCount } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId);

    metrics.totalUsers = (staffCount || 0);
    metrics.activeClients = (clientCount || 0);
    metrics.activeDrivers = (driverCount || 0);
    metrics.volunteers = (volunteerCount || 0);
    metrics.dispatchers = (dispatcherCount || 0);
    metrics.pendingRides = (pendingCount || 0);
    metrics.scheduledRides = (scheduledCount || 0);
    metrics.completedRidesThisMonth = (completedCount || 0);
    metrics.totalVehicles = (vehicleCount || 0);

  } catch (err) {
    console.error('Error fetching metrics:', err);
  }

  // --- Data per tab (all EQ org_id) ---
  try {
    if (tab === 'clients') {
      const { data, error } = await supabase
        .from('clients')
        .select('client_id, first_name, last_name, primary_phone, city, state, zip_code, org_id')
        .eq('org_id', orgId)
        .order('last_name', { ascending: true });
      if (error) throw error;
      return { tab, data: data ?? [], roles, metrics };
    }

    if (tab === 'drivers') {
      const { data, error } = await supabase
        .from('staff_profiles')
        .select('user_id, first_name, last_name, role, org_id')
        .eq('org_id', orgId)
        .contains('role', ['Driver']);
      if (error) throw error;
      return { tab, data: data ?? [], roles, metrics };
    }

    if (tab === 'volunteer') {
      const { data, error } = await supabase
        .from('staff_profiles')
        .select('user_id, first_name, last_name, role, org_id')
        .eq('org_id', orgId)
        .contains('role', ['Volunteer']);
      if (error) throw error;
      return { tab, data: data ?? [], roles, metrics };
    }

    if (tab === 'dispatcher') {
      const { data, error } = await supabase
        .from('staff_profiles')
        .select('user_id, first_name, last_name, role, org_id')
        .eq('org_id', orgId)
        .contains('role', ['Dispatcher']);
      if (error) throw error;
      return { tab, data: data ?? [], roles, metrics };
    }

    // Default / "Queue" tab -> show rides in org
    const { data, error } = await supabase
      .from('rides')
      .select(`
        ride_id, org_id, client_id, driver_user_id, destination_name,
        dropoff_city, dropoff_state, dropoff_zipcode,
        appointment_time, pickup_time, status, purpose, riders
      `)
      .eq('org_id', orgId)
      .order('appointment_time', { ascending: true });
    if (error) throw error;

    return { tab: 'que', data: data ?? [], roles, metrics };
  } catch (err) {
    console.error('Admin dashboard scoped load error:', err);
    return { tab, data: [], roles, metrics, error: 'Failed to load dashboard data.' };
  }
};