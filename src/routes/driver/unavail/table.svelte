<script lang="ts">
  import * as Table from "$lib/components/ui/table/index.js";
  import * as Pagination from "$lib/components/ui/pagination/index.js";
  import { Trash2, Repeat } from "@lucide/svelte";
  import { enhance } from "$app/forms";

  export let data: any = [];

  $: items = Array.isArray(data) ? data : (data?.data ?? []);

  const pageSize = 15;
  let currentPage = 1;

  $: pagedData = items.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Filter out id and user_id columns, and recurring-specific fields
  $: keys = items[0]
    ? Object.keys(items[0]).filter(
        (key) =>
          key !== "user_id" &&
          key !== "id" &&
          key !== "recurring" &&
          key !== "recurrence_pattern" &&
          key !== "days_of_week" &&
          key !== "recurrence_end_date" &&
          key !== "repeating_day"
      )
    : [];

  const formatLabel = (k: string) =>
    k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  // Convert day number to name
  function dayNumberToName(dayNum: number): string {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days[dayNum] || "";
  }

  function formatDateShort(dateStr: string): string {
    if (!dateStr) return "";
    try {
      const date = new Date(
        dateStr.includes("T") ? dateStr : dateStr + "T00:00:00"
      );
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  }

  // Format values based on key type
  function formatValue(key: string, value: any, row: any): string {
    if (value === null || value === undefined) return "-";

    // Format timestamp fields to local time
    if (key === "created_at" || key === "updated_at") {
      try {
        const date = new Date(value);
        return date.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
      } catch {
        return String(value);
      }
    }

    // Format date / recurrence
    if (key === "unavailable_date") {
      if (!value) return "-";

      if (row.recurring) {
        const pattern = row.recurrence_pattern || "weekly";
        const daysOfWeek = row.days_of_week || [];
        const startLabel = formatDateShort(value);
        const endLabel = row.recurrence_end_date
          ? formatDateShort(row.recurrence_end_date)
          : "";

        // Helpers to append range text
        const withRange = (base: string) => {
          if (startLabel && endLabel) {
            return `${base} from ${startLabel} to ${endLabel}`;
          }
          if (startLabel) {
            return `${base} starting ${startLabel}`;
          }
          return base;
        };

        if (pattern === "daily") {
          return withRange("Every day");
        }

        if (pattern === "weekly" && daysOfWeek.length > 0) {
          const dayNames = daysOfWeek
            .map((d: number) => dayNumberToName(d))
            .join(", ");
          return withRange(`Every ${dayNames}`);
        }

        if (pattern === "monthly") {
          return withRange("Monthly");
        }

        return withRange("Recurring");
      }

      // Non-recurring, simple date
      return formatDateShort(value);
    }

    // Format time fields to 12-hour format
    if (key === "start_time" || key === "end_time") {
      if (!value) return "-";
      try {
        const [hours, minutes] = String(value).split(":");
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? "PM" : "AM";
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${displayHour}:${minutes} ${ampm}`;
      } catch {
        return String(value);
      }
    }

    // Boolean fields
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
          <Table.Head class="px-4 py-2 font-medium text-left">Type</Table.Head>
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
              <Table.Cell class="px-4 py-2">
                {(currentPage - 1) * pageSize + i + 1}
              </Table.Cell>
              <Table.Cell class="px-4 py-2">
                {#if row.recurring}
                  <div class="flex items-center gap-1 text-blue-600">
                    <Repeat class="w-4 h-4" />
                    <span class="text-xs font-medium">Recurring</span>
                  </div>
                {:else}
                  <span class="text-xs text-gray-600">One-time</span>
                {/if}
              </Table.Cell>
              {#each keys as key}
                <Table.Cell class="px-4 py-2">
                  {formatValue(key, row[key], row)}
                </Table.Cell>
              {/each}
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
              colspan={keys.length + 3}
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