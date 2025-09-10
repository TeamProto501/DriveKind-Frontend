import { json } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.server';
import type { RequestEvent } from '@sveltejs/kit';

export async function POST(event: RequestEvent) {
  const supabase = createSupabaseServerClient(event);
  
  try {
    // Sign out the user
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Logout error:', error);
      return json({ error: 'Logout failed' }, { status: 500 });
    }
    
    // Return success response
    return json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return json({ error: 'Logout failed' }, { status: 500 });
  }
}
