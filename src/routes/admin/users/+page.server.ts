// src/routes/admin/users/+page.server.ts
import { API_BASE_URL } from "$lib/api";
import { error, redirect, json } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.server';
import type { Actions } from './$types';

export const load = async (event) => {
  const tab = event.url.searchParams.get("tab") ?? "users";

  try {
    const supabase = createSupabaseServerClient(event);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw redirect(302, '/login');

    // Get org for filtering
    const { data: { user } } = await supabase.auth.getUser();
    const { data: userProfile } = await supabase
      .from('staff_profiles')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (!userProfile) {
      console.error('No user profile found for:', user.id);
      return { 
        tab, 
        staffProfiles: [], 
        clients: [], 
        userProfile: null, 
        session,
        error: 'User profile not found'
      };
    }

    // Staff profiles from API (bearer token)
    let staffData: any[] = [];
    try {
      const res = await fetch(`${API_BASE_URL}/staff-profiles`, {
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${session.access_token}` 
        }
      });
      
      if (!res.ok) {
        console.error('Failed to fetch staff profiles:', res.status, res.statusText);
        if (res.status === 401 || res.status === 403) throw redirect(302, '/login');
      } else {
        const text = await res.text();
        staffData = JSON.parse(text);
        
        if (!Array.isArray(staffData)) {
          console.error('API returned non-array for staff profiles:', staffData);
          staffData = [];
        }
      }
    } catch (err) {
      console.error('Error fetching staff profiles:', err);
      staffData = [];
    }

    // Clients by org (direct from Supabase)
    let clientsData: any[] = [];
    try {
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('org_id', userProfile.org_id)
        .order('last_name', { ascending: true });

      if (clientsError) {
        console.error('Error fetching clients:', clientsError);
      } else {
        clientsData = clients || [];
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
      clientsData = [];
    }

    return { 
      tab, 
      staffProfiles: staffData, 
      clients: clientsData, 
      userProfile, 
      session 
    };
    
  } catch (err: any) {
    console.error('Error in users page load:', err);
    
    if (err.status === 302) throw err;
    if (err.status) throw err;
    
    // Return safe defaults instead of throwing
    return {
      tab: 'users',
      staffProfiles: [],
      clients: [],
      userProfile: null,
      session: null,
      error: err.message || 'Failed to load data'
    };
  }
};

// Add server actions for deactivate functionality
export const actions: Actions = {
  deactivateUser: async (event) => {
    const supabase = createSupabaseServerClient(event);
    
    // Verify session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return { success: false, error: 'Unauthorized' };
    }

    // Get user_id from form data
    const formData = await event.request.formData();
    const userId = formData.get('user_id') as string;
    
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    // Get current user's profile to verify permissions
    const { data: profile, error: profileError } = await supabase
      .from('staff_profiles')
      .select('org_id, role')
      .eq('user_id', session.user.id)
      .single();

    if (profileError || !profile) {
      return { success: false, error: 'Profile not found' };
    }

    // Check if user has Admin permission
    const roles = Array.isArray(profile.role) ? profile.role : (profile.role ? [profile.role] : []);
    const hasPermission = roles.some(r => ['Admin', 'Super Admin'].includes(r));
    
    if (!hasPermission) {
      return { success: false, error: 'Insufficient permissions' };
    }

    // Verify the user to deactivate belongs to same org
    const { data: targetUser, error: fetchError } = await supabase
      .from('staff_profiles')
      .select('org_id, user_id')
      .eq('user_id', userId)
      .single();

    if (fetchError || !targetUser) {
      return { success: false, error: 'User not found' };
    }

    if (targetUser.org_id !== profile.org_id) {
      return { success: false, error: 'Unauthorized to deactivate this user' };
    }

    // Prevent deactivating yourself
    if (userId === session.user.id) {
      return { success: false, error: 'Cannot deactivate your own account' };
    }

    // Deactivate user (set active = false)
    const { error: updateError } = await supabase
      .from('staff_profiles')
      .update({ active: false })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Deactivate error:', updateError);
      return { success: false, error: updateError.message };
    }

    return { success: true };
  }
};