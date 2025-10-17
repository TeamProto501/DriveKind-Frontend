import { authenticatedFetchServer, API_BASE_URL } from "$lib/api.server";

//initial dashboard load for audit log
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
};
