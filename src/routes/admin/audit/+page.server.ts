import { authenticatedFetch, API_BASE_URL } from "$lib/api";

//initial dashboard load for audit log
export const load = async (event) => {
  const res = await authenticatedFetch(
    API_BASE_URL + "/audit-log/dash",
    {},
    undefined,
    event
  );
  const text = await res.text();
  const data = JSON.parse(text);

  return { data };
};
