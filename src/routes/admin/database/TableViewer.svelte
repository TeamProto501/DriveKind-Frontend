<!-- src/lib/components/TableViewer.svelte -->
<script lang="ts">
  import { supabase } from '$lib/supabase';
  
  let { tableName, orgId }: { tableName: string, orgId: number } = $props();
  
  let records = $state([]);
  let columns = $state([]);
  let loading = $state(true);
  
  async function loadTableData() {
    loading = true;
    
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('org_id', orgId)
      .limit(50);
    
    if (data && data.length > 0) {
      columns = Object.keys(data[0]);
      records = data;
    }
    
    loading = false;
  }
  
  $effect(() => {
    if (tableName) loadTableData();
  });
</script>

{#if loading}
  <p>Loading {tableName}...</p>
{:else if records.length === 0}
  <p>No records found in {tableName} for your organization.</p>
{:else}
  <div class="overflow-x-auto">
    <table class="min-w-full divide-y divide-gray-200">
      <thead>
        <tr>
          {#each columns as col}
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              {col}
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each records as record}
          <tr class="border-b hover:bg-gray-50">
            {#each columns as col}
              <td class="px-4 py-2 text-sm">
                {record[col] || '-'}
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}