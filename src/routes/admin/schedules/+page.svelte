<!-- src/routes/driver/unavail/+page.svelte -->
<script lang="ts">
  import { Switch } from "$lib/components/ui/switch/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Tabs from "$lib/components/ui/tabs/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import Calendar from "$lib/components/ui/calendar/calendar.svelte";
  import { CalendarDate } from "@internationalized/date";
  import { getLocalTimeZone, today } from "@internationalized/date";
  import { enhance } from "$app/forms";
  import { Calendar as CalendarIcon, X, CheckCircle2 } from "@lucide/svelte";
  import type { ActionData, PageData } from "./$types";
  import UnavailabilityTable from "./table.svelte";

  interface Props {
    data: PageData;
    form?: ActionData;
  }

  let { data, form }: Props = $props();

  // One-time (specific date) state
  let oneTimeDate = $state<CalendarDate | undefined>(today(getLocalTimeZone()));
  let oneTimeAllDay = $state(true);
  let oneTimeStart = $state("09:00");
  let oneTimeEnd = $state("17:00");
  let oneTimeReason = $state<string>("");

  // Range (multi-day) state
  let rangeStartDate = $state("");
  let rangeEndDate = $state("");
  let rangeAllDay = $state(true);
  let rangeStartTime = $state("09:00");
  let rangeEndTime = $state("17:00");
  let rangeReason = $state<string>("");

  // Weekly recurring state
  const WEEK_DAYS = [
    { value: "0", label: "Sun", fullName: "Sunday" },
    { value: "1", label: "Mon", fullName: "Monday" },
    { value: "2", label: "Tue", fullName: "Tuesday" },
    { value: "3", label: "Wed", fullName: "Wednesday" },
    { value: "4", label: "Thu", fullName: "Thursday" },
    { value: "5", label: "Fri", fullName: "Friday" },
    { value: "6", label: "Sat", fullName: "Saturday" }
  ];
  
  let weeklyDays = $state<string[]>([]);
  let weeklyAllDay = $state(true);
  let weeklyStartTime = $state("09:00");
  let weeklyEndTime = $state("17:00");
  let weeklyEndDate = $state("");
  let weeklyReason = $state<string>("");

  // Reason options
  const ONE_TIME_REASONS = [
    { value: "", label: "No reason specified" },
    { value: "Holiday", label: "Holiday" },
    { value: "Personal", label: "Personal" },
    { value: "Medical", label: "Medical" },
    { value: "Appointment", label: "Appointment" },
    { value: "Other", label: "Other" }
  ];

  const RANGE_REASONS = [
    { value: "", label: "No reason specified" },
    { value: "Vacation", label: "Vacation" },
    { value: "Holiday", label: "Holiday" },
    { value: "Personal", label: "Personal" },
    { value: "Medical", label: "Medical" },
    { value: "Other", label: "Other" }
  ];

  const WEEKLY_REASONS = [
    { value: "", label: "No reason specified" },
    { value: "Work schedule", label: "Work schedule" },
    { value: "Class schedule", label: "Class schedule" },
    { value: "Recurring appointment", label: "Recurring appointment" },
    { value: "Other", label: "Other" }
  ];

  function toggleWeekday(day: string) {
    if (weeklyDays.includes(day)) {
      weeklyDays = weeklyDays.filter(d => d !== day);
    } else {
      weeklyDays = [...weeklyDays, day];
    }
  }

  // Auto-dismiss success message
  let showSuccess = $state(false);
  $effect(() => {
    if (form?.success) {
      showSuccess = true;
      setTimeout(() => {
        showSuccess = false;
      }, 5000);
    }
  });
</script>

<svelte:head>
  <title>My Unavailability - DriveKind</title>
</svelte:head>

