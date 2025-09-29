import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { createSupabaseServerClient } from './supabase.server';
import { toastStore } from './toast';

import type { AuthInfo } from './types';

// DriveKind API Configuration
export const API_BASE_URL = 'https://drive-kind-api.vercel.app/';



export async function authenticatedFetch(
  url: string,
  options: RequestInit = {},
  authInfo?: AuthInfo,
  event?: RequestEvent
): Promise<Response> {
  let token: string | undefined;
  let supabaseClient: any = null;

  if (authInfo?.token) {
    token = authInfo.token;
  } else if (event) {
    supabaseClient = createSupabaseServerClient(event);
    const { data: { session } } = await supabaseClient.auth.getSession();
    token = session?.access_token;
  }

  if (!token) {
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
      if (supabaseClient) {
        const { data: { session }, error } = await supabaseClient.auth.refreshSession();

        if (session?.access_token && !error) {
          const retryResponse = await makeRequest(session.access_token);
          if (retryResponse.ok) {
            return retryResponse;
          }
        }
      }

      // Only show toast error if we're in a browser context
      if (typeof window !== 'undefined') {
        toastStore.error('Your session has expired. Please log out and log back in to continue.', {
          duration: 8000
        });
      }
    }

    return response;

  } catch (fetchError) {
    throw fetchError;
  }
}

// Authenticated API functions
export async function getClients(authInfo?: AuthInfo, event?: RequestEvent): Promise<Response> {
  return await authenticatedFetch(`${API_BASE_URL}/clients`, {}, authInfo, event);
}