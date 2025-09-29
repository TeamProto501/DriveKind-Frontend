import { browser } from '$app/environment';
import { supabase } from './supabase'; // Client-side Supabase instance
import { toastStore } from './toast';

import type { AuthInfo } from './types';

// DriveKind API Configuration
export const API_BASE_URL = 'https://drive-kind-api.vercel.app/';

export async function authenticatedFetch(
  url: string, 
  options: RequestInit = {}, 
  authInfo?: AuthInfo
): Promise<Response> {
  if (!browser) {
    throw new Error('This API can only be used in the browser');
  }

  let token: string | undefined;
  
  // Support multiple auth info formats
  if (authInfo?.token) {
    token = authInfo.token;
  } else if (authInfo?.access_token) {
    token = authInfo.access_token;
  } else {
    // Get token from client-side Supabase
    const { data: { session } } = await supabase.auth.getSession();
    token = session?.access_token;
  }
  
  if (!token) {
    toastStore.error('No authentication token available. Please log in.');
    throw new Error('No authentication token available');
  }

  const makeRequest = async (accessToken: string): Promise<Response> => {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      ...options.headers,
    };

    return fetch(url, {
      ...options,
      headers,
      credentials: 'include'
    });
  };

  try {
    const response = await makeRequest(token);
    
    if (response.ok) {
      return response;
    }
    
    if (response.status === 401 || response.status === 403) {
      // Try to refresh the session using client-side Supabase
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (session?.access_token && !error) {
        const retryResponse = await makeRequest(session.access_token);
        if (retryResponse.ok) {
          return retryResponse;
        }
      }
      
      toastStore.error('Your session has expired. Please log out and log back in to continue.', {
        duration: 8000
      });
    }
    
    return response;
    
  } catch (fetchError) {
    throw fetchError;
  }
}

// Client-side API helper
async function fetchJson(url: string, options?: RequestInit, authInfo?: AuthInfo) {
  console.log(`API call to ${url}`, { 
    hasAuth: !!authInfo, 
    authType: authInfo?.token ? 'token' : authInfo?.access_token ? 'access_token' : 'none' 
  });
  
  const res = await authenticatedFetch(url, options, authInfo);
  
  if (!res.ok) {
    const errorText = await res.text();
    console.error(`API Error ${res.status} for ${url}:`, errorText);
    throw new Error(`API Error ${res.status}: ${errorText}`);
  }
  
  return res.json();
}

// Client-side API functions
export async function getClients(authInfo?: AuthInfo): Promise<Response> {
  return await authenticatedFetch(`${API_BASE_URL}/clients`, {}, authInfo);
}

export const getAllClients = (authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/clients`, {}, authInfo);

export const createStaffProfile = (data: any, authInfo?: AuthInfo) => {
  console.log('createStaffProfile called with auth:', authInfo ? 'Auth present' : 'No auth');
  return fetchJson(`${API_BASE_URL}/staff-profiles`, { 
    method: 'POST', 
    body: JSON.stringify(data) 
  }, authInfo);
};

export const updateStaffProfile = (id: string, data: any, authInfo?: AuthInfo) => {
  console.log('updateStaffProfile called with auth:', authInfo ? 'Auth present' : 'No auth');
  return fetchJson(`${API_BASE_URL}/staff-profiles/${id}`, { 
    method: 'PUT', 
    body: JSON.stringify(data) 
  }, authInfo);
};

export const deleteStaffProfile = (id: string, authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/staff-profiles/${id}`, { 
    method: 'DELETE' 
  }, authInfo);

export const getStaffProfile = (id: string, authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/staff-profiles/${id}`, {}, authInfo);

export const getAllStaffProfiles = (authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/staff-profiles`, {}, authInfo);

// Additional client-side functions
export const createClient = (data: any, authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/clients`, { 
    method: 'POST', 
    body: JSON.stringify(data) 
  }, authInfo);

export const updateClient = (id: string, data: any, authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/clients/${id}`, { 
    method: 'PUT', 
    body: JSON.stringify(data) 
  }, authInfo);

export const deleteClient = (id: string, authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/clients/${id}`, { 
    method: 'DELETE' 
  }, authInfo);

export const getClient = (id: string, authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/clients/${id}`, {}, authInfo);

// Utility function to check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  if (!browser) return false;
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session?.access_token;
  } catch {
    return false;
  }
}

// Utility function to get current user session
export async function getCurrentSession() {
  if (!browser) return null;
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  } catch {
    return null;
  }
}