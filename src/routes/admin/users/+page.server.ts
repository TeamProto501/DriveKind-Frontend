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
      return { success: false, error: 'You do not have permission to create users. Admin or Super Admin role required.' };
    }

    console.log('Current user authorized. Role:', userRole, 'Org ID:', currentUserProfile.org_id);

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
      const requestBody = {
        ...profileData,
        user_id: authData.user.id,
        org_id: currentUserProfile.org_id // Ensure org_id matches current user
      };

      // Decode JWT token to see what user info it contains (for debugging)
      try {
        const tokenParts = session.access_token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
          console.log('JWT Token payload (user info in token):', JSON.stringify(payload, null, 2));
          console.log('Token contains user_id:', payload.sub);
          console.log('Token contains email:', payload.email);
          console.log('Token contains metadata:', payload.user_metadata);
        }
      } catch (e) {
        console.log('Could not decode JWT token (this is okay)');
      }

      console.log('Calling API with:', JSON.stringify(requestBody, null, 2));
      console.log('Current user making request - ID:', user.id, 'Role:', userRole, 'Org:', currentUserProfile.org_id);
      console.log('Using access token:', session.access_token?.substring(0, 20) + '...');

      const res = await fetch(`${API_BASE_URL}/staff-profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          // Add user info in headers as backup (some APIs expect this)
          'X-User-ID': user.id,
          'X-User-Role': Array.isArray(userRole) ? userRole.join(',') : String(userRole),
        },
        body: JSON.stringify(requestBody)
      });

      console.log('API response status:', res.status, res.statusText);

      const responseText = await res.text();
      console.log('API response body:', responseText);

      if (!res.ok) {
        console.error('Failed to create staff profile, rolling back auth user');
        console.error('Response status:', res.status);
        console.error('Response text:', responseText);
        
        // Try to parse error response
        let errorMessage = `Failed to create staff profile (${res.status})`;
        try {
          const errorData = JSON.parse(responseText);
          if (Array.isArray(errorData) && errorData[2]) {
            errorMessage = errorData[2]; // Extract error message from array format
          } else if (errorData.error || errorData.message) {
            errorMessage = errorData.error || errorData.message;
          }
        } catch (e) {
          errorMessage = responseText || errorMessage;
        }
        
        await supabase.auth.admin.deleteUser(authData.user.id);
        return { success: false, error: errorMessage };
      }

      // Try to parse success response
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        responseData = responseText;
      }
      
      console.log('Parsed API response:', responseData);

      console.log('Staff profile created successfully');
      return { success: true, userId: authData.user.id };
      
    } catch (err: any) {
      console.error('Create user error:', err);
      return { success: false, error: err.message || 'Unknown error occurred' };
    }
  }
} satisfies Actions;