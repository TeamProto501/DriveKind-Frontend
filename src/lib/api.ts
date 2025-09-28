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
  
  if (authInfo?.token) {
    token = authInfo.token;
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
  const res = await authenticatedFetch(url, options, authInfo);
  
  if (!res.ok) {
    const errorText = await res.text();
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

export const createStaffProfile = (data: any, authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/staff-profiles`, { 
    method: 'POST', 
    body: JSON.stringify(data) 
  }, authInfo);

export const updateStaffProfile = (id: string, data: any, authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/staff-profiles/${id}`, { 
    method: 'PUT', 
    body: JSON.stringify(data) 
  }, authInfo);