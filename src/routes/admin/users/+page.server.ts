// src/routes/admin/users/+page.server.ts
import { API_BASE_URL } from "$lib/api";
import { error, redirect } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const load = async (event) => {
  const tab = event.url.searchParams.get("tab") ?? "clients";

  try {
    // Get Supabase session instead of using authenticatedFetch
    const supabase = createSupabaseServerClient(event);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      console.log('No Supabase session found, redirecting to login');
      throw redirect(302, '/login');
    }

    console.log('Fetching staff profiles with Supabase token');
    
    // Use the Supabase access token directly
    const res = await fetch(`${API_BASE_URL}/staff-profiles`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      }
    });

    if (!res.ok) {
      console.error(`API returned ${res.status}: ${res.statusText}`);
      const errorText = await res.text();
      console.error('Error response body:', errorText);
      
      // If unauthorized, redirect to login
      if (res.status === 401 || res.status === 403) {
        throw redirect(302, '/login');
      }
      
      throw error(res.status, `Failed to fetch staff profiles: ${res.statusText}`);
    }

    const text = await res.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error("Failed to parse JSON:", text);
      throw error(500, "Invalid API response format");
    }

    if (!Array.isArray(data)) {
      console.error("Expected array but got:", typeof data);
      throw error(500, "API returned unexpected data format");
    }

    return { 
      tab, 
      staffProfiles: data 
    };

  } catch (err) {
    console.error("Error in load function:", err);
    
    // Handle redirect errors
    if (err.status === 302) {
      throw err;
    }
    
    // If it's already a SvelteKit error, re-throw it
    if (err.status) {
      throw err;
    }
    
    throw error(500, `Failed to load staff profiles: ${err.message}`);
  }
};


