// src/routes/admin/users/+page.server.ts
import { authenticatedFetch, API_BASE_URL } from "$lib/api";
import { error } from '@sveltejs/kit';

export const load = async (event) => {
  const tab = event.url.searchParams.get("tab") ?? "clients";

  try {
    console.log('Fetching staff profiles from:', `${API_BASE_URL}/staff-profiles`);
    
    const res = await authenticatedFetch(
      `${API_BASE_URL}/staff-profiles`,
      {},
      undefined,
      event
    );

    console.log('Response status:', res.status);
    console.log('Response headers:', Object.fromEntries(res.headers.entries()));

    // Check if the response is ok
    if (!res.ok) {
      console.error(`API returned ${res.status}: ${res.statusText}`);
      const errorText = await res.text();
      console.error('Error response body:', errorText);
      
      throw error(res.status, `Failed to fetch staff profiles: ${res.statusText}`);
    }

    const text = await res.text();
    console.log('Raw response text:', text.substring(0, 200) + '...');

    let data;
    try {
      data = JSON.parse(text);
      console.log('Parsed data length:', Array.isArray(data) ? data.length : 'Not an array');
    } catch (parseError) {
      console.error("Failed to parse JSON:", text);
      console.error("Parse error:", parseError);
      throw error(500, "Invalid API response format from /staff-profiles");
    }

    // Validate the data structure
    if (!Array.isArray(data)) {
      console.error("Expected array but got:", typeof data);
      throw error(500, "API returned unexpected data format");
    }

    // Ensure each staff profile has the expected structure
    const validatedProfiles = data.map(profile => ({
      user_id: profile.user_id || '',
      first_name: profile.first_name || '',
      last_name: profile.last_name || '',
      email: profile.email || undefined,
      primary_phone: profile.primary_phone || undefined,
      role: profile.role || [],
      city: profile.city || undefined,
      state: profile.state || undefined,
    }));

    console.log('Successfully loaded', validatedProfiles.length, 'staff profiles');

    return { 
      tab, 
      staffProfiles: validatedProfiles 
    };

  } catch (err) {
    console.error("Error in load function:", err);
    
    // If it's already a SvelteKit error, re-throw it
    if (err.status) {
      throw err;
    }
    
    // Otherwise, wrap in a generic 500 error
    throw error(500, `Failed to load staff profiles: ${err.message}`);
  }
};



