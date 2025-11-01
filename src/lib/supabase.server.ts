// src/lib/supabase.server.ts
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import type { RequestEvent } from '@sveltejs/kit';

export function createSupabaseServerClient(event: RequestEvent) {
  return createServerClient(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY, // Use anon key for client operations
    {
      cookies: {
        get: (key) => event.cookies.get(key),
        set: (key, value, options) => {
          event.cookies.set(key, value, { ...options, path: '/' });
        },
        remove: (key, options) => {
          event.cookies.delete(key, { ...options, path: '/' });
        }
      }
    }
  );
}

/**
 * Create an admin Supabase client with service role key
 * This bypasses RLS policies and should only be used for admin operations
 */
export function createSupabaseAdminClient() {
  // Try to get service role key from environment
  // It might be in $env/static/private or $env/dynamic/private
  let serviceRoleKey: string | undefined;
  
  try {
    serviceRoleKey = SUPABASE_SERVICE_ROLE_KEY;
  } catch (e) {
    // Try dynamic import as fallback
    try {
      const env = await import('$env/dynamic/private');
      serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
    } catch (e2) {
      // Last resort - check process.env
      serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    }
  }
  
  if (!serviceRoleKey) {
    console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not found. Admin operations may fail due to RLS.');
    console.warn('⚠️ Please set SUPABASE_SERVICE_ROLE_KEY in your .env file');
    // Still try to proceed, but it will likely fail
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set in environment variables. Please add it to your .env file.');
  }
  
  return createClient(PUBLIC_SUPABASE_URL, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}