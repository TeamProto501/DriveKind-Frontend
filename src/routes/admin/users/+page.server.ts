// src/routes/admin/users/+page.server.ts
import { authenticatedFetch, API_BASE_URL } from "$lib/api";
import { error } from "@sveltejs/kit";

export const load = async (event) => {
  try {
    // Define role endpoints you want to fetch
    const endpoints = [
      "clients/dash",
      "driver/dash",
      "dispatcher/dash"
    ];

    // Fetch all in parallel
    const results = await Promise.all(
      endpoints.map((ep) =>
        authenticatedFetch(`${API_BASE_URL}/${ep}`, {}, undefined, event)
      )
    );

    // Validate responses
    const failed = results.find((res) => !res.ok);
    if (failed) {
      throw error(failed.status, `Failed on ${failed.url}: ${failed.statusText}`);
    }

    // Parse all JSON and merge into single list
    const dataArrays = await Promise.all(results.map((res) => res.json()));
    const staffProfiles = dataArrays.flat();

    return { staffProfiles };
  } catch (err) {
    console.error("users/+page.server.ts load error:", err);
    throw error(500, "Failed to load staff profiles");
  }
};

