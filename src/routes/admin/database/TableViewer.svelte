<!-- src/routes/admin/database/TableViewer.svelte -->
<script lang="ts">
  import { supabase } from '$lib/supabase';
  import { Loader2, AlertCircle } from '@lucide/svelte';
  
  let { tableName, orgId }: { tableName: string, orgId: number } = $props();
  
  let records = $state([]);
  let columns = $state([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  
  async function loadTableData() {
    loading = true;
    error = null;
    
    try {
      const { data, error: fetchError } = await supabase
        .from(tableName)
        .select('*')
        .eq('org_id', orgId)
        .limit(100);
      
      if (fetchError) throw fetchError;
      
      if (data && data.length > 0) {
        columns = Object.keys(data[0]);
        records = data;
      } else {
        records = [];
        columns = [];
      }
    } catch (err: any) {
      error = err.message || 'Failed to load data';
      console.error('Error loading table data:', err);
    } finally {
      loading = false;
    }
  }
  
  $effect(() => {
    if (tableName) loadTableData();
  });
</script>

{#if loading}
  <div class="flex flex-col items-center justify-center py-12">
    <Loader2 class="w-8 h-8 text-blue-600 animate-spin mb-3" />
    <p class="text-gray-600">Loading {tableName}...</p>
  </div>
{:else if error}
  <div class="flex flex-col items-center justify-center py-12">
    <div class="p-3 bg-red-50 rounded-full mb-3">
      <AlertCircle class="w-6 h-6 text-red-600" />
    </div>
    <p class="text-red-600 font-medium mb-1">Error loading data</p>
    <p class="text-sm text-gray-600">{error}</p>
  </div>
{:else if records.length === 0}
  <div class="text-center py-12">
    <div class="p-3 bg-gray-100 rounded-full inline-block mb-3">
      <AlertCircle class="w-6 h-6 text-gray-400" />
    </div>
    <p class="text-gray-600 font-medium">No records found</p>
    <p class="text-sm text-gray-500 mt-1">
      This table has no data for your organization yet.
    </p>
  </div>
{:else}
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <p class="text-sm text-gray-600">
        Showing <span class="font-medium text-gray-900">{records.length}</span> records
      </p>
    </div>
    
    <div class="overflow-x-auto border border-gray-200 rounded-lg">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            {#each columns as col}
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                {col}
              </th>
            {/each}
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          {#each records as record}
            <tr class="hover:bg-gray-50 transition-colors">
              {#each columns as col}
                <td class="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                  {#if record[col] === null}
                    <span class="text-gray-400 italic">null</span>
                  {:else if typeof record[col] === 'boolean'}
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium {record[col] ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                      {record[col] ? 'Yes' : 'No'}
                    </span>
                  {:else}
                    {record[col]}
                  {/if}
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
{/if}