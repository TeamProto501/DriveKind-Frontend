<!-- src/routes/driver/schedule/+page.svelte -->
<script lang="ts">
  import * as ToggleGroup from "$lib/components/ui/toggle-group/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import Calendar from "$lib/components/ui/calendar/calendar.svelte";
  import { CalendarDate } from "@internationalized/date";
  import * as NativeSelect from "$lib/components/ui/native-select/index.js";
  let selectedDay = $state<string>();
  let isChecked = $state(false);
  let value = $state<CalendarDate | undefined>(new CalendarDate(2025, 10, 20));
  let numberOfDates = $state(1);
  let specificDate = $state({
    allDay: false,
    startTime: "",
    endTime: "",
    reason: "",
  });
  // array that saves date data
  let regularDates = $state<
    Array<{
      selectedDay?: string;
      allDay: boolean;
      startTime: string;
      endTime: string;
    }>
  >([{ allDay: false, startTime: "", endTime: "" }]);
  // if numberofdate changes change length of array
  $effect(() => {
    if (numberOfDates > regularDates.length) {
      const newItems = Array.from(
        { length: numberOfDates - regularDates.length },
        () => ({ allDay: false, startTime: "", endTime: "" })
      );
      regularDates = [...regularDates, ...newItems];
    } else if (numberOfDates < regularDates.length) {
      regularDates = regularDates.slice(0, numberOfDates);
    }
  });
</script>

<svelte:head>
  <title>My Schedule - DriveKind</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">Schedule Unavailability</h1>
      <p class="text-muted-foreground">Create Unavailability</p>
    </div>
  </div>

  <!-- Schedule Overview -->
  <div class="grid grid-cols-2 gap-6 rounded-lg border bg-white p-6 shadow-xl">
    <!-- Specific Date Form -->
    <form class="space-y-6">
      <h3 class="text-lg font-semibold">Choose Specific Date</h3>

      <div>
        <Calendar
          type="single"
          bind:value
          class="rounded-lg border shadow-sm"
          numberOfMonths={1}
        />
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
          <label for="start-specific" class="text-sm font-medium"
            >Start Time</label
          >
          <Input
            type="time"
            id="start-specific"
            bind:value={specificDate.startTime}
            disabled={specificDate.allDay}
          />
        </div>
        <div class="space-y-2">
          <label for="end-specific" class="text-sm font-medium">End Time</label>
          <Input
            type="time"
            id="end-specific"
            bind:value={specificDate.endTime}
            disabled={specificDate.allDay}
          />
        </div>
      </div>
      <div class="flex items-center justify-between">
        <label for="allDay-specific" class="text-sm font-medium">All Day</label>
        <Switch
          id="allDay-specific"
          bind:checked={specificDate.allDay}
          class="bg-gray-400 data-[state=checked]:bg-blue-600"
        />
      </div>

      <div>
        <label for="reason-specific" class="text-sm font-medium">Reason</label>
        <NativeSelect.Root>
          <NativeSelect.Option value="">Select Reason</NativeSelect.Option>
          <NativeSelect.Option value="Holiday">Holiday</NativeSelect.Option>
          <NativeSelect.Option value="Personal">Personal</NativeSelect.Option>
          <NativeSelect.Option value="Medical">Medical</NativeSelect.Option>
          <NativeSelect.Option value="Appointment"
            >Appointment</NativeSelect.Option
          >
        </NativeSelect.Root>
      </div>
      <button
        type="submit"
        class="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        Submit
      </button>
    </form>

    <!-- Regular Date Form -->
    <form class="space-y-6">
      <h3 class="text-lg font-semibold">Choose Regular Date</h3>

      <div class="space-y-2">
        <label for="numberOfDate" class="text-sm font-medium">
          Number of Regular Dates
        </label>
        <Input
          id="numberOfDate"
          name="numberOfDate"
          type="number"
          min="1"
          max="7"
          bind:value={numberOfDates}
          class="w-full"
        />
      </div>

      {#each regularDates as dateItem, index (index)}
        <div class="space-y-4 rounded-lg border p-4 bg-gray-50">
          <h4 class="text-sm font-semibold text-gray-700">Date #{index + 1}</h4>

          <div class="space-y-2">
            <label class="text-sm font-medium">Days of Week</label>
            <ToggleGroup.Root
              variant="default"
              type="single"
              class="shadow-sm"
              bind:value={dateItem.selectedDay}
            >
              <ToggleGroup.Item
                value="Monday"
                class="data-[state=on]:bg-gray-500/35"
              >
                Mon
              </ToggleGroup.Item>
              <ToggleGroup.Item
                value="Tuesday"
                class="data-[state=on]:bg-gray-500/35"
              >
                Tue
              </ToggleGroup.Item>
              <ToggleGroup.Item
                value="Wednesday"
                class="data-[state=on]:bg-gray-500/35"
              >
                Wed
              </ToggleGroup.Item>
              <ToggleGroup.Item
                value="Thursday"
                class="data-[state=on]:bg-gray-500/35"
              >
                Thu
              </ToggleGroup.Item>
              <ToggleGroup.Item
                value="Friday"
                class="data-[state=on]:bg-gray-500/35"
              >
                Fri
              </ToggleGroup.Item>
              <ToggleGroup.Item
                value="Saturday"
                class="data-[state=on]:bg-gray-500/35"
              >
                Sat
              </ToggleGroup.Item>
              <ToggleGroup.Item
                value="Sunday"
                class="data-[state=on]:bg-gray-500/35"
              >
                Sun
              </ToggleGroup.Item>
            </ToggleGroup.Root>
          </div>

          <div class="flex items-center justify-between">
            <label for="allDay-{index}" class="text-sm font-medium"
              >All Day</label
            >
            <Switch
              id="allDay-{index}"
              bind:checked={dateItem.allDay}
              class="bg-gray-400 data-[state=checked]:bg-blue-600"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <label for="start-{index}" class="text-sm font-medium"
                >Start Time</label
              >
              <Input
                type="time"
                id="start-{index}"
                bind:value={dateItem.startTime}
                disabled={dateItem.allDay}
              />
            </div>
            <div class="space-y-2">
              <label for="end-{index}" class="text-sm font-medium"
                >End Time</label
              >
              <Input
                type="time"
                id="end-{index}"
                bind:value={dateItem.endTime}
                disabled={dateItem.allDay}
              />
            </div>
          </div>
        </div>
        <div>
          <label for="reason-specific" class="text-sm font-medium">Reason</label
          >
          <NativeSelect.Root>
            <NativeSelect.Option value="">Select Reason</NativeSelect.Option>
            <NativeSelect.Option value="Holiday">Holiday</NativeSelect.Option>
            <NativeSelect.Option value="Personal">Personal</NativeSelect.Option>
            <NativeSelect.Option value="Medical">Medical</NativeSelect.Option>
            <NativeSelect.Option value="Appointment"
              >Appointment</NativeSelect.Option
            >
          </NativeSelect.Root>
        </div>
        <hr class="border-gray-300" />
      {/each}

      <button
        type="submit"
        class="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        Submit
      </button>
    </form>
  </div>
</div>
