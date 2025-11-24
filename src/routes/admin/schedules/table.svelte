<script lang="ts">
  import * as Table from "$lib/components/ui/table/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Trash2, Calendar, Clock } from "@lucide/svelte";
  import { enhance } from "$app/forms";

  interface Props {
    data: any;
  }

  let { data }: Props = $props();

  // Normalize incoming data
  let items = $derived(Array.isArray(data) ? data : (data?.data ?? []));

  // Sort: newest first
  let sortedItems = $derived(
    [...items].sort((a, b) => {
      const aTime = new Date(a.created_at || 0).getTime();
      const bTime = new Date(b.created_at || 0).getTime();
      return bTime - aTime; // Newest first
    })
  );

  function dayNumberToName(dayNum: number): string {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days[dayNum] || "";
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    } catch {
      return dateStr;
    }
  }

  function formatTime(timeStr: string | null): string {
    if (!timeStr) return "—";
    try {
      const [hStr, mStr] = timeStr.split(":");
      const hours = parseInt(hStr, 10);
      const minutes = parseInt(mStr, 10);
      const ampm = hours >= 12 ? "PM" : "AM";
      const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      return `${displayHour}:${String(minutes).padStart(2, "0")} ${ampm}`;
    } catch {
      return timeStr;
    }
  }

  function formatWhenDescription(row: any): string {
    const type = row.unavailability_type;
    const allDay = row.all_day;
    const startDate = row.start_date;
    const endDate = row.end_date;
    const startTime = row.start_time;
    const endTime = row.end_time;
    const daysOfWeek = row.days_of_week;

    if (type === "One-Time") {
      if (allDay) {
        return startDate ? formatDate(startDate) : "—";
      }
      const date = startDate ? formatDate(startDate) : "";
      const time = startTime && endTime
        ? `${formatTime(startTime)} - ${formatTime(endTime)}`
        : "";
      return [date, time].filter(Boolean).join(" • ");
    }

    if (type === "Date Range") {
      const dateRange = startDate && endDate && startDate !== endDate
        ? `${formatDate(startDate)} - ${formatDate(endDate)}`
        : startDate
        ? formatDate(startDate)
        : "";
      
      if (allDay) {
        return dateRange;
      }

      const time = startTime && endTime
        ? `${formatTime(startTime)} - ${formatTime(endTime)}`
        : "";
      return [dateRange, time].filter(Boolean).join(" • ");
    }

    if (type === "Weekly") {
      const days = Array.isArray(daysOfWeek)
        ? daysOfWeek.sort((a, b) => a - b).map(d => dayNumberToName(d)).join(", ")
        : "";
      
      if (allDay) {
        return `Every ${days}`;
      }

      const time = startTime && endTime
        ? `${formatTime(startTime)} - ${formatTime(endTime)}`
        : "";
      return days && time ? `Every ${days} • ${time}` : days || time || "—";
    }

    return "—";
  }

  function getTypeBadgeClass(type: string): string {
    switch (type) {
      case "One-Time":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Date Range":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "Weekly":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  }
</script>

<div class="space-y-4">
  {#if sortedItems.length === 0}
    <div class="text-center py-12 border rounded-lg bg-muted/50">
      <Calendar class="w-12 h-12 mx-auto text-muted-foreground mb-3" />
      <h3 class="text-lg font-medium text-gray-900 mb-1">No unavailability set</h3>
      <p class="text-sm text-muted-foreground">
        Add your first unavailable time using the tabs above
      </p>
    </div>
  {:else}
    <div class="rounded-lg border">
      <Table.Root>
        <Table.Header>
          <Table.Row class="bg-muted/50">
            <Table.Head class="w-[140px]">Type</Table.Head>
            <Table.Head>When</Table.Head>
            <Table.Head class="w-[150px]">Reason</Table.Head>
            <Table.Head class="w-[100px]">All Day</Table.Head>
            <Table.Head class="w-[100px] text-right">Actions</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each sortedItems as item}
            <Table.Row>
              <!-- Type Badge -->
              <Table.Cell>
                <Badge variant="outline" class={getTypeBadgeClass(item.unavailability_type)}>
                  {item.unavailability_type}
                </Badge>
              </Table.Cell>

              <!-- When Description -->
              <Table.Cell class="font-medium">
                <div class="flex items-center gap-2">
                  {#if item.unavailability_type === "Weekly"}
                    <Clock class="w-4 h-4 text-muted-foreground" />
                  {:else}
                    <Calendar class="w-4 h-4 text-muted-foreground" />
                  {/if}
                  <span>{formatWhenDescription(item)}</span>
                </div>
                {#if item.unavailability_type === "Weekly" && item.end_date}
                  <p class="text-sm text-muted-foreground mt-1">
                    Until {formatDate(item.end_date)}
                  </p>
                {/if}
              </Table.Cell>

              <!-- Reason -->
              <Table.Cell>
                <span class="text-sm text-muted-foreground">
                  {item.reason || "—"}
                </span>
              </Table.Cell>

              <!-- All Day -->
              <Table.Cell>
                <Badge variant={item.all_day ? "default" : "secondary"}>
                  {item.all_day ? "Yes" : "No"}
                </Badge>
              </Table.Cell>

              <!-- Actions -->
              <Table.Cell class="text-right">
                <form
                  method="POST"
                  action="?/deleteUnavailability"
                  use:enhance={({ cancel }) => {
                    if (!confirm("Are you sure you want to delete this unavailability?")) {
                      cancel();
                    }
                    return async ({ update }) => {
                      await update();
                    };
                  }}
                >
                  <input type="hidden" name="id" value={item.id} />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    class="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 class="w-4 h-4" />
                  </Button>
                </form>
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </div>

    <div class="text-sm text-muted-foreground">
      Showing {sortedItems.length} unavailability {sortedItems.length === 1 ? "entry" : "entries"}
    </div>
  {/if}
</div>