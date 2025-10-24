<script lang="ts">
  import * as Table from "$lib/components/ui/table/index.js";
  import * as Pagination from "$lib/components/ui/pagination/index.js";
  import { Trash2 } from "@lucide/svelte";
  import { enhance } from "$app/forms";
  export let data: any = [];
  $: items = Array.isArray(data) ? data : (data?.data ?? []);
  const pageSize = 15;
  let currentPage = 1;
  $: pagedData = items.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  $: keys = items[0]
    ? Object.keys(items[0]).filter((key) => key !== "user_id")
    : [];
  const formatLabel = (k: string) =>
    k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  function handlePageChange(page: number) {
    currentPage = page;
  }
</script>

<div class="space-y-4">
  <div class="overflow-x-auto border-1 border-gray-100 rounded-md">
    <Table.Root class="min-w-full divide-y-2 divide-gray-200 bg-white text-sm">
      <Table.Header class="ltr:text-left rtl:text-right bg-gray-100">
        <Table.Row>
          <Table.Head class="sticky inset-y-0 start-0 px-4 py-4">#</Table.Head>
          {#each keys as key}
            <Table.Head class="px-4 py-2 font-medium whitespace-nowrap"
              >{formatLabel(key)}</Table.Head
            >
          {/each}
        </Table.Row>
      </Table.Header>
      <Table.Body class="divide-y divide-gray-200">
        {#if pagedData.length > 0}
          {#each pagedData as row, i}
            <Table.Row class="px-4 py-2">
              <Table.Cell>{(currentPage - 1) * pageSize + i + 1}</Table.Cell>
              {#each keys as key}
                <Table.Cell>{row[key] ?? "-"}</Table.Cell>
              {/each}
              <Table.Cell>
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
                  }}
                >
                  <input type="hidden" name="id" value={row.id} />
                  <button
                    type="submit"
                    class="text-red-600 hover:text-red-800 transition-colors"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </form>
              </Table.Cell>
            </Table.Row>
          {/each}

          {#if pagedData.length === 0}
            <Table.Row>
              <Table.Cell colspan={keys.length + 1} class="text-center"
                >No data</Table.Cell
              >
            </Table.Row>
          {/if}
        {:else}
          <Table.Row>
            <Table.Cell class="text-center py-8 text-gray-500 col-span-6">
              No Data
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
