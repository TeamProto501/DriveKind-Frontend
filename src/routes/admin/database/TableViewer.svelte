<script lang="ts">
  import { supabase } from '$lib/supabase';
  import { Loader2, AlertCircle, Download, Search, X, Filter, Plus, ChevronUp, ChevronDown, ChevronsUpDown } from '@lucide/svelte';
  import { exportToCSV } from '$lib/utils/csvExport';
  
  let { tableName, orgId }: { tableName: string, orgId: number } = $props();
  
  let allRecords = $state([]);
  let displayedRecords = $state([]);
  let columns = $state([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let exporting = $state(false);
  
  // Pagination
  let currentPage = $state(1);
  let pageSize = $state(20);
  
  // Sorting
  type SortField = string | null;
  type SortDirection = 'asc' | 'desc' | null;
  let sortField = $state<SortField>(null);
  let sortDirection = $state<SortDirection>(null);
  
  // Filter state
  let filters = $state<Array<{id: number, column: string, value: string}>>([]);
  let nextFilterId = $state(0);
  let newFilterColumn = $state('');
  let newFilterValue = $state('');
  
  let columnTypes = $state<Record<string, string>>({});
  
  // Derived pagination values
  let totalPages = $derived(Math.max(Math.ceil(displayedRecords.length / pageSize), 1));
  let paginatedRecords = $derived(displayedRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize));
  
  function toggleSort(field: string) {
    if (sortField === field) {
      if (sortDirection === null) sortDirection = 'asc';
      else if (sortDirection === 'asc') sortDirection = 'desc';
      else { sortDirection = null; sortField = null; }
    } else {
      sortField = field;
      sortDirection = 'asc';
    }
    applySortingAndFilters();
  }

  function getSortIcon(field: string) {
    if (sortField !== field) return ChevronsUpDown;
    if (sortDirection === 'asc') return ChevronUp;
    if (sortDirection === 'desc') return ChevronDown;
    return ChevronsUpDown;
  }

  function applySortingAndFilters() {
    let results = [...allRecords];

    // Apply filters first
    if (filters.length > 0) {
      results = results.filter(record => {
        return filters.every(filter => {
          const recordValue = record[filter.column];
          const filterValue = filter.value.toLowerCase();
          
          if (recordValue === null || recordValue === undefined) {
            return filterValue === 'null' || filterValue === '';
          }
          
          const recordValueStr = String(recordValue).toLowerCase();
          return recordValueStr.includes(filterValue);
        });
      });
    }

    // Apply sorting
    if (sortField && sortDirection) {
      results.sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];

        if (aVal === null || aVal === undefined) return sortDirection === 'asc' ? 1 : -1;
        if (bVal === null || bVal === undefined) return sortDirection === 'asc' ? -1 : 1;

        if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    displayedRecords = results;
    currentPage = 1; // Reset to page 1 after filtering/sorting
  }
  
  function addFilter() {
    if (!newFilterColumn || newFilterValue.trim() === '') return;
    
    filters = [...filters, {
      id: nextFilterId++,
      column: newFilterColumn,
      value: newFilterValue.trim()
    }];
    
    newFilterValue = '';
    applySortingAndFilters();
  }
  
  function removeFilter(filterId: number) {
    filters = filters.filter(f => f.id !== filterId);
    applySortingAndFilters();
  }
  
  function clearAllFilters() {
    filters = [];
    newFilterValue = '';
    sortField = null;
    sortDirection = null;
    displayedRecords = allRecords;
    currentPage = 1;
  }
  
  async function loadTableData() {
    loading = true;
    error = null;
    
    try {
      const response = await fetch(`/admin/database/${tableName}?orgId=${orgId}`);
      const result = await response.json();
      
      if (result.error) throw new Error(result.error);
      
      const data = result.data;
      
      if (data && data.length > 0) {
        // Reorder columns to put name fields first
        const allColumns = Object.keys(data[0]);
        const nameColumns = allColumns.filter(col => 
          col.endsWith('_name') || col === 'driver_name' || col === 'dispatcher_name' || col === 'user_name' || col === 'client_name'
        );
        const otherColumns = allColumns.filter(col => !nameColumns.includes(col));
        
        columns = [...nameColumns, ...otherColumns];
        allRecords = data;
        displayedRecords = data;
        
        detectColumnTypes(data[0]);
        newFilterColumn = columns[0];
      } else {
        allRecords = [];
        displayedRecords = [];
        columns = [];
      }
    } catch (err: any) {
      error = err.message || 'Failed to load data';
      console.error('Error loading table data:', err);
    } finally {
      loading = false;
    }
  }
  
  function detectColumnTypes(sampleRecord: any) {
    const types: Record<string, string> = {};
    
    for (const col in sampleRecord) {
      const value = sampleRecord[col];
      
      if (value === null) {
        types[col] = 'string';
      } else if (typeof value === 'boolean') {
        types[col] = 'boolean';
      } else if (typeof value === 'number') {
        types[col] = 'number';
      } else if (typeof value === 'string') {
        if (value.match(/^\d{4}-\d{2}-\d{2}/)) {
          types[col] = 'date';
        } else {
          types[col] = 'string';
        }
      } else {
        types[col] = 'string';
      }
    }
    
    columnTypes = types;
  }
  
  async function handleExport() {
    exporting = true;
    
    try {
      const dataToExport = displayedRecords.length > 0 ? displayedRecords : allRecords;
      
      if (dataToExport.length > 0) {
        const filename = filters.length > 0 
          ? `${tableName}_filtered` 
          : tableName;
        exportToCSV(dataToExport, filename);
      } else {
        alert('No data to export');
      }
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
      console.error('Export error:', err);
    } finally {
      exporting = false;
    }
  }
  
  function formatCellValue(value: any, columnName: string) {
    if (value === null || value === undefined) {
      return { type: 'null', value: null };
    }
    
    const colType = columnTypes[columnName];
    
    if (colType === 'boolean') {
      return { type: 'boolean', value };
    } else if (colType === 'date' && typeof value === 'string') {
      return { type: 'date', value };
    } else {
      return { type: 'text', value: String(value) };
    }
  }
  
  function nextPage() { if (currentPage < totalPages) currentPage++; }
  function prevPage() { if (currentPage > 1) currentPage--; }
  function changePageSize(size: number) {
    pageSize = size;
    currentPage = 1;
  }
  
  $effect(() => {
    if (tableName) {
      filters = [];
      nextFilterId = 0;
      newFilterValue = '';
      currentPage = 1;
      loadTableData();
    }
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
{:else if allRecords.length === 0}
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
    <!-- Search & Filter Section -->
    <div class="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
      <div class="flex items-center gap-2 text-sm font-medium text-gray-700">
        <Filter class="w-4 h-4" />
        <span>Search & Filter</span>
      </div>
      
      <div class="flex gap-2">
        <select
          bind:value={newFilterColumn}
          class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        >
          {#each columns as col}
            <option value={col}>{col}</option>
          {/each}
        </select>
        
        <div class="flex-1 relative">
          <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            bind:value={newFilterValue}
            onkeydown={(e) => e.key === 'Enter' && addFilter()}
            placeholder="Enter search value..."
            class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>
        
        <button
          onclick={addFilter}
          disabled={!newFilterValue.trim()}
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
        >
          <Plus class="w-4 h-4" />
          Add Filter
        </button>
      </div>
      
      {#if filters.length > 0}
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-gray-600 uppercase">Active Filters:</span>
            <button
              onclick={clearAllFilters}
              class="text-xs text-red-600 hover:text-red-700 font-medium"
            >
              Clear All
            </button>
          </div>
          
          <div class="flex flex-wrap gap-2">
            {#each filters as filter}
              <div class="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm">
                <span class="font-medium">{filter.column}:</span>
                <span>"{filter.value}"</span>
                <button
                  onclick={() => removeFilter(filter.id)}
                  class="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                >
                  <X class="w-3 h-3" />
                </button>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
    
    <!-- Results Info & Export -->
    <div class="flex items-center justify-between">
      <div class="text-sm text-gray-600">
        Showing <span class="font-medium text-gray-900">{displayedRecords.length}</span> 
        {#if filters.length > 0}
          of <span class="font-medium text-gray-900">{allRecords.length}</span>
        {/if}
        records
        {#if filters.length > 0}
          <span class="text-blue-600">(filtered)</span>
        {/if}
      </div>
      
      <button
        onclick={handleExport}
        disabled={exporting}
        class="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
      >
        {#if exporting}
          <Loader2 class="w-4 h-4 animate-spin" />
          Exporting...
        {:else}
          <Download class="w-4 h-4" />
          Export {filters.length > 0 ? 'Filtered' : 'All'} to CSV
        {/if}
      </button>
    </div>
    
   <!-- Table -->
    <div class="overflow-x-auto border border-gray-200 rounded-lg max-h-[600px] overflow-y-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50 sticky top-0 z-10">
          <tr>
            {#each columns as col}
              {@const Icon = getSortIcon(col)}
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-50">
                <button 
                  class="flex items-center gap-1 hover:text-gray-900 transition-colors"
                  onclick={() => toggleSort(col)}
                >
                  {col}
                  <Icon class="w-4 h-4" />
                </button>
              </th>
            {/each}
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          {#if displayedRecords.length === 0}
            <tr>
              <td colspan={columns.length} class="px-4 py-8 text-center text-gray-500">
                <div class="flex flex-col items-center gap-2">
                  <Search class="w-8 h-8 text-gray-300" />
                  <p class="font-medium">No records match your filters</p>
                  <button
                    onclick={clearAllFilters}
                    class="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Clear filters to see all records
                  </button>
                </div>
              </td>
            </tr>
          {:else}
            {#each paginatedRecords as record}
              <tr class="hover:bg-gray-50 transition-colors">
                {#each columns as col}
                  {@const cellData = formatCellValue(record[col], col)}
                  <td class="px-4 py-3 text-sm whitespace-nowrap">
                    {#if cellData.type === 'null'}
                      <span class="text-gray-400 italic">null</span>
                    {:else if cellData.type === 'boolean'}
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium {cellData.value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                        {cellData.value ? 'Yes' : 'No'}
                      </span>
                    {:else if cellData.type === 'date'}
                      <span class="text-gray-900">{new Date(cellData.value).toLocaleDateString()}</span>
                    {:else}
                      <span class="text-gray-900">{cellData.value}</span>
                    {/if}
                  </td>
                {/each}
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
    
    <!-- Pagination -->
    {#if displayedRecords.length > 0}
      <div class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t">
        <div class="flex items-center gap-2 text-sm text-gray-600">
          <span>Show</span>
          <select
            bind:value={pageSize}
            onchange={(e) => changePageSize(parseInt(e.currentTarget.value))}
            class="border rounded px-2 py-1 text-sm"
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
          <span>entries</span>
          <span class="ml-2 text-gray-500">
            ({displayedRecords.length} total)
          </span>
        </div>

        <div class="flex items-center gap-4">
          <button
            class="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            onclick={prevPage}
            disabled={currentPage === 1}
          >
            Previous
          </button>

          <span class="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>

          <button
            class="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            onclick={nextPage}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      </div>
    {/if}
    
    {#if allRecords.length >= 1000}
      <div class="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
        ⚠️ Showing first 1,000 records. Use filters to narrow down results for better performance.
      </div>
    {/if}
  </div>
{/if}