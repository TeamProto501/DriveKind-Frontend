<script lang="ts">
  import * as Table from "$lib/components/ui/table/index.js";
  import * as Pagination from "$lib/components/ui/pagination/index.js";
  import { Trash2 } from "@lucide/svelte";
  import { enhance } from "$app/forms";
  
  export let data: any = [];
  
  $: items = Array.isArray(data) ? data : (data?.data ?? []);
  
  // Debug: Log the first item to see what fields we have
  $: if (items[0]) {
    console.log('First item keys:', Object.keys(items[0]));
    console.log('First item:', items[0]);
  }
  
  const pageSize = 15;
  let currentPage = 1;
  
  $: pagedData = items.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  
  // Get all keys except id and user_id
  $: allKeys = items[0] ? Object.keys(items[0]) : [];
  $: displayKeys = allKeys.filter(key => key !== 'id' && key !== 'user_id');
  
  // Debug: Log what keys we're displaying
  $: console.log('All keys:', allKeys);
  $: console.log('Display keys:', displayKeys);
  
  function formatLabel(k: string): string {
    return k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  
  // Format dates to local time
  function formatValue(key: string, value: any): string {
    if (value === null || value === undefined) return "-";
    
    // Date fields - show local date/time
    if (key === "created_at" || key === "updated_at") {
      try {
        const date = new Date(value);
        const formatted = date.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        console.log(`Formatted ${key}:`, value, '->', formatted);
        return formatted;
      } catch (e) {
        console.error(`Error formatting ${key}:`, e);
        return String(value);
      }
    }
    
    // Unavailable date - show only date
    if (key === "unavailable_date") {
      if (!value) return "-";
      try {
        const date = new Date(value + 'T00:00:00');
        const formatted = date.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        console.log(`Formatted ${key}:`, value, '->', formatted);
        return formatted;
      } catch (e) {
        console.error(`Error formatting ${key}:`, e);
        return String(value);
      }
    }
    
    // Repeating day - just display as is
    if (key === "repeating_day") {
      return value || "-";
    }
    
    // Time fields - convert to 12-hour format
    if (key === "start_time" || key === "end_time") {
      if (!value) return "-";
      try {
        const [hours, minutes] = value.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${displayHour}:${minutes} ${ampm}`;
      } catch (e) {
        console.error(`Error formatting time ${key}:`, e);
        return String(value);
      }
    }
    
    // Boolean fields
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
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
          {#each displayKeys as key}
            <Table.Head class="px-4 py-2 font-medium text-left whitespace-nowrap">
              {formatLabel(key)}
            </Table.Head>
          {/each}
          <Table.Head class="px-4 py-2 font-medium text-left">Actions</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body class="divide-y divide-gray-200">
        {#if pagedData.length > 0}
          {#each pagedData as row, i}
            <Table.Row>
              <Table.Cell class="px-4 py-2">{(currentPage - 1) * pageSize + i + 1}</Table.Cell>
              {#each displayKeys as key}
                <Table.Cell class="px-4 py-2">{formatValue(key, row[key])}</Table.Cell>
              {/each}
              <Table.Cell class="px-4 py-2">
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
                  <input type="hidden" name="id" value={row.id} />
                  <button
                    type="submit"
                    class="text-red-600 hover:text-red-800 transition-colors p-1 hover:bg-red-50 rounded"
                    title="Delete unavailability"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </form>
              </Table.Cell>
            </Table.Row>
          {/each}
        {:else}
          <Table.Row>
            <Table.Cell colspan={displayKeys.length + 2} class="text-center py-8 text-gray-500">
              No unavailability records found
            </Table.Cell>
          </Table.Row>
        {/if}
      </Table.Body>
    </Table.Root>

    {#if items.length > pageSize}
      <div class="mt-4 flex justify-end pb-2 px-4">
        <Pagination.Root
          count={items.length}
          perPage={pageSize}
          bind:page={currentPage}
        >
          {#snippet children({ pages })}
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
