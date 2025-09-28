// src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const load: LayoutServerLoad = async (event) => {
  const supabase = createSupabaseServerClient(event);

  try {
    const {
      data: { session },
      error: sessionError
    } = await supabase.auth.getSession();

    if (sessionError && !sessionError.message?.includes('Auth session missing')) {
      console.error('Error getting session:', sessionError);
    }

    let roles: string[] = [];

    if (session?.user) {
      // 🔑 Fetch staff profile roles tied to this user
      const { data: profile, error: profileError } = await supabase
        .from('staff_profiles')
        .select('role')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching staff profile:', profileError);
      } else if (profile?.role) {
        roles = profile.role; // this is already role_enum[]
      }
    }

    return {
      session,
      roles
    };
  } catch (error) {
    console.error('Unexpected session error:', error);
    return {
      session: null,
      roles: []
    };
  }
};