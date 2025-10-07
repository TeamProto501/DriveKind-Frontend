import { writable, type Writable } from 'svelte/store';
import { supabase } from '$lib/supabase';
import type { AuthInfo } from './types'; // Import from types

export const authStore: Writable<AuthInfo | null> = writable(null);

// --- Initialize store ---
async function initAuth() {
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user) {
    authStore.set({ 
      token: session.access_token,
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      user: session.user,
      userId: session.user.id
    });
  }

  // Listen for future auth state changes
  supabase.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      authStore.set({ 
        token: session.access_token,
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        user: session.user,
        userId: session.user.id
      });
    } else {
      authStore.set(null);
    }
  });
}

initAuth();