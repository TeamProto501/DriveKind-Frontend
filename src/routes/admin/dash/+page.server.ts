import { authenticatedFetch, API_BASE_URL } from "$lib/api";

//initial data load to table
export const load = async (event) => {
  const tab = event.url.searchParams.get("tab") ?? "clients";
  const endpoint =
    tab === "drivers"
      ? "/driver/dash"
      : tab === "volunteer"
      ? "/volunteer/dash"
      : "/clients/dash";
  const res = await authenticatedFetch(
    API_BASE_URL + "/clients/dash",
    {},
    undefined,
    event
  );
  const text = await res.text();
  const data = JSON.parse(text);

  return { tab, data };
};
