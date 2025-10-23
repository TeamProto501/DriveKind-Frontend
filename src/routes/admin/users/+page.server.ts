// src/routes/admin/users/+page.server.ts
import { API_BASE_URL } from "$lib/api";
import { error, redirect } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.server';
import type { Actions } from './$types';

export const load = async (event) => {
  const tab = event.url.searchParams.get("tab") ?? "users";

  try {
    const supabase = createSupabaseServerClient(event);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      console.log('No Supabase session found, redirecting to login');
      throw redirect(302, '/login');
    }

    console.log('Fetching staff profiles with Supabase token');
    
    // Fetch staff profiles
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
      
      if (res.status === 401 || res.status === 403) {
        throw redirect(302, '/login');
      }
      
      throw error(res.status, `Failed to fetch staff profiles: ${res.statusText}`);
    }

    const text = await res.text();
    let staffData;

    try {
      staffData = JSON.parse(text);
    } catch (parseError) {
      console.error("Failed to parse JSON:", text);
      throw error(500, "Invalid API response format");
    }

    if (!Array.isArray(staffData)) {
      console.error("Expected array but got:", typeof staffData);
      throw error(500, "API returned unexpected data format");
    }

    // Fetch clients from Supabase
    const { data: { user } } = await supabase.auth.getUser();
    const { data: userProfile } = await supabase
      .from('staff_profiles')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    const { data: clientsData, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .eq('org_id', userProfile.org_id)
      .order('last_name', { ascending: true });

    if (clientsError) {
      console.error('Error fetching clients:', clientsError);
    }

    return { 
      tab, 
      staffProfiles: staffData,
      clients: clientsData || [],
      session,
      userProfile
    };

  } catch (err) {
    console.error("Error in load function:", err);
    
    if (err.status === 302) {
      throw err;
    }
    
    if (err.status) {
      throw err;
    }
    
    throw error(500, `Failed to load data: ${err.message}`);
  }
};

export const actions = {
  createUser: async (event) => {
    const supabase = createSupabaseServerClient(event);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return { success: false, error: 'No session found' };
    }

    const formData = await event.request.formData();
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const firstName = formData.get('first_name') as string;
    const lastName = formData.get('last_name') as string;
    const profileData = JSON.parse(formData.get('profileData') as string);

    try {
      console.log('Creating auth user server-side:', email);
      
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName
        }
      });

      if (authError || !authData.user) {
        console.error('Failed to create auth user:', authError);
        return { success: false, error: authError?.message || 'Failed to create user' };
      }

      console.log('Auth user created with ID:', authData.user.id);

      const res = await fetch(`${API_BASE_URL}/staff-profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ...profileData,
          user_id: authData.user.id
        })
      });

      if (!res.ok) {
        console.error('Failed to create staff profile, rolling back auth user');
        await supabase.auth.admin.deleteUser(authData.user.id);
        const errorText = await res.text();
        return { success: false, error: `Failed to create staff profile: ${errorText}` };
      }

      console.log('Staff profile created successfully');
      return { success: true, userId: authData.user.id };
      
    } catch (err: any) {
      console.error('Create user error:', err);
      return { success: false, error: err.message || 'Unknown error occurred' };
    }
  }
} satisfies Actions;