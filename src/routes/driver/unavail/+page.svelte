<!-- src/routes/driver/schedule/+page.svelte -->
<script lang="ts">
  import { Switch } from "$lib/components/ui/switch/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import Calendar from "$lib/components/ui/calendar/calendar.svelte";
  import { CalendarDate } from "@internationalized/date";
  import { getLocalTimeZone, today } from "@internationalized/date";
  import * as NativeSelect from "$lib/components/ui/native-select/index.js";
  import { enhance } from "$app/forms";
  import type { ActionData, PageData } from "./$types";
  import Table from "./table.svelte";

  interface Props {
    data: PageData;
    form?: ActionData;
  }

  let { data, form }: Props = $props();

  // Tabs
  type TabId = "one-time" | "range" | "weekly";
  let activeTab = $state<TabId>("one-time");

  // One-time (specific date) state
  let oneTimeDate = $state<CalendarDate | undefined>(
    today(getLocalTimeZone())
  );
  let oneTimeAllDay = $state(false);
  let oneTimeStart = $state("");
  let oneTimeEnd = $state("");

  // Range (multi-day) state
  let rangeAllDay = $state(false);
  let rangeStartTime = $state("");
  let rangeEndTime = $state("");

  // Weekly recurring state
  const WEEK_DAYS = [
    { value: "Sunday", label: "Sun" },
    { value: "Monday", label: "Mon" },
    { value: "Tuesday", label: "Tue" },
    { value: "Wednesday", label: "Wed" },
    { value: "Thursday", label: "Thu" },
    { value: "Friday", label: "Fri" },
    { value: "Saturday", label: "Sat" }
  ];
  let weeklyAllDay = $state(false);
  let weeklyStartTime = $state("");
  let weeklyEndTime = $state("");
  let weeklyEndDate = $state("");

  // Helpers for tab classes
  function tabButtonClass(tab: TabId) {
    const base =
      "px-4 py-2 text-sm font-medium rounded-md border transition-colors";
    const active = "bg-blue-600 text-white border-blue-600 shadow-sm";
    const inactive =
      "bg-white text-gray-700 border-gray-200 hover:bg-gray-50";
    return `${base} ${activeTab === tab ? active : inactive}`;
  }
</script>

