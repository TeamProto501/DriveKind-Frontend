// src/routes/profile/+page.server.ts (or wherever your profile route is)
import { error, redirect, fail } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.server';
import { API_BASE_URL } from '$lib/api';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async (event) => {
  try {
    // Get Supabase session
    const supabase = createSupabaseServerClient(event);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      console.log('No Supabase session found, redirecting to login');
      throw redirect(302, '/login');
    }

    // Get the user ID from the session
    const userId = session.user.id;
    
    console.log('Fetching profile for user:', userId);

    // Fetch the staff profile
    const res = await fetch(`${API_BASE_URL}/staff-profiles/${userId}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      }
    });

    if (!res.ok) {
      console.error(`Profile API returned ${res.status}: ${res.statusText}`);
      
      if (res.status === 404) {
        // Profile doesn't exist, could create a default one or show a message
        return { profile: null, userId };
      }
      
      if (res.status === 401 || res.status === 403) {
        throw redirect(302, '/login');
      }
      
      throw error(res.status, `Failed to fetch profile: ${res.statusText}`);
    }

    const profile = await res.json();
    console.log('Successfully loaded profile for user:', userId);

    return { 
      profile,
      userId,
      session: {
        access_token: session.access_token,
        user: session.user
      }
    };

  } catch (err) {
    console.error("Error in profile load function:", err);
    
    if (err.status === 302) {
      throw err;
    }
    
    if (err.status) {
      throw err;
    }
    
    throw error(500, `Failed to load profile: ${err.message}`);
  }
};

export const actions: Actions = {
  updateProfile: async (event) => {
    try {
      // Get Supabase session
      const supabase = createSupabaseServerClient(event);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw redirect(302, '/login');
      }

      const formData = await event.request.formData();
      const userId = session.user.id;

      // Extract form data
      const profileData = {
        user_id: userId,
        first_name: formData.get('first_name')?.toString() || '',
        last_name: formData.get('last_name')?.toString() || '',
        email: formData.get('email')?.toString() || '',
        primary_phone: formData.get('primary_phone')?.toString() || '',
        dob: formData.get('dob')?.toString() || '',
        home_address: formData.get('home_address')?.toString() || '',
        city: formData.get('city')?.toString() || '',
        state: formData.get('state')?.toString() || '',
        zip_code: formData.get('zip_code')?.toString() || '',
        contact_type_pref: formData.get('contact_type_pref')?.toString() || '',
        // Don't allow role changes from profile page unless admin
      };

      console.log('Updating profile for user:', userId);

      // Update the staff profile
      const res = await fetch(`${API_BASE_URL}/staff-profiles/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(profileData)
      });

      if (!res.ok) {
        console.error(`Profile update API returned ${res.status}: ${res.statusText}`);
        const errorText = await res.text();
        console.error('Error response body:', errorText);
        
        return fail(res.status, {
          error: `Failed to update profile: ${res.statusText}`,
          formData: profileData
        });
      }

      const updatedProfile = await res.json();
      console.log('Successfully updated profile');

      return {
        success: true,
        profile: updatedProfile
      };

    } catch (err) {
      console.error("Error updating profile:", err);
      return fail(500, {
        error: `Failed to update profile: ${err.message}`
      });
    }
  }
};