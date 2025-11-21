<script lang="ts">
  import * as Table from "$lib/components/ui/table/index.js";
  import * as Pagination from "$lib/components/ui/pagination/index.js";
  import { Trash2 } from "@lucide/svelte";
  import { enhance } from "$app/forms";

  export let data: any = [];

  // Normalize incoming data
  $: items = Array.isArray(data) ? data : (data?.data ?? []);

  const pageSize = 15;
  let currentPage = 1;

  $: pagedData = items.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Columns to show (hide IDs and all the date/time breakdown fields;
  // we'll show a single "When" column instead)
$: keys = items[0]
  ? Object.keys(items[0]).filter(
      (key) =>
        key !== "id" &&
        key !== "user_id" &&
        key !== "unavailability_type" &&
        key !== "days_of_week" &&
        key !== "start_time" &&
        key !== "end_time" &&
        key !== "start_date" &&
        key !== "end_date" &&
        key !== "all_day" &&       // <-- remove all_day column
        key !== "recurring" &&
        key !== "recurrence_pattern" &&
        key !== "recurrence_end_date" &&
        key !== "repeating_day"
    )
  : [];

  const formatLabel = (k: string) =>
    k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  function dayNumberToShortName(dayNum: number): string {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days[dayNum] || "";
  }

  function dayNumberToFullName(dayNum: number): string {
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday"
    ];
    return days[dayNum] || "";
  }

  function formatDate(value: string): string {
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return String(value);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    } catch {
      return String(value);
    }
  }

  // For plain time columns (HH:MM or HH:MM:SS → h:mm AM/PM)
  function formatTime(value: string | null | undefined): string {
    if (!value) return "-";
    try {
      const [hStr, mStr = "00"] = String(value).split(":");
      const hours = parseInt(hStr, 10);
      const minutes = parseInt(mStr, 10);
      if (Number.isNaN(hours) || Number.isNaN(minutes)) return String(value);

      const ampm = hours >= 12 ? "PM" : "AM";
      const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      const paddedMinutes = String(minutes).padStart(2, "0");
      return `${displayHour}:${paddedMinutes} ${ampm}`;
    } catch {
      return String(value);
    }
  }

  function formatDateTime(value: string): string {
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return String(value);
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
    } catch {
      return String(value);
    }
  }

  // Single "When" description for each row
  function formatWhen(row: any): string {
    if (!row) return "-";

    const type = row.unavailability_type as
      | "One-time"
      | "Date range"
      | "Weekly"
      | string;

    const allDay = row.all_day === true;
    const startDate = row.start_date as string | null;
    const endDate = (row.end_date as string | null) || null;
    const startTime = row.start_time as string | null;
    const endTime = row.end_time as string | null;
    const dowRaw = row.days_of_week;

    const sameDate =
      startDate && endDate ? startDate === endDate : false;

    const timePart =
      startTime && endTime
        ? `${formatTime(startTime)} - ${formatTime(endTime)}`
        : startTime
        ? `${formatTime(startTime)}`
        : endTime
        ? `${formatTime(endTime)}`
        : "";

    if (type === "One-time") {
      if (!startDate && !startTime && !endTime) return "-";

      // All day → just the date
      if (allDay || !timePart) {
        return startDate ? formatDate(startDate) : "-";
      }

      // Timed one-day
      return startDate
        ? `${formatDate(startDate)} ${timePart}`
        : timePart;
    }

    if (type === "Date range") {
      if (!startDate && !endDate) return "-";

      // All day range
      if (allDay || !timePart) {
        if (!endDate || sameDate) {
          return startDate ? formatDate(startDate) : "-";
        }
        return `${formatDate(startDate)} - ${formatDate(endDate)}`;
      }

      // Timed range
      if (sameDate || !endDate) {
        // Same day, just show one date + time range
        return `${formatDate(startDate)} ${timePart}`;
      }

      // Multi-day timed span
      return `${formatDate(startDate)} ${formatTime(
        startTime
      )} - ${formatDate(endDate)} ${formatTime(endTime)}`;
    }

    if (type === "Weekly") {
      const daysArray: number[] = Array.isArray(dowRaw)
        ? dowRaw
        : dowRaw === null || dowRaw === undefined
        ? []
        : [dowRaw];

      if (!daysArray.length) {
        if (allDay) return "Every week";
        return timePart ? `Every week ${timePart}` : "Every week";
      }

      const dayNames = daysArray
        .slice()
        .sort((a, b) => a - b)
        .map((d) => dayNumberToFullName(d))
        .join(", ");

      if (allDay || !timePart) {
        return `Every ${dayNames}`;
      }

      return `Every ${dayNames} ${timePart}`;
    }

    // Fallback for any unexpected type
    if (startDate || endDate || timePart) {
      const datePiece =
        startDate && endDate && !sameDate
          ? `${formatDate(startDate)} - ${formatDate(endDate)}`
          : startDate
          ? formatDate(startDate)
          : endDate
          ? formatDate(endDate)
          : "";

      if (datePiece && timePart) return `${datePiece} ${timePart}`;
      if (datePiece) return datePiece;
      if (timePart) return timePart;
    }

    return "-";
  }

  // Generic formatter for the *other* columns (reason, all_day, created_at, etc.)
  function formatValue(key: string, value: any, row: any): string {
    if (value === null || value === undefined) return "-";

    // created_at / updated_at are full timestamps
    if (key === "created_at" || key === "updated_at") {
      return formatDateTime(value);
    }

    // days_of_week isn't in keys anymore, but keep this here in case
    if (key === "days_of_week") {
      if (!value || (Array.isArray(value) && value.length === 0)) return "-";
      const arr = Array.isArray(value) ? value : [value];
      return arr.map((d: number) => dayNumberToShortName(d)).join(", ");
    }

    // Booleans
    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }

    return String(value);
  }
