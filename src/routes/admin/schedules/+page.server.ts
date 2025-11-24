import { createSupabaseServerClient } from "$lib/supabase.server";
import { redirect, fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {
  const supabase = createSupabaseServerClient(event);

  // Use getUser() instead of getSession() for authenticated user
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw redirect(302, "/login");
  }

  // Get staff profile for current user to find their org
  const { data: staffProfile, error: staffError } = await supabase
    .from("staff_profiles")
    .select("org_id")
    .eq("user_id", user.id)
    .single();

  if (staffError || !staffProfile) {
    console.error("Error fetching staff profile:", staffError);
    return {
      drivers: [],
      selectedUserId: null,
      unavailability: [],
      error: "Could not determine your organization"
    };
  }

  // 🔹 ADMIN VERSION: all users in this org (no role filter)
  const { data: staffRaw, error: staffListError } = await supabase
    .from("staff_profiles")
    .select("user_id, first_name, last_name, role, org_id")
    .eq("org_id", staffProfile.org_id)
    .order("first_name", { ascending: true });

  if (staffListError) {
    console.error("Error fetching staff:", staffListError);
    return {
      drivers: [],
      selectedUserId: null,
      unavailability: [],
      error: "Failed to load users for your organization"
    };
  }

  // Keep the same shape the Svelte page expects (`drivers` array),
  // but it now represents *all* users in the org, not just drivers.
  const drivers =
    staffRaw?.map((d) => ({
      user_id: d.user_id,
      full_name: `${d.first_name} ${d.last_name}`.trim(),
      roles: d.role
    })) ?? [];

  // Determine which user is selected (query param ?driver_id=...)
  const url = event.url;
  const driverParam = url.searchParams.get("driver_id");
  let selectedUserId: string | null =
    driverParam || (drivers.length > 0 ? drivers[0].user_id : null);

  // Ensure selectedUserId is actually one of the users we loaded
  if (
    selectedUserId &&
    !drivers.some((d) => String(d.user_id) === String(selectedUserId))
  ) {
    selectedUserId = drivers.length > 0 ? drivers[0].user_id : null;
  }

  let unavailabilityData: any[] = [];
  let unavailErrorMessage: string | null = null;

  if (selectedUserId) {
    const { data: unavailability, error: unavailError } = await supabase
      .from("driver_unavailability")
      .select("*")
      .eq("user_id", selectedUserId)
      .order("created_at", { ascending: false });

    if (unavailError) {
      console.error("Error fetching unavailability:", unavailError);
      unavailErrorMessage = "Failed to load unavailability data";
    } else {
      unavailabilityData = unavailability || [];
    }
  }

  return {
    drivers,            // now "all users" in org
    selectedUserId,
    unavailability: unavailabilityData,
    error: unavailErrorMessage
  };
};

function normalizeTime(time: string | null): string | null {
  if (!time) return null;
  const parts = time.split(":");
  if (parts.length >= 2) {
    const hh = parts[0]?.padStart(2, "0") ?? "00";
    const mm = parts[1]?.padStart(2, "0") ?? "00";
    return `${hh}:${mm}:00`;
  }
  return time;
}

function validateFutureDate(dateStr: string): boolean {
  try {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  } catch {
    return false;
  }
}

function validateTimeRange(
  startTime: string | null,
  endTime: string | null
): boolean {
  if (!startTime || !endTime) return true;
  try {
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const startMinutes = sh * 60 + sm;
    const endMinutes = eh * 60 + em;
    return endMinutes > startMinutes;
  } catch {
    return false;
  }
}

