<script lang="ts">
  import * as Table from "$lib/components/ui/table/index.js";
  import * as Pagination from "$lib/components/ui/pagination/index.js";

  export let data: any = [];
  export let enableEdit: boolean = false;
  export let onEdit: ((row: any) => void) | null = null;

  // Optional delete callback for an extra button
  export let onDelete: ((row: any) => void) | null = null;

  // Optional: explicit column order / subset
  export let columns: string[] | null = null;

  // Whether to show the leading "#" index column
  export let showIndex: boolean = true;

  $: items = Array.isArray(data) ? data : data?.data ?? [];

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

  $: keys =
    columns && columns.length > 0
      ? columns
      : items[0]
      ? Object.keys(items[0])
      : [];

  const formatLabel = (k: string) =>
    k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  function handlePageChange(page: number) {
    currentPage = page;
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
                <Table.Cell>{row[key] ?? "-"}</Table.Cell>
              {/each}
              {#if enableEdit && (onEdit || onDelete)}
                <Table.Cell>
                  <div class="flex items-center gap-2">
                    {#if onEdit}
                      <button
                        type="button"
                        class="text-blue-600 hover:underline text-sm"
                        on:click={() => onEdit(row)}
                      >
                        Edit
                      </button>
                    {/if}
                    {#if onDelete}
                      <button
                        type="button"
                        class="text-red-600 hover:underline text-sm"
                        on:click={() => onDelete(row)}
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