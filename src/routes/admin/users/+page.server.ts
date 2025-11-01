// src/routes/admin/users/+page.server.ts
import { API_BASE_URL } from "$lib/api";
import { error, redirect } from '@sveltejs/kit';
import { createSupabaseServerClient, createSupabaseAdminClient } from '$lib/supabase.server';
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

    // Fetch current user's profile for org_id
    const { data: { user } } = await supabase.auth.getUser();
    const { data: userProfile } = await supabase
      .from('staff_profiles')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    // Fetch clients from Supabase
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
      userProfile,
      session
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

    // Get current user's profile to verify permissions
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: currentUserProfile, error: profileError } = await supabase
      .from('staff_profiles')
      .select('user_id, org_id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !currentUserProfile) {
      console.error('Failed to fetch current user profile:', profileError);
      return { success: false, error: 'Failed to verify user permissions' };
    }

    // Check if current user has Admin or Super Admin role
    const userRole = currentUserProfile.role;
    const isAuthorized = Array.isArray(userRole)
      ? (userRole.includes('Admin') || userRole.includes('Super Admin'))
      : (userRole === 'Admin' || userRole === 'Super Admin');

    if (!isAuthorized) {
      console.error('User does not have permission to create users. Role:', userRole);
      console.error('User role type:', typeof userRole, 'Is array:', Array.isArray(userRole));
      return { success: false, error: 'You do not have permission to create users. Admin or Super Admin role required.' };
    }

    console.log('✅ Frontend: Current user authorized. Role:', JSON.stringify(userRole), 'Org ID:', currentUserProfile.org_id);
    console.log('✅ Frontend: User ID:', user.id, 'Email:', user.email);

    const formData = await event.request.formData();
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const firstName = formData.get('first_name') as string;
    const lastName = formData.get('last_name') as string;
    const profileData = JSON.parse(formData.get('profileData') as string);

    try {
      console.log('Creating auth user server-side:', email);
      console.log('Profile data being sent:', JSON.stringify(profileData, null, 2));
      
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

      // Ensure org_id is set from current user's org
      const staffProfileData = {
        ...profileData,
        user_id: authData.user.id,
        org_id: currentUserProfile.org_id // Ensure org_id matches current user
      };

      console.log('Creating staff profile directly in Supabase...');
      console.log('Staff profile data:', JSON.stringify(staffProfileData, null, 2));

      // Use admin client (service role) to bypass RLS policies
      // This allows us to create staff profiles even with RLS enabled
      const adminSupabase = createSupabaseAdminClient();
      
      const { data: staffProfile, error: profileError } = await adminSupabase
        .from('staff_profiles')
        .insert(staffProfileData)
        .select()
        .single();

      if (profileError) {
        console.error('Failed to create staff profile in Supabase:', profileError);
        console.error('Error details:', JSON.stringify(profileError, null, 2));
        
        // Roll back auth user creation
        await supabase.auth.admin.deleteUser(authData.user.id);
        
        // Try to provide helpful error message
        let errorMessage = 'Failed to create staff profile';
        if (profileError.code === '23505') {
          errorMessage = 'A staff profile with this information already exists';
        } else if (profileError.message) {
          errorMessage = profileError.message;
        }
        
        return { success: false, error: errorMessage };
      }

      console.log('✅ Staff profile created successfully:', staffProfile);
      return { success: true, userId: authData.user.id, staffProfile };
      
    } catch (err: any) {
      console.error('Create user error:', err);
      return { success: false, error: err.message || 'Unknown error occurred' };
    }
  }
} satisfies Actions;