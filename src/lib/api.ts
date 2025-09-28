import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { supabase } from './supabase';
import { toastStore } from './toast';

import type { AuthInfo } from './types';

// DriveKind API Configuration
export const API_BASE_URL = 'https://drive-kind-api.vercel.app/';



export async function authenticatedFetch(
  url: string,
  options: RequestInit = {},
  authInfo?: AuthInfo
): Promise<Response> {
  const token = authInfo?.token ?? (typeof window !== 'undefined' ? (await supabase.auth.getSession()).data.session?.access_token : undefined);

  if (!token) throw new Error('No authentication token available');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers
  };
  return fetch(url, { ...options, headers, credentials: 'include' });
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
async function fetchJson(url: string, options?: RequestInit, authInfo?: AuthInfo, event?: RequestEvent) {
  const res = await authenticatedFetch(url, options, authInfo);
  return res.json();
}

export const getAllClients = (authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/clients`, {}, authInfo);

export const createStaffProfile = (data: any, authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/staff-profiles`, { method: 'POST', body: JSON.stringify(data) }, authInfo);

export const updateStaffProfile = (id: string, data: any, authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/staff-profiles/${id}`, { method: 'PUT', body: JSON.stringify(data) }, authInfo);