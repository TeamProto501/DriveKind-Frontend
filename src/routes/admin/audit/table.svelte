<script lang="ts">
  import * as Table from "$lib/components/ui/table/index.js";
  import * as Pagination from "$lib/components/ui/pagination/index.js";
  import { X } from "@lucide/svelte";

  let {
    data = [],
    enableEdit = false,
    onEdit = null,
    onDelete = null,
    columns = null,
    showIndex = true
  }: {
    data?: any;
    enableEdit?: boolean;
    onEdit?: ((row: any) => void) | null;
    onDelete?: ((row: any) => void) | null;
    columns?: string[] | null;
    showIndex?: boolean;
  } = $props();

  let items = $derived(Array.isArray(data) ? data : data?.data ?? []);

  const pageSize = 15;
  let currentPage = $state(1);

  let pagedData = $derived(items.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  ));

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

  let keys = $derived(
    columns && columns.length > 0
      ? columns
      : items[0]
      ? Object.keys(items[0])
      : []
  );

  const formatLabel = (k: string) => {
    if (k === "transaction_id") return "ID";
    if (k === "action_enum") return "Action";
    if (k === "table_name_enum") return "Table";

    return k
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  function handlePageChange(page: number) {
    currentPage = page;
  }

  // Modal state for showing full cell content
  let showCellModal = $state(false);
  let cellModalContent = $state("");
  let cellModalTitle = $state("");

  function openCellModal(key: string, value: any) {
    cellModalTitle = formatLabel(key);
    cellModalContent = value != null ? String(value) : "-";
    showCellModal = true;
  }

  function closeCellModal() {
    showCellModal = false;
    cellModalContent = "";
    cellModalTitle = "";
  }
</script>

<div class="space-y-4">
  <div class="overflow-x-auto border border-gray-100 rounded-md">
    <Table.Root class="min-w-full divide-y-2 divide-gray-200 bg-white text-sm">
      <Table.Header class="ltr:text-left rtl:text-right bg-gray-100">
        <Table.Row>
          {#if showIndex}
            <Table.Head class="sticky inset-y-0 start-0 px-4 py-4">#</Table.Head>
          {/if}
          {#each keys as key}
            <Table.Head class="px-4 py-2 font-medium whitespace-nowrap">
              {formatLabel(key)}
            </Table.Head>
          {/each}
          {#if enableEdit && (onEdit || onDelete)}
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
              {#if showIndex}
                <Table.Cell>
                  {(currentPage - 1) * pageSize + i + 1}
                </Table.Cell>
              {/if}
              {#each keys as key}
                <Table.Cell 
                  class="max-w-48 truncate cursor-pointer hover:bg-gray-50 transition-colors"
                  title="Click to view full content"
                  onclick={() => openCellModal(key, row[key])}
                >
                  <span class="block truncate">
                    {row[key] ?? "-"}
                  </span>
                </Table.Cell>
              {/each}
              {#if enableEdit && (onEdit || onDelete)}
                <Table.Cell>
                  <div class="flex items-center gap-2">
                    {#if onEdit}
                      <button
                        type="button"
                        class="text-blue-600 hover:underline text-sm"
                        onclick={() => onEdit(row)}
                      >
                        Edit
                      </button>
                    {/if}
                    {#if onDelete}
                      <button
                        type="button"
                        class="text-red-600 hover:underline text-sm"
                        onclick={() => onDelete(row)}
                      >
                        Delete
                      </button>
                    {/if}
                  </div>
                </Table.Cell>
              {/if}
            </Table.Row>
          {/each}
        {:else}
          <Table.Row>
            <Table.Cell
              colspan={keys.length + (enableEdit && (onEdit || onDelete) ? 1 : 0) + (showIndex ? 1 : 0)}
              class="text-center py-8 text-gray-500"
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

<!-- Cell Content Modal -->
{#if showCellModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onclick={closeCellModal}>
    <div class="w-full max-w-2xl mx-4 rounded-lg bg-white p-6 shadow-lg" onclick={(e) => e.stopPropagation()}>
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-lg font-semibold">
          {cellModalTitle}
        </h3>
        <button
          type="button"
          class="text-gray-400 hover:text-gray-600"
          onclick={closeCellModal}
        >
          <X class="h-5 w-5" />
        </button>
      </div>
      
      <div class="max-h-96 overflow-y-auto rounded border border-gray-200 bg-gray-50 p-4">
        <pre class="whitespace-pre-wrap wrap-break-word text-sm text-gray-800">{cellModalContent}</pre>
      </div>

      <div class="mt-4 flex justify-end">
        <button
          type="button"
          class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          onclick={closeCellModal}
        >
          Close
        </button>
      </div>
    </div>
  </div>
{/if}