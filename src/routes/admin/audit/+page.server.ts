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
