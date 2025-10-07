<script lang="ts">
  import * as Table from "$lib/components/ui/table/index.js";
  import * as Pagination from "$lib/components/ui/pagination/index.js";
  export let data: any = [];
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
          <Table.Head class="px-4 py-2 font-medium whitespace-nowrap"
            >TimeStamp</Table.Head
          >
          <Table.Head class="px-4 py-2 font-medium whitespace-nowrap"
            >User</Table.Head
          >
          <Table.Head class="px-4 py-2 font-medium whitespace-nowrap"
            >Action</Table.Head
          >
          <Table.Head class="px-4 py-2 font-medium whitespace-nowrap"
            >Table Name</Table.Head
          >
          <Table.Head class="px-4 py-2 font-medium whitespace-nowrap"
            >Field Name</Table.Head
          >
          <Table.Head class="px-4 py-2 font-medium whitespace-nowrap"
            >Previous Value</Table.Head
          >
          <Table.Head class="px-4 py-2 font-medium whitespace-nowrap"
            >New Value</Table.Head
          >
        </Table.Row>
      </Table.Header>
      <Table.Body class="divide-y divide-gray-200">
        {#if pagedData.length > 0}
          {#each pagedData as row, i}
            <Table.Row class="hover:bg-gray-50">
              <Table.Cell class="px-4 py-3 text-gray-500">
                {(currentPage - 1) * pageSize + i + 1}
              </Table.Cell>
              <Table.Cell class="px-4 py-3 text-sm">
                {row.timestamp}
              </Table.Cell>
              <Table.Cell class="px-4 py-3 font-medium">
                {row.name ?? "-"}
              </Table.Cell>
              <Table.Cell class="px-4 py-3">
                <span class={getActionClass(row.action)}>
                  {row.action ?? "-"}
                </span>
              </Table.Cell>
              <Table.Cell class="px-4 py-3">
                {row.table_name ?? "-"}
              </Table.Cell>
              <Table.Cell class="px-4 py-3">
                {row.field_name ?? "-"}
              </Table.Cell>
              <Table.Cell class="px-4 py-3">
                {row.old_value ?? "-"}
              </Table.Cell>
              <Table.Cell class="px-4 py-3">
                {row.new_value ?? "-"}
              </Table.Cell>
            </Table.Row>
          {/each}
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
