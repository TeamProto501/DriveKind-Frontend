import { authenticatedFetchServer, API_BASE_URL } from "$lib/api.server";
import { error, redirect, fail } from "@sveltejs/kit";
import type { Actions } from "./$types";
import { createSupabaseServerClient } from "$lib/supabase.server";

export const load = async (event) => {
  const res = await authenticatedFetchServer(
    API_BASE_URL + "/driver-unavailability/by-user",
    {},
    event
  );
  const text = await res.text();
  const data = JSON.parse(text);
  console.log(data);
  return { data };
};
function formatDate(calendarDateString: string): string {
  return calendarDateString;
}
function formatTime(time: string): string {
  if (!time) return "";
  return time.includes(":") && time.split(":").length === 2
    ? `${time}:00`
    : time;
}
export const actions: Actions = {
  createSpecificUnavailability: async (event) => {
    try {
      const supabase = createSupabaseServerClient(event);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        return fail(401, { error: 'Unauthorized' });
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

      if (!reason) {
        return fail(400, { error: "Please select a reason" });
      }

      const unavailabilityData = {
        user_id: session.user.id,
        unavailable_date: formatDate(date),
        start_time: allDay ? null : formatTime(startTime),
        end_time: allDay ? null : formatTime(endTime),
        all_day: allDay,
        reason: reason,
        recurring: false, // NOT recurring
        recurrence_pattern: null,
        days_of_week: null,
        recurrence_end_date: null,
        repeating_day: null
      };

      const { error } = await supabase
        .from('driver_unavailability')
        .insert(unavailabilityData);

      if (error) {
        console.error('Error inserting unavailability:', error);
        return fail(500, { error: error.message });
      }

      return { success: true };
    } catch (err) {
      console.error("Error creating specific unavailability:", err);
      return fail(500, {
        error: `Failed to create unavailability: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
      });
    }
  },

  createRegularUnavailability: async (event) => {
    try {
      const supabase = createSupabaseServerClient(event);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        return fail(401, { error: 'Unauthorized' });
      }

      const formData = await event.request.formData();
      const numberOfDates = parseInt(formData.get("numberOfDate") as string);

      if (!numberOfDates || numberOfDates < 1) {
        return fail(400, { error: "Invalid number of dates" });
      }

      // Parse dates from FormData
      const dates = [];
      for (let i = 0; i < numberOfDates; i++) {
        const selectedDay = formData.get(`dates[${i}][selectedDay]`) as string;
        const allDay = formData.get(`dates[${i}][allDay]`) === "true";
        const startTime = formData.get(`dates[${i}][startTime]`) as string;
        const endTime = formData.get(`dates[${i}][endTime]`) as string;
        const reason = formData.get(`dates[${i}][reason]`) as string;

        if (!selectedDay) {
          return fail(400, { error: `Please select a day for date #${i + 1}` });
        }

        if (!allDay && (!startTime || !endTime)) {
          return fail(400, {
            error: `Please provide times for date #${i + 1}`,
          });
        }

        if (!reason) {
          return fail(400, {
            error: `Please select a reason for date #${i + 1}`,
          });
        }

        dates.push({
          selectedDay,
          allDay,
          startTime: allDay ? null : startTime,
          endTime: allDay ? null : endTime,
          reason,
        });
      }

      // Convert day name to day number (0 = Sunday, 6 = Saturday)
      function dayNameToDayNumber(dayName: string): number {
        const dayMap: Record<string, number> = {
          'Sunday': 0,
          'Monday': 1,
          'Tuesday': 2,
          'Wednesday': 3,
          'Thursday': 4,
          'Friday': 5,
          'Saturday': 6
        };
        return dayMap[dayName] ?? 1; // Default to Monday
      }

      // Calculate end date (1 year from now)
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + 1);

      // Insert recurring unavailability records
      const results = [];
      for (const dateData of dates) {
        const dayNumber = dayNameToDayNumber(dateData.selectedDay);
        
        const unavailabilityData = {
          user_id: session.user.id,
          unavailable_date: startDate.toISOString().split('T')[0], // YYYY-MM-DD
          recurring: true,
          recurrence_pattern: 'weekly',
          days_of_week: [dayNumber], // Array of day numbers
          recurrence_end_date: endDate.toISOString().split('T')[0],
          start_time: dateData.startTime ? formatTime(dateData.startTime) : null,
          end_time: dateData.endTime ? formatTime(dateData.endTime) : null,
          all_day: dateData.allDay,
          reason: dateData.reason,
          repeating_day: null // Deprecated field, set to null
        };

        const { error } = await supabase
          .from('driver_unavailability')
          .insert(unavailabilityData);

        if (error) {
          console.error('Error inserting unavailability:', error);
          return fail(500, {
            error: `Failed to create unavailability for ${dateData.selectedDay}: ${error.message}`
          });
        }

        results.push(unavailabilityData);
      }

      return { success: true, results };
    } catch (err) {
      console.error("Error creating regular unavailability:", err);
      return fail(500, {
        error: `Failed to create unavailability: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
      });
    }
  },

  deleteUnavailability: async (event) => {
    try {
      const formData = await event.request.formData();
      const id = formData.get("id") as string;

      if (!id) {
        return fail(400, { error: "Unavailability ID is required" });
      }

      const response = await authenticatedFetchServer(
        `${API_BASE_URL}/driver-unavailability/${id}`,
        {
          method: "DELETE",
        },
        event
      );

      if (!response.ok) {
        const errorData = await response.json();
        return fail(response.status, {
          error: errorData.error || "Failed to delete unavailability",
        });
      }

      return { success: true };
    } catch (err) {
      console.error("Error deleting unavailability:", err);
      return fail(500, {
        error: `Failed to delete unavailability: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
      });
    }
  },
};
