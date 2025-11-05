import { json } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.server';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, url, locals }) => {
  const supabase = createSupabaseServerClient({ locals, cookies: { get: () => null, set: () => {}, delete: () => {} } } as any);
  
  const tableName = params.table;
  const orgId = url.searchParams.get('orgId');

  if (!orgId) {
    return json({ error: 'Missing orgId' }, { status: 400 });
  }

  try {
    // Service role bypasses RLS
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('org_id', parseInt(orgId))
      .limit(1000);

    if (error) throw error;

    return json({ data });
  } catch (err: any) {
    return json({ error: err.message }, { status: 500 });
  }
};