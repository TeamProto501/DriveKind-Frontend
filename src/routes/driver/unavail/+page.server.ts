// src/routes/driver/unavail/+page.server.ts
import { createSupabaseServerClient } from "$lib/supabase.server";
import { redirect, fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {
  const supabase = createSupabaseServerClient(event);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw redirect(302, "/login");
  }

  // Fetch all unavailability for this driver
  const { data: unavailabilityData, error: unavailError } = await supabase
    .from("driver_unavailability")
    .select("*")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  if (unavailError) {
    console.error("Error fetching unavailability:", unavailError);
    return { data: [], error: "Failed to load unavailability data" };
  }

  return { data: unavailabilityData || [] };
};

// Helper: Normalize time input (HH:MM format)
function normalizeTime(time: string | null): string | null {
  if (!time) return null;
  const parts = time.split(":");
  if (parts.length >= 2) {
    const hh = parts[0]?.padStart(2, "0") ?? "00";
    const mm = parts[1]?.padStart(2, "0") ?? "00";
    return `${hh}:${mm}`;
  }
  return time;
}

// Helper: Validate date is in the future
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

// Helper: Validate time range
function validateTimeRange(startTime: string | null, endTime: string | null): boolean {
  if (!startTime || !endTime) return true; // Skip if either is null
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
  // =========================
  // ONE-TIME (specific date)
  // =========================
  createSpecificUnavailability: async (event) => {
    try {
      const supabase = createSupabaseServerClient(event);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        return fail(401, { error: "You must be logged in" });
      }

      const formData = await event.request.formData();
      const dateRaw = formData.get("date") as string;
      const allDay = formData.get("allDay") === "true";
      const startTimeRaw = formData.get("startTime") as string;
      const endTimeRaw = formData.get("endTime") as string;
      const reason = (formData.get("reason") as string) || null;

      // Validation
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
          return fail(400, { error: "Please provide both start and end times" });
        }
        if (!validateTimeRange(start_time, end_time)) {
          return fail(400, { error: "End time must be after start time" });
        }
      }

      // Insert
      const { error: insertError } = await supabase
        .from("driver_unavailability")
        .insert({
          user_id: session.user.id,
          unavailability_type: "One-time",
          all_day: allDay,
          start_date: dateRaw,
          end_date: null,
          start_time,
          end_time,
          days_of_week: null,
          reason
        });

      if (insertError) {
        console.error("Error inserting one-time unavailability:", insertError);
        return fail(500, { error: "Failed to save unavailability" });
      }

      return { success: true };
    } catch (err) {
      console.error("Error creating specific unavailability:", err);
      return fail(500, { error: "An unexpected error occurred" });
    }
  },

  // =========================
  // DATE RANGE (multi-day)
  // =========================
  createRangeUnavailability: async (event) => {
    try {
      const supabase = createSupabaseServerClient(event);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        return fail(401, { error: "You must be logged in" });
      }

      const formData = await event.request.formData();
      const startDateRaw = formData.get("startDate") as string;
      const endDateRaw = formData.get("endDate") as string;
      const allDay = formData.get("allDay") === "true";
      const startTimeRaw = formData.get("startTime") as string;
      const endTimeRaw = formData.get("endTime") as string;
      const reason = (formData.get("reason") as string) || null;

      // Validation
      if (!startDateRaw || !endDateRaw) {
        return fail(400, { error: "Please provide both start and end dates" });
      }

      if (endDateRaw < startDateRaw) {
        return fail(400, { error: "End date must be on or after start date" });
      }

      if (!validateFutureDate(startDateRaw)) {
        return fail(400, { error: "Start date must be today or in the future" });
      }

      const start_time = allDay ? null : normalizeTime(startTimeRaw);
      const end_time = allDay ? null : normalizeTime(endTimeRaw);

      if (!allDay) {
        if (!start_time || !end_time) {
          return fail(400, { error: "Please provide both start and end times" });
        }
        if (!validateTimeRange(start_time, end_time)) {
          return fail(400, { error: "End time must be after start time" });
        }
      }

      // Insert
      const { error: insertError } = await supabase
        .from("driver_unavailability")
        .insert({
          user_id: session.user.id,
          unavailability_type: "Date range",
          all_day: allDay,
          start_date: startDateRaw,
          end_date: endDateRaw,
          start_time,
          end_time,
          days_of_week: null,
          reason
        });

      if (insertError) {
        console.error("Error inserting range unavailability:", insertError);
        return fail(500, { error: "Failed to save date range unavailability" });
      }

      return { success: true };
    } catch (err) {
      console.error("Error creating range unavailability:", err);
      return fail(500, { error: "An unexpected error occurred" });
    }
  },

  // =========================
  // WEEKLY RECURRING
  // =========================
  createRegularUnavailability: async (event) => {
    try {
      const supabase = createSupabaseServerClient(event);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        return fail(401, { error: "You must be logged in" });
      }

      const formData = await event.request.formData();
      const daysRaw = formData.getAll("daysOfWeek") as string[];
      const allDay = formData.get("allDay") === "true";
      const startTimeRaw = formData.get("startTime") as string;
      const endTimeRaw = formData.get("endTime") as string;
      const endDateRaw = (formData.get("endDate") as string) || null;
      const reason = (formData.get("reason") as string) || null;

      // Validation
      if (!daysRaw || daysRaw.length === 0) {
        return fail(400, { error: "Please select at least one day of the week" });
      }

      // Convert day strings to numbers
      const daysOfWeek = daysRaw.map(d => parseInt(d, 10)).filter(n => !isNaN(n));

      if (daysOfWeek.length === 0) {
        return fail(400, { error: "Invalid days selected" });
      }

      const start_time = allDay ? null : normalizeTime(startTimeRaw);
      const end_time = allDay ? null : normalizeTime(endTimeRaw);

      if (!allDay) {
        if (!start_time || !end_time) {
          return fail(400, { error: "Please provide both start and end times" });
        }
        if (!validateTimeRange(start_time, end_time)) {
          return fail(400, { error: "End time must be after start time" });
        }
      }

      if (endDateRaw && !validateFutureDate(endDateRaw)) {
        return fail(400, { error: "End date must be in the future" });
      }

      // Insert
      const { error: insertError } = await supabase
        .from("driver_unavailability")
        .insert({
          user_id: session.user.id,
          unavailability_type: "Weekly",
          all_day: allDay,
          start_date: null,
          end_date: endDateRaw,
          start_time,
          end_time,
          days_of_week: daysOfWeek,
          reason
        });

      if (insertError) {
        console.error("Error inserting weekly unavailability:", insertError);
        return fail(500, { error: "Failed to save weekly unavailability" });
      }

      return { success: true };
    } catch (err) {
      console.error("Error creating weekly unavailability:", err);
      return fail(500, { error: "An unexpected error occurred" });
    }
  },

  // =========================
  // DELETE
  // =========================
  deleteUnavailability: async (event) => {
    try {
      const supabase = createSupabaseServerClient(event);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        return fail(401, { error: "You must be logged in" });
      }

      const formData = await event.request.formData();
      const id = formData.get("id") as string;

      if (!id) {
        return fail(400, { error: "Invalid unavailability ID" });
      }

      // Delete only if it belongs to this user
      const { error: deleteError } = await supabase
        .from("driver_unavailability")
        .delete()
        .eq("id", parseInt(id))
        .eq("user_id", session.user.id);

      if (deleteError) {
        console.error("Error deleting unavailability:", deleteError);
        return fail(500, { error: "Failed to delete unavailability" });
      }

      return { success: true };
    } catch (err) {
      console.error("Error deleting unavailability:", err);
      return fail(500, { error: "An unexpected error occurred" });
    }
  }
};