import { authenticatedFetchServer, API_BASE_URL } from "$lib/api.server";

// initial dashboard load for audit log
export const load = async (event) => {
  const tab = event.url.searchParams.get("tab") ?? "audits";
  const endpoint = tab === "calls" ? "/log/calls" : "/audit-log/dash";

  const res = await authenticatedFetchServer(
    API_BASE_URL + endpoint,
    {},
    event
  );
  const text = await res.text();
  const data = JSON.parse(text);
  return { data, tab };
};

function flattenData(data: any[]) {
  return data.map((item) => {
    const flattened: any = { ...item };

    // Handle staff_profiles object
    if (item.staff_profiles) {
      flattened.staff_first_name = item.staff_profiles.first_name || "";
      flattened.staff_last_name = item.staff_profiles.last_name || "";
      delete flattened.staff_profiles;
    }

    return flattened;
  });
}

const formatToSQL = (dateTimeLocal: string | null) => {
  if (!dateTimeLocal) return null;
  return dateTimeLocal.replace("T", " ") + ":00";
};

export const actions = {
  deleteByRange: async (event) => {
    const formData = await event.request.formData();
    const startTime = formData.get("startTime") as string;
    const endTime = formData.get("endTime") as string;

    const startSQL = formatToSQL(startTime);
    const endSQL = formatToSQL(endTime);

    const res = await authenticatedFetchServer(
      API_BASE_URL + "/log/deleteByTime",
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
    return { success: true, text };
  },

  previewByRange: async (event) => {
    const formData = await event.request.formData();
    const startTime = formData.get("startTime") as string;
    const endTime = formData.get("endTime") as string;

    const startSQL = formatToSQL(startTime);
    const endSQL = formatToSQL(endTime);

    const res = await authenticatedFetchServer(
      API_BASE_URL + "/log/previewByTime",
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
    const data = JSON.parse(text);
    const flattenedData = flattenData(data);
    return { data: flattenedData };
  },

  updateCall: async (event) => {
    const formData = await event.request.formData();

    const call_id = Number(formData.get("call_id"));
    const user_id = formData.get("user_id") as string | null;
    const org_id_raw = formData.get("org_id") as string | null;

    const call_time_local = formData.get("call_time") as string;
    const call_time = formatToSQL(call_time_local);

    const call_type = (formData.get("call_type") as string) ?? null;
    const other_type = (formData.get("other_type") as string) ?? null;

    const client_id_raw = formData.get("client_id") as string | null;
    const client_id =
      client_id_raw && client_id_raw !== ""
        ? Number(client_id_raw)
        : null;

    const phone_number =
      (formData.get("phone_number") as string | null) ?? null;
    const forwarded_to_name =
      (formData.get("forwarded_to_name") as string | null) ?? null;
    const caller_first_name =
      (formData.get("caller_first_name") as string | null) ?? null;
    const caller_last_name =
      (formData.get("caller_last_name") as string | null) ?? null;

    const org_id =
      org_id_raw && org_id_raw !== "" ? Number(org_id_raw) : null;

    const body: any = {
      call_id,
      call_time,
      call_type,
      other_type,
      client_id,
      phone_number,
      forwarded_to_name,
      caller_first_name,
      caller_last_name,
    };

    if (user_id) body.user_id = user_id;
    if (org_id !== null) body.org_id = org_id;

    // TODO: adjust path/method to match your backend route
    const res = await authenticatedFetchServer(
      API_BASE_URL + "/log/updateCall",
      {
        method: "POST",
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
        error: text || "Failed to update call.",
      };
    }

    return {
      success: true,
      message: "Call updated successfully.",
    };
  },
};