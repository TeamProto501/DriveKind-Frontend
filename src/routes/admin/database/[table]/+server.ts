import { json } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.server';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
  const supabase = createSupabaseServerClient(event);
  
  const tableName = event.params.table;
  const orgId = event.url.searchParams.get('orgId');

  if (!orgId) {
    return json({ error: 'Missing orgId' }, { status: 400 });
  }

  console.log(`Fetching ${tableName} for org ${orgId}`);

  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('org_id', parseInt(orgId))
      .limit(1000);

    console.log(`Query result for ${tableName}:`, { 
      rowCount: data?.length || 0, 
      error: error?.message 
    });

    if (error) throw error;

    // Replace user/client IDs with names
    const enrichedData = await enrichWithNames(supabase, tableName, data || []);

    return json({ data: enrichedData });
  } catch (err: any) {
    console.error('Database fetch error:', err);
    return json({ error: err.message }, { status: 500 });
  }
};

async function enrichWithNames(supabase: any, tableName: string, data: any[]) {
  if (data.length === 0) return data;

  const idFields = ['driver_user_id', 'dispatcher_user_id', 'user_id', 'client_id'];
  const hasIdFields = idFields.some(field => field in data[0]);

  if (!hasIdFields) return data;

  // Collect all unique user IDs and client IDs
  const userIds = new Set<string>();
  const clientIds = new Set<number>();

  data.forEach(row => {
    if (row.driver_user_id) userIds.add(row.driver_user_id);
    if (row.dispatcher_user_id) userIds.add(row.dispatcher_user_id);
    if (row.user_id) userIds.add(row.user_id);
    if (row.client_id) clientIds.add(row.client_id);
  });

  // Fetch staff profiles
  const { data: staffProfiles } = await supabase
    .from('staff_profiles')
    .select('user_id, first_name, last_name')
    .in('user_id', Array.from(userIds));

  // Fetch clients
  const { data: clients } = await supabase
    .from('clients')
    .select('client_id, first_name, last_name')
    .in('client_id', Array.from(clientIds));

  // Create lookup maps
  const staffMap = new Map(staffProfiles?.map(s => [s.user_id, `${s.first_name} ${s.last_name}`]) || []);
  const clientMap = new Map(clients?.map(c => [c.client_id, `${c.first_name} ${c.last_name}`]) || []);

  // Replace IDs with names
  return data.map(row => {
    const enriched = { ...row };
    
    if (row.driver_user_id) {
      enriched.driver_name = staffMap.get(row.driver_user_id) || 'Unknown';
      delete enriched.driver_user_id;
    }
    if (row.dispatcher_user_id) {
      enriched.dispatcher_name = staffMap.get(row.dispatcher_user_id) || 'Unknown';
      delete enriched.dispatcher_user_id;
    }
    if (row.user_id && tableName !== 'staff_profiles') {
      enriched.user_name = staffMap.get(row.user_id) || 'Unknown';
      delete enriched.user_id;
    }
    if (row.client_id && tableName !== 'clients') {
      enriched.client_name = clientMap.get(row.client_id) || 'Unknown';
      delete enriched.client_id;
    }

    // Remove all other ID fields
    Object.keys(enriched).forEach(key => {
      if (key.endsWith('_id') || key === 'org_id') {
        delete enriched[key];
      }
    });

    return enriched;
  });
}