<svelte:head>
  <title>My Schedule - DriveKind</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">
        Unavailability / Vacations
      </h1>
      <p class="text-muted-foreground">
        Quickly set one-time, date range, and weekly unavailability.
      </p>
    </div>

    <div class="space-y-2">
      {#if form?.error}
        <div class="rounded-lg border border-red-200 bg-red-50 p-3 max-w-md">
          <p class="text-sm text-red-800">{form.error}</p>
        </div>
      {/if}

      {#if form?.success}
        <div class="rounded-lg border border-green-200 bg-green-50 p-3 max-w-md">
          <p class="text-sm text-green-800">Saved successfully.</p>
        </div>
      {/if}
    </div>
  </div>

  <!-- Existing unavailability table -->
  <div class="rounded-lg border bg-white p-6 shadow">
    <h2 class="text-lg font-semibold mb-3">My Unavailability</h2>
    <Table data={data || []} />
  </div>

  <!-- Tabs -->
  <div class="rounded-lg border bg-white p-6 shadow-xl">
    <div class="mb-4 border-b border-gray-200 pb-2 flex flex-wrap gap-2">
      <button
        type="button"
        class={tabButtonClass("one-time")}
        onclick={() => (activeTab = "one-time")}
      >
        One-time
      </button>
      <button
        type="button"
        class={tabButtonClass("range")}
        onclick={() => (activeTab = "range")}
      >
        Date range
      </button>
      <button
        type="button"
        class={tabButtonClass("weekly")}
        onclick={() => (activeTab = "weekly")}
      >
        Weekly
      </button>
    </div>

    <!-- One-time tab -->
    {#if activeTab === "one-time"}
      <form
        method="POST"
        action="?/createSpecificUnavailability"
        use:enhance
        class="space-y-6"
      >
        <h3 class="text-lg font-semibold">One-time unavailability</h3>
        <p class="text-sm text-gray-600">
          Use this for a single day off or a specific appointment.
        </p>

        <div>
          <Calendar
            type="single"
            bind:value={oneTimeDate}
            class="rounded-lg border shadow-sm"
            numberOfMonths={1}
          />
          <input type="hidden" name="date" value={oneTimeDate?.toString()} />
          {#if oneTimeDate}
            <p class="text-sm text-blue-600 font-medium mt-2">
              Selected: {oneTimeDate.toString()}
            </p>
          {/if}
        </div>

        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium">All day</p>
            <p class="text-xs text-gray-500">
              Turn this off to choose start and end times.
            </p>
          </div>
          <input type="hidden" name="allDay-specific" value={oneTimeAllDay} />
          <Switch
            bind:checked={oneTimeAllDay}
            class="bg-gray-400 data-[state=checked]:bg-blue-600"
          />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <label for="start-specific" class="text-sm font-medium">
              Start time
            </label>
            <Input
              type="time"
              id="start-specific"
              name="startTime"
              bind:value={oneTimeStart}
              disabled={oneTimeAllDay}
            />
          </div>
          <div class="space-y-2">
            <label for="end-specific" class="text-sm font-medium">
              End time
            </label>
            <Input
              type="time"
              id="end-specific"
              name="endTime"
              bind:value={oneTimeEnd}
              disabled={oneTimeAllDay}
            />
          </div>
        </div>

        <div>
          <label for="reason-specific" class="text-sm font-medium">
            Reason <span class="text-gray-500 font-normal">(optional)</span>
          </label>
          <NativeSelect.Root name="reason" id="reason-specific">
            <NativeSelect.Option value="">
              No reason specified
            </NativeSelect.Option>
            <NativeSelect.Option value="Holiday">Holiday</NativeSelect.Option>
            <NativeSelect.Option value="Personal">Personal</NativeSelect.Option>
            <NativeSelect.Option value="Medical">Medical</NativeSelect.Option>
            <NativeSelect.Option value="Appointment">
              Appointment
            </NativeSelect.Option>
          </NativeSelect.Root>
        </div>

        <button
          type="submit"
          class="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Save one-time unavailability
        </button>
      </form>
    {/if}

    <!-- Range tab -->
    {#if activeTab === "range"}
      <form
        method="POST"
        action="?/createRangeUnavailability"
        use:enhance
        class="space-y-6"
      >
        <h3 class="text-lg font-semibold">Unavailability for a date range</h3>
        <p class="text-sm text-gray-600">
          Use this for vacations or several days in a row. Times apply to each day in the range.
        </p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <label for="range-start-date" class="text-sm font-medium">
              Start date
            </label>
            <Input
              type="date"
              id="range-start-date"
              name="startDate"
              required
            />
          </div>
          <div class="space-y-2">
            <label for="range-end-date" class="text-sm font-medium">
              End date
            </label>
            <Input
              type="date"
              id="range-end-date"
              name="endDate"
              required
            />
          </div>
        </div>

        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium">All day</p>
            <p class="text-xs text-gray-500">
              Turn this off to choose daily start and end times.
            </p>
          </div>
          <input type="hidden" name="allDay-range" value={rangeAllDay} />
          <Switch
            bind:checked={rangeAllDay}
            class="bg-gray-400 data-[state=checked]:bg-blue-600"
          />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <label for="range-start-time" class="text-sm font-medium">
              Start time
            </label>
            <Input
              type="time"
              id="range-start-time"
              name="startTime"
              bind:value={rangeStartTime}
              disabled={rangeAllDay}
            />
          </div>
          <div class="space-y-2">
            <label for="range-end-time" class="text-sm font-medium">
              End time
            </label>
            <Input
              type="time"
              id="range-end-time"
              name="endTime"
              bind:value={rangeEndTime}
              disabled={rangeAllDay}
            />
          </div>
        </div>

        <div>
          <label for="range-reason" class="text-sm font-medium">
            Reason <span class="text-gray-500 font-normal">(optional)</span>
          </label>
          <NativeSelect.Root name="reason" id="range-reason">
            <NativeSelect.Option value="">
              No reason specified
            </NativeSelect.Option>
            <NativeSelect.Option value="Holiday">Holiday</NativeSelect.Option>
            <NativeSelect.Option value="Vacation">Vacation</NativeSelect.Option>
            <NativeSelect.Option value="Personal">Personal</NativeSelect.Option>
            <NativeSelect.Option value="Medical">Medical</NativeSelect.Option>
          </NativeSelect.Root>
        </div>

        <button
          type="submit"
          class="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Save range unavailability
        </button>
      </form>
    {/if}

    <!-- Weekly tab -->
    {#if activeTab === "weekly"}
      <form
        method="POST"
        action="?/createRegularUnavailability"
        use:enhance
        class="space-y-6"
      >
        <h3 class="text-lg font-semibold">Weekly recurring unavailability</h3>
        <p class="text-sm text-gray-600">
          Use this for regular weekly patterns, like every Monday and Wednesday.
        </p>

        <div class="space-y-2">
          <p class="text-sm font-medium">Days of the week</p>
          <div class="flex flex-wrap gap-2">
            {#each WEEK_DAYS as d}
              <label
                class="inline-flex items-center gap-2 rounded-full border border-gray-300 px-3 py-1 text-sm cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  name="daysOfWeek"
                  value={d.value}
                  class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>{d.label}</span>
              </label>
            {/each}
          </div>
        </div>

        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium">All day</p>
            <p class="text-xs text-gray-500">
              Turn this off to choose times for those days.
            </p>
          </div>
          <input type="hidden" name="allDay" value={weeklyAllDay} />
          <Switch
            bind:checked={weeklyAllDay}
            class="bg-gray-400 data-[state=checked]:bg-blue-600"
          />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <label for="weekly-start-time" class="text-sm font-medium">
              Start time
            </label>
            <Input
              type="time"
              id="weekly-start-time"
              name="startTime"
              bind:value={weeklyStartTime}
              disabled={weeklyAllDay}
            />
          </div>
          <div class="space-y-2">
            <label for="weekly-end-time" class="text-sm font-medium">
              End time
            </label>
            <Input
              type="time"
              id="weekly-end-time"
              name="endTime"
              bind:value={weeklyEndTime}
              disabled={weeklyAllDay}
            />
          </div>
        </div>

        <div class="space-y-2">
          <label for="weekly-end-date" class="text-sm font-medium">
            Ends on <span class="text-gray-500 font-normal">(optional)</span>
          </label>
          <Input
            type="date"
            id="weekly-end-date"
            name="endDate"
            bind:value={weeklyEndDate}
          />
          <p class="text-xs text-gray-500">
            Leave blank if this weekly pattern does not have an end date.
          </p>
        </div>

        <div>
          <label for="weekly-reason" class="text-sm font-medium">
            Reason <span class="text-gray-500 font-normal">(optional)</span>
          </label>
          <NativeSelect.Root name="reason" id="weekly-reason">
            <NativeSelect.Option value="">
              No reason specified
            </NativeSelect.Option>
            <NativeSelect.Option value="Work schedule">
              Work schedule
            </NativeSelect.Option>
            <NativeSelect.Option value="Class schedule">
              Class schedule
            </NativeSelect.Option>
            <NativeSelect.Option value="Recurring appointment">
              Recurring appointment
            </NativeSelect.Option>
          </NativeSelect.Root>
        </div>

        <button
          type="submit"
          class="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Save weekly unavailability
        </button>
      </form>
    {/if}
  </div>
</div>
