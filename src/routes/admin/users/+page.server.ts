// src/routes/admin/users/+page.server.ts
import { authenticatedFetch, API_BASE_URL } from "$lib/api";
import { error } from "@sveltejs/kit";

export const load = async (event) => {
  try {
    const res = await authenticatedFetch(
      `${API_BASE_URL}/staff-profiles`,
      {},
      undefined,
      event
    );

    if (!res.ok) {
      throw error(res.status, `Failed to fetch staff profiles: ${res.statusText}`);
    }

    const data = await res.json();
    return { staffProfiles: data };
  } catch (err) {
    console.error("users/+page.server.ts load error:", err);
    throw error(500, "Failed to load staff profiles");
  }
};
