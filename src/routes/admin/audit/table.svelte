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
</script>

<div>
  <Table.Root>
    <Table.Header>
      <Table.Row>
        <Table.Head>TimeStamp</Table.Head>
        <Table.Head>User</Table.Head>
        <Table.Head>Action</Table.Head>
        <Table.Head>Table Name</Table.Head>
        <Table.Head>Field Name</Table.Head>
      </Table.Row>
    </Table.Header>
    <Table.Body>
      <Table.Row>
        <Table.Cell></Table.Cell>
      </Table.Row>
    </Table.Body>
  </Table.Root>
</div>
