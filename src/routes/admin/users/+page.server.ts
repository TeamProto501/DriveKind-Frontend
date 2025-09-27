// src/routes/admin/users/+page.server.ts
import { authenticatedFetch, API_BASE_URL } from "$lib/api";

export const load = async (event) => {
  const tab = event.url.searchParams.get("tab") ?? "clients";

  const endpoint =
    tab === "drivers"
      ? "/driver/dash"
      : tab === "dispatcher"
      ? "/dispatcher/dash"
      : "/clients/dash";

  const res = await authenticatedFetch(`${API_BASE_URL}${endpoint}`, {}, undefined, event);
  const text = await res.text();
  let data;

  try {
    data = JSON.parse(text);
  } catch (err) {
    console.error("Failed to parse JSON:", text);
    throw new Error("Invalid API response for staff");
  }

  return { tab, staffProfiles: data };
};


