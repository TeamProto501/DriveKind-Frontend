import { json } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.server';
import type { RequestEvent } from '@sveltejs/kit';

export async function POST(event: RequestEvent) {
  const supabase = createSupabaseServerClient(event);
  
  try {
    // Try to sign out - this will work even if no session exists
    const { error } = await supabase.auth.signOut();
    
    // Don't fail on "Auth session missing" - that just means user is already logged out
    if (error && !error.message?.includes('Auth session missing')) {
      console.error('Logout error:', error);
    }
    
    // Always return success - whether user was logged out or already logged out
    return json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    // Even if there's an error, we should still redirect to login
    return json({ success: true });
  }
}