export const actions: Actions = {
  createSpecificUnavailability: async (event) => {
    console.log("=== ADMIN: CREATE SPECIFIC UNAVAILABILITY ===");
    try {
      const supabase = createSupabaseServerClient(event);
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return fail(401, { error: "You must be logged in" });
      }

      const formData = await event.request.formData();
      const driverUserId = formData.get("driverUserId") as string;
      const dateRaw = formData.get("date") as string;
      const allDay = formData.get("allDay") === "true";
      const startTimeRaw = formData.get("startTime") as string;
      const endTimeRaw = formData.get("endTime") as string;
      const reason = (formData.get("reason") as string) || null;

      if (!driverUserId) {
        return fail(400, { error: "Please select a user" });
      }

      console.log("Form data received:", {
        driverUserId,
        dateRaw,
        allDay,
        startTimeRaw,
        endTimeRaw,
        reason
      });

      if (!dateRaw) {
        return fail(400, { error: "Please select a date" });
      }

      if (!validateFutureDate(dateRaw)) {
        return fail(400, { error: "Date must be today or in the future" });
      }

      const start_time = allDay ? null : normalizeTime(startTimeRaw);
      const end_time = allDay ? null : normalizeTime(endTimeRaw);

      if (!allDay) {
        if (!start_time || !end_time) {
          return fail(400, {
            error: "Please provide both start and end times"
          });
        }
        if (!validateTimeRange(start_time, end_time)) {
          return fail(400, { error: "End time must be after start time" });
        }
      }

      const insertData = {
        user_id: driverUserId,
        unavailability_type: "One-Time",
        all_day: allDay,
        start_date: dateRaw,
        end_date: null,
        start_time,
        end_time,
        days_of_week: null,
        reason
      };

      console.log("About to insert:", insertData);

      const { data: inserted, error: insertError } = await supabase
        .from("driver_unavailability")
        .insert(insertData)
        .select();

      if (insertError) {
        console.error("=== SUPABASE INSERT ERROR ===");
        console.error("Error object:", insertError);
        return fail(500, {
          error: `Database error: ${insertError.message}. Check server logs for details.`
        });
      }

      console.log("Successfully inserted:", inserted);
      return { success: true };
    } catch (err: any) {
      console.error("=== CAUGHT EXCEPTION ===");
      console.error(err);
      return fail(500, { error: `Exception: ${err.message}` });
    }
  },

  createRangeUnavailability: async (event) => {
    console.log("=== ADMIN: CREATE RANGE UNAVAILABILITY ===");
    try {
      const supabase = createSupabaseServerClient(event);
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return fail(401, { error: "You must be logged in" });
      }

      const formData = await event.request.formData();
      const driverUserId = formData.get("driverUserId") as string;
      const startDateRaw = formData.get("startDate") as string;
      const endDateRaw = formData.get("endDate") as string;
      const allDay = formData.get("allDay") === "true";
      const startTimeRaw = formData.get("startTime") as string;
      const endTimeRaw = formData.get("endTime") as string;
      const reason = (formData.get("reason") as string) || null;

      if (!driverUserId) {
        return fail(400, { error: "Please select a user" });
      }

      console.log("Form data received:", {
        driverUserId,
        startDateRaw,
        endDateRaw,
        allDay,
        startTimeRaw,
        endTimeRaw,
        reason
      });

      if (!startDateRaw || !endDateRaw) {
        return fail(400, {
          error: "Please provide both start and end dates"
        });
      }

      if (endDateRaw < startDateRaw) {
        return fail(400, {
          error: "End date must be on or after start date"
        });
      }

      if (!validateFutureDate(startDateRaw)) {
        return fail(400, {
          error: "Start date must be today or in the future"
        });
      }

      const start_time = allDay ? null : normalizeTime(startTimeRaw);
      const end_time = allDay ? null : normalizeTime(endTimeRaw);

      if (!allDay) {
        if (!start_time || !end_time) {
          return fail(400, {
            error: "Please provide both start and end times"
          });
        }
        if (!validateTimeRange(start_time, end_time)) {
          return fail(400, { error: "End time must be after start time" });
        }
      }

      const insertData = {
        user_id: driverUserId,
        unavailability_type: "Date Range",
        all_day: allDay,
        start_date: startDateRaw,
        end_date: endDateRaw,
        start_time,
        end_time,
        days_of_week: null,
        reason
      };

      console.log("About to insert:", insertData);

      const { data: inserted, error: insertError } = await supabase
        .from("driver_unavailability")
        .insert(insertData)
        .select();

      if (insertError) {
        console.error("=== SUPABASE INSERT ERROR ===");
        console.error("Error object:", insertError);
        return fail(500, {
          error: `Database error: ${insertError.message}. Check server logs for details.`
        });
      }

      console.log("Successfully inserted:", inserted);
      return { success: true };
    } catch (err: any) {
      console.error("=== CAUGHT EXCEPTION ===");
      console.error(err);
      return fail(500, { error: `Exception: ${err.message}` });
    }
  },

  createRegularUnavailability: async (event) => {
    console.log("=== ADMIN: CREATE WEEKLY UNAVAILABILITY ===");
    try {
      const supabase = createSupabaseServerClient(event);
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return fail(401, { error: "You must be logged in" });
      }

      const formData = await event.request.formData();
      const driverUserId = formData.get("driverUserId") as string;
      const daysRaw = formData.getAll("daysOfWeek") as string[];
      const allDay = formData.get("allDay") === "true";
      const startTimeRaw = formData.get("startTime") as string;
      const endTimeRaw = formData.get("endTime") as string;
      const endDateRaw = (formData.get("endDate") as string) || null;
      const reason = (formData.get("reason") as string) || null;

      if (!driverUserId) {
        return fail(400, { error: "Please select a user" });
      }

      console.log("Form data received:", {
        driverUserId,
        daysRaw,
        allDay,
        startTimeRaw,
        endTimeRaw,
        endDateRaw,
        reason
      });

      if (!daysRaw || daysRaw.length === 0) {
        return fail(400, {
          error: "Please select at least one day of the week"
        });
      }

      const daysOfWeek = daysRaw
        .map((d) => parseInt(d, 10))
        .filter((n) => !isNaN(n));
      console.log("Parsed days of week:", daysOfWeek);

      if (daysOfWeek.length === 0) {
        return fail(400, { error: "Invalid days selected" });
      }

      const start_time = allDay ? null : normalizeTime(startTimeRaw);
      const end_time = allDay ? null : normalizeTime(endTimeRaw);

      if (!allDay) {
        if (!start_time || !end_time) {
          return fail(400, {
            error: "Please provide both start and end times"
          });
        }
        if (!validateTimeRange(start_time, end_time)) {
          return fail(400, { error: "End time must be after start time" });
        }
      }

      if (endDateRaw && !validateFutureDate(endDateRaw)) {
        return fail(400, { error: "End date must be in the future" });
      }

      const insertData = {
        user_id: driverUserId,
        unavailability_type: "Weekly",
        all_day: allDay,
        start_date: null,
        end_date: endDateRaw,
        start_time,
        end_time,
        days_of_week: daysOfWeek,
        reason
      };

      console.log("About to insert:", insertData);

      const { data: inserted, error: insertError } = await supabase
        .from("driver_unavailability")
        .insert(insertData)
        .select();

      if (insertError) {
        console.error("=== SUPABASE INSERT ERROR ===");
        console.error("Error object:", insertError);
        return fail(500, {
          error: `Database error: ${insertError.message}. Check server logs for details.`
        });
      }

      console.log("Successfully inserted:", inserted);
      return { success: true };
    } catch (err: any) {
      console.error("=== CAUGHT EXCEPTION ===");
      console.error(err);
      return fail(500, { error: `Exception: ${err.message}` });
    }
  },

  deleteUnavailability: async (event) => {
    console.log("=== ADMIN: DELETE UNAVAILABILITY ===");
    try {
      const supabase = createSupabaseServerClient(event);
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return fail(401, { error: "You must be logged in" });
      }

      const formData = await event.request.formData();
      const id = formData.get("id") as string;
      const driverUserId = formData.get("driverUserId") as string;

      if (!id || !driverUserId) {
        return fail(400, { error: "Invalid unavailability or user ID" });
      }

      const { error: deleteError } = await supabase
        .from("driver_unavailability")
        .delete()
        .eq("id", parseInt(id))
        .eq("user_id", driverUserId);

      if (deleteError) {
        console.error("Error deleting unavailability:", deleteError);
        return fail(500, { error: "Failed to delete unavailability" });
      }

      return { success: true };
    } catch (err: any) {
      console.error("Error deleting unavailability:", err);
      return fail(500, { error: "An unexpected error occurred" });
    }
  }
};