</script>

<div class="space-y-4">
  <div class="overflow-x-auto border rounded-md">
    <Table.Root class="min-w-full divide-y-2 divide-gray-200 bg-white text-sm">
      <Table.Header class="bg-gray-100">
        <Table.Row>
          <Table.Head class="px-4 py-4 text-left">#</Table.Head>
          <Table.Head class="px-4 py-2 font-medium text-left">
            Type
          </Table.Head>
          <Table.Head class="px-4 py-2 font-medium text-left whitespace-nowrap">
            When
          </Table.Head>
          {#each keys as key}
            <Table.Head
              class="px-4 py-2 font-medium text-left whitespace-nowrap"
            >
              {formatLabel(key)}
            </Table.Head>
          {/each}
          <Table.Head class="px-4 py-2 font-medium text-left">
            Actions
          </Table.Head>
        </Table.Row>
      </Table.Header>

      <Table.Body class="divide-y divide-gray-200">
        {#if pagedData.length > 0}
          {#each pagedData as row, i}
            <Table.Row>
              <!-- Row number -->
              <Table.Cell class="px-4 py-2">
                {(currentPage - 1) * pageSize + i + 1}
              </Table.Cell>

              <!-- Type from unavailability_type enum -->
              <Table.Cell class="px-4 py-2">
                <span class="text-xs font-medium text-blue-700">
                  {row.unavailability_type ?? "-"}
                </span>
              </Table.Cell>

              <!-- Condensed "When" description -->
              <Table.Cell class="px-4 py-2 whitespace-nowrap">
                {formatWhen(row)}
              </Table.Cell>

              <!-- Dynamic data columns -->
              {#each keys as key}
                <Table.Cell class="px-4 py-2">
                  {formatValue(key, row[key], row)}
                </Table.Cell>
              {/each}

              <!-- Delete action -->
              <Table.Cell class="px-4 py-2">
                <form
                  method="POST"
                  action="?/deleteUnavailability"
                  use:enhance={({ cancel }) => {
                    if (
                      !confirm(
                        "Are you sure you want to delete this unavailability?"
                      )
                    ) {
                      cancel();
                    }
                    return async ({ update }) => {
                      await update();
                    };
                  }}
                >
                  <input type="hidden" name="id" value={row.id} />
                  <button
                    type="submit"
                    class="text-red-600 hover:text-red-800 transition-colors p-1 hover:bg-red-50 rounded"
                    title="Delete"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </form>
              </Table.Cell>
            </Table.Row>
          {/each}
        {:else}
          <Table.Row>
            <Table.Cell
              colspan={keys.length + 4}
              class="text-center py-8 text-gray-500"
            >
              No unavailability records found
            </Table.Cell>
          </Table.Row>
        {/if}
      </Table.Body>
    </Table.Root>

    {#if items.length > pageSize}
      <div class="mt-4 flex justify-end pb-2">
        <Pagination.Root
          count={items.length}
          perPage={pageSize}
          bind:page={currentPage}
        >
          {#snippet children({ pages, currentPage: paginationCurrentPage })}
            <Pagination.Content>
              <Pagination.Item>
                <Pagination.PrevButton />
              </Pagination.Item>
              {#each pages as page (page.key)}
                {#if page.type === "ellipsis"}
                  <Pagination.Item>
                    <Pagination.Ellipsis />
                  </Pagination.Item>
                {:else}
                  <Pagination.Item>
                    <Pagination.Link
                      {page}
                      isActive={currentPage === page.value}
                    >
                      {page.value}
                  </Pagination.Link>
                  </Pagination.Item>
                {/if}
              {/each}
              <Pagination.Item>
                <Pagination.NextButton />
              </Pagination.Item>
            </Pagination.Content>
          {/snippet}
        </Pagination.Root>
      </div>
    {/if}
  </div>
</div>