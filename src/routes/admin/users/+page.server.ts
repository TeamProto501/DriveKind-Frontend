// src/routes/admin/users/+page.server.ts
import { authenticatedFetch, API_BASE_URL } from "$lib/api";

export const load = async (event) => {
  const res = await authenticatedFetch(
    API_BASE_URL + "/staff-profiles", // 👈 create a /staff/dash API endpoint
    {},
    undefined,
    event
  );
  const text = await res.text();
  const data = JSON.parse(text);

  return { staffProfiles: data }; // passed as prop
};
