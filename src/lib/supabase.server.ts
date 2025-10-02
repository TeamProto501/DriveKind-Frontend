// src/lib/supabase.server.ts
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import type { RequestEvent } from '@sveltejs/kit';

export function createSupabaseServerClient(event: RequestEvent) {
  console.log('SUPABASE_URL:', PUBLIC_SUPABASE_URL);
  console.log('ANON_KEY (first 20 chars):', SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20));
  return createServerClient(
    PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY, // Use service role key for admin operations
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