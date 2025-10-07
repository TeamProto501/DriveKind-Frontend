import { authenticatedFetchServer, API_BASE_URL } from "$lib/api.server";

//initial dashboard load for audit log
export const load = async (event) => {
  const res = await authenticatedFetchServer(
    API_BASE_URL + "/audit-log/dash",
    {},
    event
  );
  const text = await res.text();
  const data = JSON.parse(text);
  return { data };
};
