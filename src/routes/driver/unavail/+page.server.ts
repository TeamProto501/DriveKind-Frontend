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

function formatDate(calendarDateString: string): string {
  // CalendarDate.toString() already returns YYYY-MM-DD
  return calendarDateString;
}

function formatTime(time: string): string {
  if (!time) return "";
  return time.includes(":") && time.split(":").length === 2
    ? `${time}:00`
    : time;
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
  // ONE-TIME (specific date)
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
      const date = formData.get("date") as string;
      const startTime = formData.get("startTime") as string;
      const endTime = formData.get("endTime") as string;
      const allDay = formData.get("allDay-specific") === "true";
      const reason = formData.get("reason") as string;

      if (!date) {
        return fail(400, { error: "Please select a date" });
      }

      if (!allDay && (!startTime || !endTime)) {
        return fail(400, { error: "Please provide start and end times" });
      }

      const unavailabilityData = {
        user_id: session.user.id,
        unavailable_date: formatDate(date),
        start_time: allDay ? null : formatTime(startTime),
        end_time: allDay ? null : formatTime(endTime),
        all_day: allDay,
        reason: reason || null,
        recurring: false,
        recurrence_pattern: null,
        days_of_week: null,
        recurrence_end_date: null,
        repeating_day: null
      };

      const { error: insertError } = await supabase
        .from("driver_unavailability")
        .insert(unavailabilityData);

      if (insertError) {
        console.error("Error inserting unavailability:", insertError);
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

  // RANGE (multi-day) - stored as recurring daily pattern
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
      const startDate = formData.get("startDate") as string;
      const endDate = formData.get("endDate") as string;
      const allDay = formData.get("allDay-range") === "true";
      const startTime = formData.get("startTime") as string;
      const endTime = formData.get("endTime") as string;
      const reason = formData.get("reason") as string;

      if (!startDate || !endDate) {
        return fail(400, { error: "Please provide start and end dates" });
      }

      if (endDate < startDate) {
        return fail(400, { error: "End date must be on or after start date" });
      }

      if (!allDay && (!startTime || !endTime)) {
        return fail(400, {
          error: "Please provide times or mark as all day"
        });
      }

      const unavailabilityData = {
        user_id: session.user.id,
        unavailable_date: startDate,
        recurring: true,
        recurrence_pattern: "daily", // we use daily pattern for date ranges
        days_of_week: null,
        recurrence_end_date: endDate,
        start_time: allDay ? null : formatTime(startTime),
        end_time: allDay ? null : formatTime(endTime),
        all_day: allDay,
        reason: reason || null,
        repeating_day: null
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

  // WEEKLY recurring - each selected day gets its own row
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
      const startTime = (formData.get("startTime") as string) || "";
      const endTime = (formData.get("endTime") as string) || "";
      const endDateRaw = formData.get("endDate") as string | null;
      const endDate = endDateRaw && endDateRaw.trim() !== "" ? endDateRaw : null;
      const reason = (formData.get("reason") as string) || "";

      if (!days || days.length === 0) {
        return fail(400, { error: "Please select at least one weekday" });
      }

      if (!allDay && (!startTime || !endTime)) {
        return fail(400, {
          error: "Please provide start and end times or mark as all day"
        });
      }

      // Build one row per selected weekday
      const rows = days.map((dayName) => {
        const dayNumber = dayNameToDayNumber(dayName);

        return {
          user_id: session.user.id,
          unavailable_date: null, // not a specific single date
          recurring: true,
          recurrence_pattern: "weekly",
          days_of_week: dayNumber, // int4 column
          recurrence_end_date: endDate, // may be null if no end date
          start_time: allDay ? null : formatTime(startTime),
          end_time: allDay ? null : formatTime(endTime),
          all_day: allDay,
          reason: reason || null,
          repeating_day: dayName // single day_enum value, e.g. "Sunday"
        };
      });

      const { error: insertError } = await supabase
        .from("driver_unavailability")
        .insert(rows);

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

  // DELETE
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