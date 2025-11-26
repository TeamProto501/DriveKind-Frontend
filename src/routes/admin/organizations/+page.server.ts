// src/routes/admin/organizations/+page.server.ts
import { createSupabaseServerClient } from "$lib/supabase.server";
import { redirect, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async (event) => {
  const supabase = createSupabaseServerClient(event);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw redirect(302, "/login");
  }

  const { data: organizations, error } = await supabase
    .from("organization")
    .select("*")
    .order("org_id", { ascending: true });

  if (error) {
    console.error("Error loading organizations:", error);
    return {
      organizations: [],
      error: "Failed to load organizations: " + error.message,
    };
  }

  return {
    organizations: (organizations || []).sort(
      (a, b) => (a.org_id ?? 0) - (b.org_id ?? 0)
    ),
  };
};

export const actions: Actions = {
  addOrganization: async (event) => {
    const supabase = createSupabaseServerClient(event);
    const formData = await event.request.formData();

    const payload: Record<string, any> = {};

    for (const [key, value] of formData.entries()) {
      payload[key] = value === "" ? null : value;
    }

    // Coerce numeric fields
    const numericKeys = ["client_min_age", "min_days_in_advance_for_ride_requests", "client_max_weekly_rides"];
    for (const k of numericKeys) {
      if (payload[k] === null || payload[k] === undefined || payload[k] === "") {
        payload[k] = null;
      } else {
        const n = Number(payload[k]);
        payload[k] = isNaN(n) ? null : n;
      }
    }

    // Remap fields for database
    if ("days_off" in payload) {
      payload["days-off"] = payload.days_off;
      delete payload.days_off;
    }
    if ("org_status" in payload) {
      payload.org_status_enum = payload.org_status;
      delete payload.org_status;
    }

    delete payload.org_creation_date;
    delete payload.first_ride_date;
    delete payload.last_activity_in_portal;

    const { error } = await supabase
      .from("organization")
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error("Error adding organization:", error);
      return fail(500, { error: "Failed to add organization: " + error.message });
    }

    return { success: true, message: "Organization added successfully!" };
  },

  updateOrganization: async (event) => {
    const supabase = createSupabaseServerClient(event);
    const formData = await event.request.formData();

    const orgId = formData.get("org_id") as string;
    if (!orgId) {
      return fail(400, { error: "Missing organization ID" });
    }

    const payload: Record<string, any> = {};

    for (const [key, value] of formData.entries()) {
      if (key === "org_id") continue;
      payload[key] = value === "" ? null : value;
    }

    const numericKeys = ["client_min_age", "min_days_in_advance_for_ride_requests", "client_max_weekly_rides"];
    for (const k of numericKeys) {
      if (payload[k] === null || payload[k] === undefined || payload[k] === "") {
        payload[k] = null;
      } else {
        const n = Number(payload[k]);
        payload[k] = isNaN(n) ? null : n;
      }
    }

    if ("days_off" in payload) {
      payload["days-off"] = payload.days_off;
      delete payload.days_off;
    }
    if ("org_status" in payload) {
      payload.org_status_enum = payload.org_status;
      delete payload.org_status;
    }

    delete payload.org_creation_date;
    delete payload.first_ride_date;
    delete payload.last_activity_in_portal;

    const { error } = await supabase
      .from("organization")
      .update(payload)
      .eq("org_id", parseInt(orgId));

    if (error) {
      console.error("Error updating organization:", error);
      return fail(500, { error: "Failed to update organization: " + error.message });
    }

    return { success: true, message: "Organization updated successfully!" };
  },

  toggleStatus: async (event) => {
    const supabase = createSupabaseServerClient(event);
    const formData = await event.request.formData();

    const orgId = formData.get("org_id") as string;
    const currentStatus = formData.get("current_status") as string;

    if (!orgId) {
      return fail(400, { error: "Missing organization ID" });
    }

    const newStatus = currentStatus === "Active" ? "Inactive" : "Active";

    const { error } = await supabase
      .from("organization")
      .update({ org_status_enum: newStatus })
      .eq("org_id", parseInt(orgId));

    if (error) {
      console.error("Error toggling status:", error);
      return fail(500, { error: "Failed to update status: " + error.message });
    }

    return { success: true, message: `Organization marked as ${newStatus}.` };
  },

  deleteOrganization: async (event) => {
    const supabase = createSupabaseServerClient(event);
    const formData = await event.request.formData();

    const orgId = formData.get("org_id") as string;
    const password = formData.get("password") as string;

    if (!orgId) {
      return fail(400, { error: "Missing organization ID" });
    }

    if (!password) {
      return fail(400, { error: "Password is required to delete an organization" });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      return fail(401, { error: "Unable to verify user identity" });
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: password,
    });

    if (signInError) {
      return fail(401, { error: "Invalid password. Please try again." });
    }

    const { error } = await supabase
      .from("organization")
      .delete()
      .eq("org_id", parseInt(orgId));

    if (error) {
      console.error("Error deleting organization:", error);
      return fail(500, { error: "Failed to delete organization: " + error.message });
    }

    return { success: true, message: "Organization deleted successfully!" };
  },
};