<div class="container mx-auto py-6 space-y-6">
  <!-- Header -->
  <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">Unavailability & Time Off</h1>
      <p class="text-muted-foreground mt-1">
        Set your unavailable times so dispatchers know when you can't take rides
      </p>
    </div>
  </div>

  <!-- Alerts -->
  {#if form?.error}
    <Card.Root class="border-red-200 bg-red-50">
      <Card.Content class="pt-6">
        <div class="flex items-start gap-3">
          <X class="w-5 h-5 text-red-600 mt-0.5" />
          <div class="flex-1">
            <p class="font-medium text-red-900">Error</p>
            <p class="text-sm text-red-800 mt-1">{form.error}</p>
          </div>
        </div>
      </Card.Content>
    </Card.Root>
  {/if}

  {#if showSuccess}
    <Card.Root class="border-green-200 bg-green-50">
      <Card.Content class="pt-6">
        <div class="flex items-start gap-3">
          <CheckCircle2 class="w-5 h-5 text-green-600 mt-0.5" />
          <div class="flex-1">
            <p class="font-medium text-green-900">Success</p>
            <p class="text-sm text-green-800 mt-1">Unavailability saved successfully</p>
          </div>
        </div>
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Existing unavailability table -->
  <Card.Root>
    <Card.Header>
      <Card.Title>My Unavailability Schedule</Card.Title>
      <Card.Description>
        View and manage all your unavailable times
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <UnavailabilityTable data={data || []} />
    </Card.Content>
  </Card.Root>

  <!-- Add new unavailability -->
  <Tabs.Root value="one-time" class="w-full">
    <Tabs.List class="grid w-full grid-cols-3">
      <Tabs.Trigger value="one-time">One Day</Tabs.Trigger>
      <Tabs.Trigger value="range">Date Range</Tabs.Trigger>
      <Tabs.Trigger value="weekly">Weekly</Tabs.Trigger>
    </Tabs.List>

    <!-- ONE-TIME TAB -->
    <Tabs.Content value="one-time">
      <Card.Root>
        <Card.Header>
          <Card.Title>Single Day Unavailability</Card.Title>
          <Card.Description>
            Set yourself as unavailable for a specific date
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <form
            method="POST"
            action="?/createSpecificUnavailability"
            use:enhance
            class="space-y-6"
          >
            <!-- Calendar -->
            <div class="space-y-2">
              <Label>Select Date *</Label>
              <Calendar
                type="single"
                bind:value={oneTimeDate}
                class="rounded-lg border"
                numberOfMonths={1}
              />
              <input type="hidden" name="date" value={oneTimeDate?.toString()} />
              {#if oneTimeDate}
                <p class="text-sm text-blue-600 font-medium flex items-center gap-2">
                  <CalendarIcon class="w-4 h-4" />
                  Selected: {oneTimeDate.toString()}
                </p>
              {/if}
            </div>

            <!-- All Day Toggle -->
            <div class="flex items-center justify-between p-4 rounded-lg bg-muted">
              <div class="space-y-0.5">
                <Label>All Day</Label>
                <p class="text-sm text-muted-foreground">
                  Unavailable for the entire day
                </p>
              </div>
              <input type="hidden" name="allDay" value={oneTimeAllDay} />
              <Switch bind:checked={oneTimeAllDay} />
            </div>

            <!-- Time Range (if not all day) -->
            {#if !oneTimeAllDay}
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <Label for="one-start">Start Time *</Label>
                  <Input
                    type="time"
                    id="one-start"
                    name="startTime"
                    bind:value={oneTimeStart}
                    required={!oneTimeAllDay}
                  />
                </div>
                <div class="space-y-2">
                  <Label for="one-end">End Time *</Label>
                  <Input
                    type="time"
                    id="one-end"
                    name="endTime"
                    bind:value={oneTimeEnd}
                    required={!oneTimeAllDay}
                  />
                </div>
              </div>
            {/if}

            <!-- Reason -->
            <div class="space-y-2">
              <Label for="one-reason">Reason (Optional)</Label>
              <Select.Root
                name="reason"
                selected={{ value: oneTimeReason, label: ONE_TIME_REASONS.find(r => r.value === oneTimeReason)?.label || "No reason specified" }}
                onSelectedChange={(v) => oneTimeReason = v?.value || ""}
              >
                <Select.Trigger id="one-reason">
                  <Select.Value placeholder="Select a reason" />
                </Select.Trigger>
                <Select.Content>
                  {#each ONE_TIME_REASONS as reason}
                    <Select.Item value={reason.value}>{reason.label}</Select.Item>
                  {/each}
                </Select.Content>
              </Select.Root>
            </div>

            <Button type="submit" class="w-full">
              Save Unavailability
            </Button>
          </form>
        </Card.Content>
      </Card.Root>
    </Tabs.Content>

    <!-- RANGE TAB -->
    <Tabs.Content value="range">
      <Card.Root>
        <Card.Header>
          <Card.Title>Date Range Unavailability</Card.Title>
          <Card.Description>
            Set yourself as unavailable for multiple consecutive days (e.g., vacation)
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <form
            method="POST"
            action="?/createRangeUnavailability"
            use:enhance
            class="space-y-6"
          >
            <!-- Date Range -->
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label for="range-start">Start Date *</Label>
                <Input
                  type="date"
                  id="range-start"
                  name="startDate"
                  bind:value={rangeStartDate}
                  required
                />
              </div>
              <div class="space-y-2">
                <Label for="range-end">End Date *</Label>
                <Input
                  type="date"
                  id="range-end"
                  name="endDate"
                  bind:value={rangeEndDate}
                  required
                />
              </div>
            </div>

            <!-- All Day Toggle -->
            <div class="flex items-center justify-between p-4 rounded-lg bg-muted">
              <div class="space-y-0.5">
                <Label>All Day</Label>
                <p class="text-sm text-muted-foreground">
                  Unavailable all day for each date in range
                </p>
              </div>
              <input type="hidden" name="allDay" value={rangeAllDay} />
              <Switch bind:checked={rangeAllDay} />
            </div>

            <!-- Time Range (if not all day) -->
            {#if !rangeAllDay}
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <Label for="range-start-time">Daily Start Time *</Label>
                  <Input
                    type="time"
                    id="range-start-time"
                    name="startTime"
                    bind:value={rangeStartTime}
                    required={!rangeAllDay}
                  />
                </div>
                <div class="space-y-2">
                  <Label for="range-end-time">Daily End Time *</Label>
                  <Input
                    type="time"
                    id="range-end-time"
                    name="endTime"
                    bind:value={rangeEndTime}
                    required={!rangeAllDay}
                  />
                </div>
              </div>
              <p class="text-sm text-muted-foreground">
                These times will apply to each day in the range
              </p>
            {/if}

            <!-- Reason -->
            <div class="space-y-2">
              <Label for="range-reason">Reason (Optional)</Label>
              <Select.Root
                name="reason"
                selected={{ value: rangeReason, label: RANGE_REASONS.find(r => r.value === rangeReason)?.label || "No reason specified" }}
                onSelectedChange={(v) => rangeReason = v?.value || ""}
              >
                <Select.Trigger id="range-reason">
                  <Select.Value placeholder="Select a reason" />
                </Select.Trigger>
                <Select.Content>
                  {#each RANGE_REASONS as reason}
                    <Select.Item value={reason.value}>{reason.label}</Select.Item>
                  {/each}
                </Select.Content>
              </Select.Root>
            </div>

            <Button type="submit" class="w-full">
              Save Date Range
            </Button>
          </form>
        </Card.Content>
      </Card.Root>
    </Tabs.Content>

    <!-- WEEKLY TAB -->
    <Tabs.Content value="weekly">
      <Card.Root>
        <Card.Header>
          <Card.Title>Weekly Recurring Unavailability</Card.Title>
          <Card.Description>
            Set regular weekly patterns (e.g., every Monday and Wednesday)
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <form
            method="POST"
            action="?/createRegularUnavailability"
            use:enhance
            class="space-y-6"
          >
            <!-- Days of Week -->
            <div class="space-y-3">
              <Label>Select Days *</Label>
              <div class="flex flex-wrap gap-2">
                {#each WEEK_DAYS as day}
                  <button
                    type="button"
                    onclick={() => toggleWeekday(day.value)}
                    class="px-4 py-2 rounded-lg border-2 transition-all {weeklyDays.includes(day.value)
                      ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}"
                  >
                    {day.fullName}
                  </button>
                  {#if weeklyDays.includes(day.value)}
                    <input type="hidden" name="daysOfWeek" value={day.value} />
                  {/if}
                {/each}
              </div>
              {#if weeklyDays.length === 0}
                <p class="text-sm text-muted-foreground">
                  Select at least one day of the week
                </p>
              {:else}
                <p class="text-sm text-blue-600 font-medium">
                  Selected: {weeklyDays.map(d => WEEK_DAYS.find(wd => wd.value === d)?.fullName).join(", ")}
                </p>
              {/if}
            </div>

            <!-- All Day Toggle -->
            <div class="flex items-center justify-between p-4 rounded-lg bg-muted">
              <div class="space-y-0.5">
                <Label>All Day</Label>
                <p class="text-sm text-muted-foreground">
                  Unavailable all day on selected weekdays
                </p>
              </div>
              <input type="hidden" name="allDay" value={weeklyAllDay} />
              <Switch bind:checked={weeklyAllDay} />
            </div>

            <!-- Time Range (if not all day) -->
            {#if !weeklyAllDay}
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <Label for="weekly-start-time">Start Time *</Label>
                  <Input
                    type="time"
                    id="weekly-start-time"
                    name="startTime"
                    bind:value={weeklyStartTime}
                    required={!weeklyAllDay}
                  />
                </div>
                <div class="space-y-2">
                  <Label for="weekly-end-time">End Time *</Label>
                  <Input
                    type="time"
                    id="weekly-end-time"
                    name="endTime"
                    bind:value={weeklyEndTime}
                    required={!weeklyAllDay}
                  />
                </div>
              </div>
            {/if}

            <!-- End Date (Optional) -->
            <div class="space-y-2">
              <Label for="weekly-end-date">Ends On (Optional)</Label>
              <Input
                type="date"
                id="weekly-end-date"
                name="endDate"
                bind:value={weeklyEndDate}
              />
              <p class="text-sm text-muted-foreground">
                Leave blank if this pattern continues indefinitely
              </p>
            </div>

            <!-- Reason -->
            <div class="space-y-2">
              <Label for="weekly-reason">Reason (Optional)</Label>
              <Select.Root
                name="reason"
                selected={{ value: weeklyReason, label: WEEKLY_REASONS.find(r => r.value === weeklyReason)?.label || "No reason specified" }}
                onSelectedChange={(v) => weeklyReason = v?.value || ""}
              >
                <Select.Trigger id="weekly-reason">
                  <Select.Value placeholder="Select a reason" />
                </Select.Trigger>
                <Select.Content>
                  {#each WEEKLY_REASONS as reason}
                    <Select.Item value={reason.value}>{reason.label}</Select.Item>
                  {/each}
                </Select.Content>
              </Select.Root>
            </div>

            <Button type="submit" class="w-full" disabled={weeklyDays.length === 0}>
              Save Weekly Pattern
            </Button>
          </form>
        </Card.Content>
      </Card.Root>
    </Tabs.Content>
  </Tabs.Root>
</div>