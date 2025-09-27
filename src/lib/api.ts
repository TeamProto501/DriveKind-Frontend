// api.ts
import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { supabase } from './supabase';
import { toastStore } from './toast';

import type { AuthInfo } from './types';

/* =========================================================
   CONFIG
========================================================= */
export const API_BASE_URL = 'https://drive-kind-api.vercel.app/';

/* =========================================================
   AUTHENTICATED FETCH
========================================================= */
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

/* =========================================================
   HELPER TO AUTOMATICALLY PARSE JSON
========================================================= */
async function fetchJson(url: string, options?: RequestInit, authInfo?: AuthInfo, event?: RequestEvent) {
  const res = await authenticatedFetch(url, options, authInfo);
  return res.json();
}

/* =========================================================
   CLIENTS
========================================================= */
export const getAllClients = (authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/clients`, {}, authInfo);

export const getClientById = (id: number, authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/clients/${id}`, {}, authInfo);

export const createClient = (data: any, authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/clients`, { method: 'POST', body: JSON.stringify(data) }, authInfo);

export const updateClient = (id: number, data: any, authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }, authInfo);

export const deleteClient = (id: number, authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/clients/${id}`, { method: 'DELETE' }, authInfo);

/* =========================================================
   STAFF PROFILES
========================================================= */
export const getAllStaffProfiles = (authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/staff-profiles`, {}, authInfo);

export const getStaffProfileById = (id: string, authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/staff-profiles/${id}`, {}, authInfo);

export const createStaffProfile = (data: any, authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/staff-profiles`, { method: 'POST', body: JSON.stringify(data) }, authInfo);

export const updateStaffProfile = (id: string, data: any, authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/staff-profiles/${id}`, { method: 'PUT', body: JSON.stringify(data) }, authInfo);

export const deleteStaffProfile = (id: string, authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/staff-profiles/${id}`, { method: 'DELETE' }, authInfo);

/* =========================================================
   CALLS
========================================================= */
export const getAllCalls = (authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/calls`, {}, authInfo);

export const getCallById = (id: number, authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/calls/${id}`, {}, authInfo);

export const createCall = (data: any, authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/calls`, { method: 'POST', body: JSON.stringify(data) }, authInfo);

export const updateCall = (id: number, data: any, authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/calls/${id}`, { method: 'PUT', body: JSON.stringify(data) }, authInfo);

export const deleteCall = (id: number, authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/calls/${id}`, { method: 'DELETE' }, authInfo);

/* =========================================================
   DRIVER UNAVAILABILITY
========================================================= */
export const getAllDriverUnavailabilities = (authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/driver_unavailability`, {}, authInfo);

export const getDriverUnavailabilityById = (id: number, authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/driver_unavailability/${id}`, {}, authInfo);

export const createDriverUnavailability = (data: any, authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/driver_unavailability`, { method: 'POST', body: JSON.stringify(data) }, authInfo);

export const updateDriverUnavailability = (id: number, data: any, authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/driver_unavailability/${id}`, { method: 'PUT', body: JSON.stringify(data) }, authInfo);

export const deleteDriverUnavailability = (id: number, authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/driver_unavailability/${id}`, { method: 'DELETE' }, authInfo);

/* =========================================================
   TIMECARDS
========================================================= */
export const getAllTimecards = (authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/timecards`, {}, authInfo);

export const getTimecardById = (id: number, authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/timecards/${id}`, {}, authInfo);

export const createTimecard = (data: any, authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/timecards`, { method: 'POST', body: JSON.stringify(data) }, authInfo);

export const updateTimecard = (id: number, data: any, authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/timecards/${id}`, { method: 'PUT', body: JSON.stringify(data) }, authInfo);

export const deleteTimecard = (id: number, authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/timecards/${id}`, { method: 'DELETE' }, authInfo);

/* =========================================================
   VEHICLES
========================================================= */
export const getAllVehicles = (authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/vehicles`, {}, authInfo);

export const getVehicleById = (id: number, authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/vehicles/${id}`, {}, authInfo);

export const createVehicle = (data: any, authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/vehicles`, { method: 'POST', body: JSON.stringify(data) }, authInfo);

export const updateVehicle = (id: number, data: any, authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/vehicles/${id}`, { method: 'PUT', body: JSON.stringify(data) }, authInfo);

export const deleteVehicle = (id: number, authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/vehicles/${id}`, { method: 'DELETE' }, authInfo);

/* =========================================================
   ORGANIZATIONS
========================================================= */
export const getAllOrganizations = (authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/organizations`, {}, authInfo);

export const getOrganizationById = (id: number, authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/organizations/${id}`, {}, authInfo);

export const createOrganization = (data: any, authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/organizations`, { method: 'POST', body: JSON.stringify(data) }, authInfo);

export const updateOrganization = (id: number, data: any, authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/organizations/${id}`, { method: 'PUT', body: JSON.stringify(data) }, authInfo);

export const deleteOrganization = (id: number, authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/organizations/${id}`, { method: 'DELETE' }, authInfo);

/* =========================================================
   TRANSACTION AUDIT LOGS
========================================================= */
export const getAllTransactionAuditLogs = (authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/transactions_audit_log`, {}, authInfo);

export const getTransactionAuditLogById = (id: number, authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/transactions_audit_log/${id}`, {}, authInfo);

export const createTransactionAuditLog = (data: any, authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/transactions_audit_log`, { method: 'POST', body: JSON.stringify(data) }, authInfo);

/* =========================================================
   ADMIN DASHBOARD QUERIES
========================================================= */
export const getDriversForAdminDash = (authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/staff-profiles?role=Driver`, {}, authInfo);

export const getVolunteersForAdminDash = (authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/staff-profiles?role=Volunteer`, {}, authInfo);

export const getClientsForAdminDash = (authInfo?: AuthInfo) =>
  fetchJson(`${API_BASE_URL}/clients`, {}, authInfo);