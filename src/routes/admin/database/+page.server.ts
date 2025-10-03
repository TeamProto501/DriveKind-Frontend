// src/routes/admin/database/+page.server.ts
import { createSupabaseServerClient } from '$lib/supabase.server';
import { error, redirect } from '@sveltejs/kit';

export const load = async (event) => {
  const supabase = createSupabaseServerClient(event);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw redirect(302, '/login');
  }

  // Get user's org_id from their staff profile
  const { data: userProfile } = await supabase
    .from('staff_profiles')
    .select('org_id')
    .eq('user_id', session.user.id)
    .single();

  if (!userProfile) {
    throw error(403, 'User profile not found');
  }

  // Get table information (this is simplified - you'd need to query pg_catalog for real table stats)
  const tables = ['staff_profiles', 'rides', 'organizations', 'audit_logs'];
  
  const tableData = await Promise.all(
    tables.map(async (tableName) => {
      // Count records in this org
      const { count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })
        .eq('org_id', userProfile.org_id);

      return {
        name: tableName,
        records: count || 0,
        org_id: userProfile.org_id
      };
    })
  );

  return {
    tables: tableData,
    userOrgId: userProfile.org_id,
    session
  };
};