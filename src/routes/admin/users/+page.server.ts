// src/routes/admin/users/+page.server.ts
import { authenticatedFetch, API_BASE_URL } from "$lib/api";

export const load = async (event) => {
  const tab = event.url.searchParams.get("tab") ?? "clients";

  const res = await authenticatedFetch(
    `${API_BASE_URL}/staff-profiles`,
    {},
    undefined,
    event
  );

  const text = await res.text();
  let data;

  try {
    data = JSON.parse(text);
  } catch (err) {
    console.error("Failed to parse JSON:", text);
    throw new Error("Invalid API response from /staff-profiles");
  }

  return { tab, staffProfiles: data };
};



