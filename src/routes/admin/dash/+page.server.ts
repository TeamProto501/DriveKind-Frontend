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
    return { tab: 'clients', data: [], error: 'No organization found for user.' };
  }

  const orgId = profile.org_id as number;
  const tab = event.url.searchParams.get('tab') ?? 'clients';

  // Helpers
  const isRoleArray = Array.isArray(profile.role);
  const roles: string[] = isRoleArray ? (profile.role as string[]) : (profile.role ? [String(profile.role)] : []);

  // --- Data per tab (all EQ org_id) ---
  try {
    if (tab === 'clients') {
      const { data, error } = await supabase
        .from('clients')
        .select('client_id, first_name, last_name, primary_phone, city, state, zip_code, org_id')
        .eq('org_id', orgId)
        .order('last_name', { ascending: true });
      if (error) throw error;
      return { tab, data: data ?? [], roles };
    }

    if (tab === 'drivers') {
      const { data, error } = await supabase
        .from('staff_profiles')
        .select('user_id, first_name, last_name, role, org_id')
        .eq('org_id', orgId)
        .contains('role', ['Driver']); // role is array<text>
      if (error) throw error;
      return { tab, data: data ?? [], roles };
    }

    if (tab === 'volunteer') {
      const { data, error } = await supabase
        .from('staff_profiles')
        .select('user_id, first_name, last_name, role, org_id')
        .eq('org_id', orgId)
        .contains('role', ['Volunteer']);
      if (error) throw error;
      return { tab, data: data ?? [], roles };
    }

    if (tab === 'dispatcher') {
      const { data, error } = await supabase
        .from('staff_profiles')
        .select('user_id, first_name, last_name, role, org_id')
        .eq('org_id', orgId)
        .contains('role', ['Dispatcher']);
      if (error) throw error;
      return { tab, data: data ?? [], roles };
    }

    // Default / "Queue" tab -> show rides in org (requested/scheduled/etc.)
    // You can tailor the selected fields as you like; keeping it table-friendly.
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

    return { tab: 'que', data: data ?? [], roles };
  } catch (err) {
    console.error('Admin dashboard scoped load error:', err);
    return { tab, data: [], roles, error: 'Failed to load dashboard data.' };
  }
};