import { createSupabaseServerClient } from "$lib/supabase.server";
import { error, redirect, fail } from "@sveltejs/kit";
import type { Actions } from "./$types";

export const load = async (event) => {
  const supabase = createSupabaseServerClient(event);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw redirect(302, '/login');
  }

  // Fetch user's unavailability
  const { data: unavailabilityData, error: unavailError } = await supabase
    .from('driver_unavailability')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  if (unavailError) {
    console.error('Error fetching unavailability:', unavailError);
    return { data: [] };
  }

  return { data: unavailabilityData || [] };
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
        recurring: false,
        recurrence_pattern: null,
        days_of_week: null,
        recurrence_end_date: null,
        repeating_day: null
      };

      const { error: insertError } = await supabase
        .from('driver_unavailability')
        .insert(unavailabilityData);

      if (insertError) {
        console.error('Error inserting unavailability:', insertError);
        return fail(500, { error: insertError.message });
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

      // Calculate start and end dates
      const today = new Date();
      const startDate = today.toISOString().split('T')[0];
      const endDate = new Date(today);
      endDate.setFullYear(endDate.getFullYear() + 1);
      const endDateStr = endDate.toISOString().split('T')[0];

      // Insert recurring unavailability records
      const results = [];
      for (const dateData of dates) {
        const dayNumber = dayNameToDayNumber(dateData.selectedDay);
        
        const unavailabilityData = {
          user_id: session.user.id,
          unavailable_date: startDate,
          recurring: true,
          recurrence_pattern: 'weekly',
          days_of_week: [dayNumber],
          recurrence_end_date: endDateStr,
          start_time: dateData.startTime ? formatTime(dateData.startTime) : null,
          end_time: dateData.endTime ? formatTime(dateData.endTime) : null,
          all_day: dateData.allDay,
          reason: dateData.reason,
          repeating_day: dateData.selectedDay // Keep for backward compatibility
        };

        const { error: insertError } = await supabase
          .from('driver_unavailability')
          .insert(unavailabilityData);

        if (insertError) {
          console.error('Error inserting unavailability:', insertError);
          return fail(500, {
            error: `Failed to create unavailability for ${dateData.selectedDay}: ${insertError.message}`
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
      const supabase = createSupabaseServerClient(event);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        return fail(401, { error: 'Unauthorized' });
      }

      const formData = await event.request.formData();
      const id = formData.get("id") as string;

      if (!id) {
        return fail(400, { error: "Unavailability ID is required" });
      }

      const { error: deleteError } = await supabase
        .from('driver_unavailability')
        .delete()
        .eq('id', parseInt(id))
        .eq('user_id', session.user.id); // Security: only delete own records

      if (deleteError) {
        console.error('Error deleting unavailability:', deleteError);
        return fail(500, { error: deleteError.message });
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