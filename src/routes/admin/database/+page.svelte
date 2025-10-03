<script lang="ts">
  import TableViewer from './TableViewer.svelte';
  
  let { data } = $props();
  
  let selectedTable = $state('');
</script>

<!-- In your table list -->
{#each data.tables as table}
  <tr class="hover:bg-gray-50">
    <td class="px-6 py-4">
      <button 
        onclick={() => selectedTable = table.name}
        class="text-blue-600 hover:underline"
      >
        {table.name}
      </button>
    </td>
    <td class="px-6 py-4">{table.records}</td>
    <!-- ... other columns -->
  </tr>
{/each}

<!-- Modal or panel to show table contents -->
{#if selectedTable}
  <TableViewer tableName={selectedTable} orgId={data.userOrgId} />
{/if}
