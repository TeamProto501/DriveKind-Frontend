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

    return json({ data: data || [] });
  } catch (err: any) {
    console.error('Database fetch error:', err);
    return json({ error: err.message }, { status: 500 });
  }
};