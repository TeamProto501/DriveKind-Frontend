<script lang="ts">
  import * as Table from "$lib/components/ui/table/index.js";
  import * as Pagination from "$lib/components/ui/pagination/index.js";
  import { createEventDispatcher } from "svelte";

  export let data: any = [];
  export let isCalls: boolean = false; // if true, show Edit buttons and emit editCall

  const dispatch = createEventDispatcher();

  $: items = Array.isArray(data) ? data : (data?.data ?? []);
  const pageSize = 15;
  let currentPage = 1;

  $: pagedData = items.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const getActionClass = (action: string) => {
    switch (action) {
      case "INSERT":
        return "text-green-600 font-semibold";
      case "UPDATE":
        return "text-blue-600 font-semibold";
      case "DELETE":
        return "text-red-600 font-semibold";
      default:
        return "text-gray-600";
    }
  };

  $: keys = items[0] ? Object.keys(items[0]) : [];

  const formatLabel = (k: string) =>
    k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  function handlePageChange(page: number) {
    currentPage = page;
  }

  function handleEdit(row: any) {
    dispatch("editCall", row);
  }
</script>

<div class="space-y-4">
  <div class="overflow-x-auto border-1 border-gray-100 rounded-md">
    <Table.Root class="min-w-full divide-y-2 divide-gray-200 bg-white text-sm">
      <Table.Header class="ltr:text-left rtl:text-right bg-gray-100">
        <Table.Row>
          <Table.Head class="sticky inset-y-0 start-0 px-4 py-4">#</Table.Head>
          {#each keys as key}
            <Table.Head class="px-4 py-2 font-medium whitespace-nowrap">
              {formatLabel(key)}
            </Table.Head>
          {/each}
          {#if isCalls}
            <Table.Head class="px-4 py-2 font-medium whitespace-nowrap">
              Actions
            </Table.Head>
          {/if}
        </Table.Row>
      </Table.Header>
      <Table.Body class="divide-y divide-gray-200">
        {#if pagedData.length > 0}
          {#each pagedData as row, i}
            <Table.Row class="px-4 py-2">
              <Table.Cell>
                {(currentPage - 1) * pageSize + i + 1}
              </Table.Cell>
              {#each keys as key}
                <Table.Cell
                  class={key === "action" ? getActionClass(row[key]) : ""}
                >
                  {row[key] ?? "-"}
                </Table.Cell>
              {/each}
              {#if isCalls}
                <Table.Cell>
                  <button
                    type="button"
                    class="px-3 py-1 text-xs rounded-md border border-blue-500 text-blue-600 hover:bg-blue-50"
                    on:click={() => handleEdit(row)}
                  >
                    Edit
                  </button>
                </Table.Cell>
              {/if}
            </Table.Row>
          {/each}
        {:else}
          <Table.Row>
            <Table.Cell
              class="text-center py-8 text-gray-500"
              colspan={keys.length + 1 + (isCalls ? 1 : 0)}
            >
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