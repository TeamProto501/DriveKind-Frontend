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
  $: keys = items[0] ? Object.keys(items[0]) : [];
  const formatLabel = (k: string) =>
    k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  function handlePageChange(page: number) {
    currentPage = page;
  }
</script>

<div class="overflow-x-auto border-1 border-gray-100 rounded-md">
  <Table.Root class="min-w-full divide-y-2 divide-gray-200 bg-white text-sm ">
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
      {#each pagedData as row, i}
        <Table.Row class="px-4 py-2">
          <Table.Cell>{(currentPage - 1) * pageSize + i + 1}</Table.Cell>
          {#each keys as key}
            <Table.Cell>{row[key] ?? "-"}</Table.Cell>
          {/each}
        </Table.Row>
      {/each}
      <Table.Row class="text-gray-500 font-bold">
        Total: {data.length}
      </Table.Row>
      {#if pagedData.length === 0}
        <Table.Row>
          <Table.Cell colspan={keys.length + 1} class="text-center"
            >No data</Table.Cell
          >
        </Table.Row>
      {/if}
    </Table.Body>
  </Table.Root>

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
                <Pagination.Link {page} isActive={currentPage === page.value}>
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
</div>
<!-- <div class="flex flex-col">
  <div class="overflow-x-auto border-1 border-gray-100 rounded-md">
    <table class="min-w-full divide-y-2 divide-gray-200 bg-white text-sm">
      <thead class="ltr:text-left rtl:text-right bg-gray-100">
        <tr>
          <th class="sticky inset-y-0 start-0 px-4 py-4">
            <label for="SelectAll" class="sr-only">Select All</label>

            <input
              type="checkbox"
              id="SelectAll"
              class="size-5 rounded-sm border-gray-300"
            />
          </th>
          {#each columns as col}
            <th class="px-4 py-2 font-medium whitespace-nowrap">{col.label}</th>
          {/each}
        </tr>
      </thead>

      <tbody class="divide-y divide-gray-200">
        {#if rows?.length}
          {#each rows as row, i}
            <tr>
              <td class="px-4 py-2"><input type="checkbox" id={"r" + i} /></td>
              {#each columns as col}
                <td class="px-4 py-2 whitespace-nowrap"
                  >{row[col.key] ?? "-"}</td
                >
              {/each}
            </tr>
          {/each}
          <tr>
            <td colspan={colspan()} class="px-4 py-2 text-gray-500 font-bold">
              Total: {rows.length}
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan={colspan()}>No data</td>
          </tr>
        {/if}
        <tr>
          <td colspan="8" class=" px-4 py-2 whitespace-nowrap text-gray-500"
            >Total: <span class="font-bold text-black">{rows.length}</span></td
          >
        </tr>
      </tbody>
    </table>
  </div>
</div> -->
