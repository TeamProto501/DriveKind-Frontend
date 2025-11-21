// src/routes/driver/schedule/+page.server.ts
import { createSupabaseServerClient } from "$lib/supabase.server";
import { redirect, fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {
  const supabase = createSupabaseServerClient(event);
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    throw redirect(302, "/login");
  }

  const { data: unavailabilityData, error: unavailError } = await supabase
    .from("driver_unavailability")
    .select("*")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  if (unavailError) {
    console.error("Error fetching unavailability:", unavailError);
    return { data: [] };
  }

  return { data: unavailabilityData || [] };
};

// CalendarDate.toString() already returns YYYY-MM-DD
function formatDate(calendarDateString: string): string {
  return calendarDateString;
}

// Normalize <input type="time"> value for Postgres `time` column
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

function dayNameToDayNumber(dayName: string): number {
  const dayMap: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6
  };
  return dayMap[dayName] ?? 1;
}

export const actions: Actions = {
  // =========================
  // ONE-TIME (specific date)
  // =========================
  createSpecificUnavailability: async (event) => {
    try {
      const supabase = createSupabaseServerClient(event);
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session) {
        return fail(401, { error: "Unauthorized" });
      }

      const formData = await event.request.formData();
      const dateRaw = formData.get("date") as string;
      const startTimeRaw = (formData.get("startTime") as string) || "";
      const endTimeRaw = (formData.get("endTime") as string) || "";
      const allDay = formData.get("allDay-specific") === "true";
      const reason = (formData.get("reason") as string) || "";

      if (!dateRaw) {
        return fail(400, { error: "Please select a date" });
      }

      const start_date = formatDate(dateRaw);
      const start_time = allDay ? null : normalizeTime(startTimeRaw);
      const end_time = allDay ? null : normalizeTime(endTimeRaw);

      if (!allDay && (!start_time || !end_time)) {
        return fail(400, { error: "Please provide start and end times" });
      }

      const unavailabilityData = {
        user_id: session.user.id,
        unavailability_type: "One-time" as const,
        all_day: allDay,
        reason: reason || null,
        // One-time semantics:
        // - All day: start_date only; no end_date, no times
        // - Timed: start_date + start_time/end_time; end_date null
        start_date,
        end_date: null,
        start_time,
        end_time,
        days_of_week: null as number[] | null
      };

      const { error: insertError } = await supabase
        .from("driver_unavailability")
        .insert(unavailabilityData);

      if (insertError) {
        console.error("Error inserting one-time unavailability:", insertError);
        return fail(500, { error: insertError.message });
      }

      return { success: true };
    } catch (err) {
      console.error("Error creating specific unavailability:", err);
      return fail(500, {
        error: `Failed to create unavailability: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      });
    }
  },

  // =========================
  // DATE RANGE (multi-day)
  // =========================
  createRangeUnavailability: async (event) => {
    try {
      const supabase = createSupabaseServerClient(event);
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session) {
        return fail(401, { error: "Unauthorized" });
      }

      const formData = await event.request.formData();
      const startDateRaw = formData.get("startDate") as string;
      const endDateRaw = formData.get("endDate") as string;
      const allDay = formData.get("allDay-range") === "true";
      const startTimeRaw = (formData.get("startTime") as string) || "";
      const endTimeRaw = (formData.get("endTime") as string) || "";
      const reason = (formData.get("reason") as string) || "";

      if (!startDateRaw || !endDateRaw) {
        return fail(400, { error: "Please provide start and end dates" });
      }

      if (endDateRaw < startDateRaw) {
        return fail(400, {
          error: "End date must be on or after start date"
        });
      }

      const start_date = startDateRaw;
      const end_date = endDateRaw;

      const start_time = allDay ? null : normalizeTime(startTimeRaw);
      const end_time = allDay ? null : normalizeTime(endTimeRaw);

      if (!allDay && (!start_time || !end_time)) {
        return fail(400, {
          error: "Please provide times or mark as all day"
        });
      }

      const unavailabilityData = {
        user_id: session.user.id,
        unavailability_type: "Date range" as const,
        all_day: allDay,
        reason: reason || null,
        // Date range semantics:
        // - All day: start_date/end_date; no times
        // - Timed: start_date/end_date + start_time/end_time
        start_date,
        end_date,
        start_time,
        end_time,
        days_of_week: null as number[] | null
      };

      const { error: insertError } = await supabase
        .from("driver_unavailability")
        .insert(unavailabilityData);

      if (insertError) {
        console.error("Error inserting range unavailability:", insertError);
        return fail(500, { error: insertError.message });
      }

      return { success: true };
    } catch (err) {
      console.error("Error creating range unavailability:", err);
      return fail(500, {
        error: `Failed to create unavailability: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      });
    }
  },

  // =========================
  // WEEKLY RECURRING
  // =========================
  createRegularUnavailability: async (event) => {
    try {
      const supabase = createSupabaseServerClient(event);
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session) {
        return fail(401, { error: "Unauthorized" });
      }

      const formData = await event.request.formData();

      const days = formData.getAll("daysOfWeek") as string[];
      const allDay = formData.get("allDay") === "true";
      const startTimeRaw = (formData.get("startTime") as string) || "";
      const endTimeRaw = (formData.get("endTime") as string) || "";
      // In the new schema we don't strictly need an end_date for weekly,
      // but if you decide to use the "Ends on" field as a limit, we can
      // store it in end_date (optional).
      const endDateRaw = (formData.get("endDate") as string) || "";
      const reason = (formData.get("reason") as string) || "";

      if (!days || days.length === 0) {
        return fail(400, { error: "Please select at least one weekday" });
      }

      const start_time = allDay ? null : normalizeTime(startTimeRaw);
      const end_time = allDay ? null : normalizeTime(endTimeRaw);

      if (!allDay && (!start_time || !end_time)) {
        return fail(400, {
          error: "Please provide start and end times or mark as all day"
        });
      }

      const dayNumbers = days.map((dayName) => dayNameToDayNumber(dayName));

      const unavailabilityData = {
        user_id: session.user.id,
        unavailability_type: "Weekly" as const,
        all_day: allDay,
        reason: reason || null,
        // Weekly semantics:
        // - days_of_week = array of 0–6
        // - All day: null times
        // - Timed: start_time/end_time for those days
        days_of_week: dayNumbers,
        start_time,
        end_time,
        start_date: null as string | null,
        end_date: endDateRaw || null
      };

      const { error: insertError } = await supabase
        .from("driver_unavailability")
        .insert(unavailabilityData);

      if (insertError) {
        console.error("Error inserting weekly unavailability:", insertError);
        return fail(500, {
          error: `Failed to create weekly unavailability: ${insertError.message}`
        });
      }

      return { success: true };
    } catch (err) {
      console.error("Error creating regular (weekly) unavailability:", err);
      return fail(500, {
        error: `Failed to create unavailability: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      });
    }
  },

  // =========================
  // DELETE
  // =========================
  deleteUnavailability: async (event) => {
    try {
      const supabase = createSupabaseServerClient(event);
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session) {
        return fail(401, { error: "Unauthorized" });
      }

      const formData = await event.request.formData();
      const id = formData.get("id") as string;

      if (!id) {
        return fail(400, { error: "Unavailability ID is required" });
      }

      const { error: deleteError } = await supabase
        .from("driver_unavailability")
        .delete()
        .eq("id", parseInt(id))
        .eq("user_id", session.user.id);

      if (deleteError) {
        console.error("Error deleting unavailability:", deleteError);
        return fail(500, { error: deleteError.message });
      }

      return { success: true };
    } catch (err) {
      console.error("Error deleting unavailability:", err);
      return fail(500, {
        error: `Failed to delete unavailability: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      });
    }
  }
};