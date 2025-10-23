import { authenticatedFetchServer, API_BASE_URL } from "$lib/api.server";
import { error, redirect, fail } from "@sveltejs/kit";
import type { Actions } from "./$types";
import { createSupabaseServerClient } from "$lib/supabase.server";

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
        unavailable_date: formatDate(date), // YYYY-MM-DD
        start_time: allDay ? null : formatTime(startTime), // HH:MM:SS or null
        end_time: allDay ? null : formatTime(endTime), // HH:MM:SS or null
        all_day: allDay, // boolean
        reason: reason,
        repeating_day: null, // specific date = null
      };

      // call api
      const response = await authenticatedFetchServer(
        `${API_BASE_URL}/driver-unavailability`,
        {
          method: "POST",
          body: JSON.stringify(unavailabilityData),
        },
        event
      );

      if (!response.ok) {
        const errorData = await response.json();
        return fail(response.status, {
          error: errorData.error || "Failed to create unavailability",
        });
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
      const formData = await event.request.formData();

      const numberOfDates = parseInt(formData.get("numberOfDate") as string);

      if (!numberOfDates || numberOfDates < 1) {
        return fail(400, { error: "Invalid number of dates" });
      }

      // Parse dates on FormData
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

      // Send Dates to db individually
      const results = [];
      for (const dateData of dates) {
        const unavailabilityData = {
          repeating_day: dateData.selectedDay, // day_enum (Monday, Tuesday, etc.)
          start_time: dateData.startTime
            ? formatTime(dateData.startTime)
            : null, // HH:MM:SS or null
          end_time: dateData.endTime ? formatTime(dateData.endTime) : null, // HH:MM:SS or null
          all_day: dateData.allDay, // boolean
          reason: dateData.reason,
          unavailable_date: null, // regular date = null
        };

        const response = await authenticatedFetchServer(
          `${API_BASE_URL}/driver-unavailability`,
          {
            method: "POST",
            body: JSON.stringify(unavailabilityData),
          },
          event
        );

        if (!response.ok) {
          const errorData = await response.json();
          return fail(response.status, {
            error:
              errorData.error ||
              `Failed to create unavailability for ${dateData.selectedDay}`,
          });
        }

        const result = await response.json();
        results.push(result);
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
  updateUnavail: async (event) => {
    try {
      const formData = await event.request.formData();
      const id = formData.get("id") as string;

      if (!id) {
        return fail(400, { error: "Unavailability ID is required" });
      }

      const allDay = formData.get("allDay") === "true";
      const startTime = formData.get("startTime") as string;
      const endTime = formData.get("endTime") as string;
      const date = formData.get("date") as string;
      const repeatingDay = formData.get("repeating_day") as string | null;

      const unavailabilityData = {
        unavailable_date: date ? formatDate(date) : null, // YYYY-MM-DD or null
        start_time: allDay ? null : formatTime(startTime), // HH:MM:SS or null
        end_time: allDay ? null : formatTime(endTime), // HH:MM:SS or null
        all_day: allDay, // boolean
        reason: formData.get("reason") as string,
        repeating_day: repeatingDay, // day_enum or null
      };

      const response = await authenticatedFetchServer(
        `${API_BASE_URL}/driver-unavailability/${id}`,
        {
          method: "PUT",
          body: JSON.stringify(unavailabilityData),
        },
        event
      );

      if (!response.ok) {
        const errorData = await response.json();
        return fail(response.status, {
          error: errorData.error || "Failed to update unavailability",
        });
      }

      return { success: true };
    } catch (err) {
      console.error("Error updating unavailability:", err);
      return fail(500, {
        error: `Failed to update unavailability: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
      });
    }
  },
};
