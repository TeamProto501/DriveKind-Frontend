import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { createSupabaseServerClient } from './supabase.server';
import { toastStore } from './toast';

import type { AuthInfo } from './types';

// DriveKind API Configuration
export const API_BASE_URL = 'http://localhost:3000';



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

// Public API functions (no authentication required)
export async function fetchPublicPractices(): Promise<Response> {
  return await fetch(`${API_BASE_URL}/practices/public`);
}

export async function fetchPublicTreatmentPlan(
  lastName: string,
  practiceCode: string,
  uuid?: string
): Promise<Response> {
  const params = new URLSearchParams({
    lastName: encodeURIComponent(lastName),
    practiceCode: encodeURIComponent(practiceCode)
  });
  
  if (uuid) {
    params.append('uuid', uuid);
  }
  
  return await fetch(`${API_BASE_URL}/plans/public?${params.toString()}`);
}

export async function getPublicTreatmentPlan(uuid: string): Promise<Response> {
  console.log(`Fetching public treatment plan for UUID: ${uuid}`);
  return await fetch(`${API_BASE_URL}/public/treatment-plan/${uuid}`);
}

function preprocessHTMLForPDF(html: string): string {
  const baseURL = 'https://guaranteeth-slides.vercel.app';
  
  html = html.replace(/src="(\/_app\/immutable\/assets\/[^"]+)"/g, `src="${baseURL}$1"`);
  html = html.replace(/src="(\/src\/lib\/[^"]+\.(jpg|jpeg|png|gif|svg|webp))"/gi, `src="${baseURL}$1"`);
  html = html.replace(/src="(\/[^"]+(?<!data:)[^"]*\.(jpg|jpeg|png|gif|svg|webp))"/gi, `src="${baseURL}$1"`);
  html = html.replace(/url\(["']?(\/_app\/immutable\/assets\/[^)]+)["']?\)/g, `url(${baseURL}$1)`);
  html = html.replace(/url\(["']?(\/src\/lib\/[^)]+\.(jpg|jpeg|png|gif|svg|webp))["']?\)/gi, `url(${baseURL}$1)`);
  html = html.replace(/url\(["']?(\/[^)]+(?<!data:)[^)]*\.(jpg|jpeg|png|gif|svg|webp))["']?\)/gi, `url(${baseURL}$1)`);
  
  return html;
}

export async function generatePDF(html: string): Promise<Response> {
  const processedHTML = preprocessHTMLForPDF(html);
  
  return await fetch('https://pdf-gen-pi.vercel.app/api/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html: processedHTML })
  });
}

// Authenticated API functions
export async function getClients(
  authInfo?: AuthInfo,
  event?: RequestEvent
): Promise<Response> {
  return await authenticatedFetch(
    `${API_BASE_URL}/clients`,
    {},
    authInfo,
    event
  );
}