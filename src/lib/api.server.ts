import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { createSupabaseServerClient } from "./supabase.server";

import type { AuthInfo } from "./types";

// DriveKind API Configuration
export const API_BASE_URL = "https://drive-kind-api.vercel.app/";

export async function authenticatedFetchServer(
  url: string,
  options: RequestInit = {},
  event: RequestEvent
): Promise<Response> {
  const supabaseClient = createSupabaseServerClient(event);
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (!session?.access_token) {
    throw redirect(302, "/auth/login");
  }

  const makeRequest = async (accessToken: string): Promise<Response> => {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    };

    return fetch(url, {
      ...options,
      headers,
      credentials: "include",
    });
  };

  try {
    const response = await makeRequest(session.access_token);

    if (response.ok) {
      return response;
    }

    if (response.status === 401 || response.status === 403) {
      // Try to refresh the session
      const {
        data: { session: refreshedSession },
        error,
      } = await supabaseClient.auth.refreshSession();

      if (refreshedSession?.access_token && !error) {
        const retryResponse = await makeRequest(refreshedSession.access_token);
        if (retryResponse.ok) {
          return retryResponse;
        }
      }

      // Session refresh failed, redirect to login
      throw redirect(302, "/auth/login");
    }

    return response;
  } catch (fetchError) {
    if (
      fetchError instanceof Response &&
      fetchError.status >= 300 &&
      fetchError.status < 400
    ) {
      throw fetchError; // Re-throw redirect responses
    }
    throw fetchError;
  }
}

// Server-side API helper
async function fetchJsonServer(
  url: string,
  options: RequestInit = {},
  event: RequestEvent
) {
  const res = await authenticatedFetchServer(url, options, event);

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`API Error ${res.status}: ${errorText}`);
    throw new Error(`API Error ${res.status}: ${errorText}`);
  }

  return res.json();
}

// Server-side API functions
export async function getClientsServer(event: RequestEvent): Promise<Response> {
  return await authenticatedFetchServer(`${API_BASE_URL}/clients`, {}, event);
}

export const getAllClientsServer = (event: RequestEvent) =>
  fetchJsonServer(`${API_BASE_URL}/clients`, {}, event);

export const createStaffProfileServer = (data: any, event: RequestEvent) =>
  fetchJsonServer(
    `${API_BASE_URL}/staff-profiles`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
    event
  );

export const updateStaffProfileServer = (
  id: string,
  data: any,
  event: RequestEvent
) =>
  fetchJsonServer(
    `${API_BASE_URL}/staff-profiles/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
    event
  );

export const deleteStaffProfileServer = (id: string, event: RequestEvent) =>
  fetchJsonServer(
    `${API_BASE_URL}/staff-profiles/${id}`,
    {
      method: "DELETE",
    },
    event
  );

export const getStaffProfileServer = (id: string, event: RequestEvent) =>
  fetchJsonServer(`${API_BASE_URL}/staff-profiles/${id}`, {}, event);

export const getAllStaffProfilesServer = (event: RequestEvent) =>
  fetchJsonServer(`${API_BASE_URL}/staff-profiles`, {}, event);

// Additional server-side functions you might need
export const createClientServer = (data: any, event: RequestEvent) =>
  fetchJsonServer(
    `${API_BASE_URL}/clients`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
    event
  );

export const updateClientServer = (
  id: string,
  data: any,
  event: RequestEvent
) =>
  fetchJsonServer(
    `${API_BASE_URL}/clients/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
    event
  );

export const deleteClientServer = (id: string, event: RequestEvent) =>
  fetchJsonServer(
    `${API_BASE_URL}/clients/${id}`,
    {
      method: "DELETE",
    },
    event
  );

export const getClientServer = (id: string, event: RequestEvent) =>
  fetchJsonServer(`${API_BASE_URL}/clients/${id}`, {}, event);
