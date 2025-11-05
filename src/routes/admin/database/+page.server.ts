import { createSupabaseServerClient } from '$lib/supabase.server';
import { error, redirect } from '@sveltejs/kit';

export const load = async (event) => {
  const supabase = createSupabaseServerClient(event);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw redirect(302, '/login');
  }

  const { data: userProfile } = await supabase
    .from('staff_profiles')
    .select('org_id')
    .eq('user_id', session.user.id)
    .single();

  if (!userProfile) {
    throw error(403, 'User profile not found');
  }

  // Fetch org name
  const { data: org } = await supabase
    .from('organization')
    .select('name')
    .eq('org_id', userProfile.org_id)
    .single();

  const tables = [
    { name: 'staff_profiles', display: 'Staff Profiles', icon: 'users' },
    { name: 'clients',        display: 'Clients',        icon: 'user'  },
    { name: 'rides',          display: 'Rides',          icon: 'car'   },
    { name: 'vehicles',       display: 'Vehicles',       icon: 'truck' },
    { name: 'calls',          display: 'Calls',          icon: 'phone' },
    { name: 'destinations',   display: 'Destinations',   icon: 'map'   }
  ];
  
  const tableData = await Promise.all(
    tables.map(async (table) => {
      const { count, error } = await supabase
        .from(table.name)
        .select('*', { count: 'exact', head: true })
        .eq('org_id', userProfile.org_id);

      return {
        ...table,
        records: count || 0,
        error: error?.message
      };
    })
  );

  return {
    tables: tableData,
    userOrgId: userProfile.org_id,
    orgName: org?.name || 'Unknown Organization',
    session
  };
};