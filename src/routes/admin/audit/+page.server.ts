// src/routes/admin/audit/+page.server.ts
import { authenticatedFetchServer, API_BASE_URL } from "$lib/api.server";
import type { PageServerLoad, Actions } from "./$types";

function getRows(raw: any): any[] {
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw)) return raw;
  return [];
}

function flattenCalls(data: any[]): any[] {
  return data.map((item) => {
    const flattened: any = { ...item };

    // If the API joins staff_profiles, turn that into a simple staff_name
    if (item.staff_profiles) {
      const first = item.staff_profiles.first_name ?? "";
      const last = item.staff_profiles.last_name ?? "";
      flattened.staff_name = [first, last].filter(Boolean).join(" ");
      delete flattened.staff_profiles;
    }

    // Calls table columns (leave names as they are in the DB / API):
    // call_id, user_id, org_id, call_time, call_type,
    // other_type, client_id, phone_number, forwarded_to_name,
    // caller_first_name, caller_last_name

    return flattened;
  });
}

export const load: PageServerLoad = async (event) => {
  const tab = event.url.searchParams.get("tab") ?? "audits";

  if (tab === "calls") {
    const res = await authenticatedFetchServer(
      API_BASE_URL + "/calls",
      {},
      event
    );

    const text = await res.text();
    let raw: any;
    try {
      raw = JSON.parse(text);
    } catch {
      raw = text;
    }

    const rows = flattenCalls(getRows(raw));
    return { data: rows, tab: "calls" };
  } else {
    const res = await authenticatedFetchServer(
      API_BASE_URL + "/audit-log/dash",
      {},
      event
    );

    const text = await res.text();
    let raw: any;
    try {
      raw = JSON.parse(text);
    } catch {
      raw = text;
    }

    // /audit-log/dash returns { success, data, count }
    const rows = getRows(raw);
    return { data: rows, tab: "audits" };
  }
};

export const actions: Actions = {
  deleteByRange: async (event) => {
    const formData = await event.request.formData();
    const startTime = formData.get("startTime") as string;
    const endTime = formData.get("endTime") as string;

    const formatToSQL = (dateTimeLocal: string) =>
      dateTimeLocal.replace("T", " ") + ":00";

    const startSQL = formatToSQL(startTime);
    const endSQL = formatToSQL(endTime);

    const res = await authenticatedFetchServer(
      API_BASE_URL + "/calls/deleteByTime",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startTime: startSQL,
          endTime: endSQL,
        }),
      },
      event
    );

    const text = await res.text();
    return { success: res.ok, text };
  },

  previewByRange: async (event) => {
    const formData = await event.request.formData();
    const startTime = formData.get("startTime") as string;
    const endTime = formData.get("endTime") as string;

    const formatToSQL = (dateTimeLocal: string) =>
      dateTimeLocal.replace("T", " ") + ":00";

    const startSQL = formatToSQL(startTime);
    const endSQL = formatToSQL(endTime);

    const res = await authenticatedFetchServer(
      API_BASE_URL + "/calls/previewByTime",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startTime: startSQL,
          endTime: endSQL,
        }),
      },
      event
    );

    const text = await res.text();
    let raw: any;
    try {
      raw = JSON.parse(text);
    } catch {
      raw = text;
    }

    const rows = flattenCalls(getRows(raw));
    return { data: rows };
  },

  updateCall: async (event) => {
    const formData = await event.request.formData();

    const call_id = formData.get("call_id") as string;

    const call_time_local = formData.get("call_time") as string | null;
    const formatToSQL = (dateTimeLocal: string) =>
      dateTimeLocal.replace("T", " ") + ":00";

    const body: any = {
      // Not really edited, but passed through if your API wants them
      user_id: formData.get("user_id") || null,
      client_id: formData.get("client_id") || null,
      call_type: formData.get("call_type") || null,

      // Editable fields – NOTE the column names here:
      call_time: call_time_local ? formatToSQL(call_time_local) : null,
      other_type: formData.get("other_type") || null,
      phone_number: formData.get("phone_number") || null,
      forwarded_to_name: formData.get("forwarded_to_name") || null,
      caller_first_name: formData.get("caller_first_name") || null,
      caller_last_name: formData.get("caller_last_name") || null,
      // org_id intentionally not sent
    };

    try {
      const res = await authenticatedFetchServer(
        API_BASE_URL + `/calls/${call_id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
        event
      );

      const text = await res.text();

      if (!res.ok) {
        return {
          success: false,
          error: text || `API returned ${res.status}`,
        };
      }

      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || "Unexpected error while updating call.",
      };
    }
  },
};