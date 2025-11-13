import { authenticatedFetchServer, API_BASE_URL } from "$lib/api.server";

// initial dashboard load for audit log and calls
export const load = async (event) => {
  const tab = event.url.searchParams.get("tab") ?? "audits";
  const endpoint = tab === "calls" ? "/log/calls" : "/audit-log/dash";

  // Fetch logs, clients, and staff in parallel
  const [logsRes, clientsRes, staffRes] = await Promise.all([
    authenticatedFetchServer(API_BASE_URL + endpoint, {}, event),
    authenticatedFetchServer(API_BASE_URL + "/clients", {}, event),
    authenticatedFetchServer(API_BASE_URL + "/staff-profiles", {}, event),
  ]);

  // ----- Logs -----
  const logsText = await logsRes.text();
  const logsData = JSON.parse(logsText);

  // ----- Clients -----
  let clients: any[] = [];
  try {
    const clientsText = await clientsRes.text();
    const parsed = JSON.parse(clientsText);
    if (Array.isArray(parsed?.data)) {
      clients = parsed.data;
    } else if (Array.isArray(parsed)) {
      clients = parsed;
    }
  } catch {
    clients = [];
  }

  // ----- Staff -----
  let staff: any[] = [];
  try {
    const staffText = await staffRes.text();
    const parsed = JSON.parse(staffText);
    if (Array.isArray(parsed?.data)) {
      staff = parsed.data;
    } else if (Array.isArray(parsed)) {
      staff = parsed;
    }
  } catch {
    staff = [];
  }

  return { data: logsData, tab, clients, staff };
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

export const actions = {
  deleteByRange: async (event) => {
    const formData = await event.request.formData();
    const startTime = formData.get("startTime") as string;
    const endTime = formData.get("endTime") as string;

    const formatToSQL = (dateTimeLocal: string) => {
      return dateTimeLocal.replace("T", " ") + ":00";
    };

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

    const formatToSQL = (dateTimeLocal: string) => {
      return dateTimeLocal.replace("T", " ") + ":00";
    };

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
          endTime: endTime,
        }),
      },
      event
    );

    const text = await res.text();
    const data = JSON.parse(text);
    const flattenedData = flattenData(data);
    return { data: flattenedData };
  },

  // Create / update a call entry
  saveCall: async (event) => {
    try {
      const formData = await event.request.formData();

      const id = formData.get("id");
      const payload = {
        caller_name: formData.get("caller_name") as string,
        phone_number: formData.get("phone_number") as string,
        call_type: formData.get("call_type") as string,
        call_time: formData.get("call_time") as string,
        staff_name: (formData.get("staff_name") as string) || null,
        forwarded_to_name:
          (formData.get("forwarded_to_name") as string) || null,
        notes: (formData.get("notes") as string) || null,
      };

      const method = id ? "PUT" : "POST";

      // 🔴 FIX: hit /calls, not /log/calls
      const endpoint = id
        ? `${API_BASE_URL}/calls/${id}`
        : `${API_BASE_URL}/calls`;

      const res = await authenticatedFetchServer(
        endpoint,
        {
          method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
        event
      );

      const text = await res.text();

      let parsed: any = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        // plain text / HTML
      }

      if (!res.ok) {
        const backendError =
          parsed?.error ||
          parsed?.message ||
          text ||
          "Failed to save call.";
        return {
          success: false,
          error: backendError,
        };
      }

      return {
        success: true,
        data: parsed ?? text,
      };
    } catch (err: any) {
      console.error("saveCall action error:", err);
      return {
        success: false,
        error:
          err?.message ||
          "Unexpected error occurred while saving the call entry.",
      };
    }
  },
};