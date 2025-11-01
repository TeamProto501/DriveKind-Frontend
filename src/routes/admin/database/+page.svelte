<!-- src/routes/admin/database/+page.svelte -->
<script lang="ts">
  import RoleGuard from '$lib/components/RoleGuard.svelte';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import TableViewer from './TableViewer.svelte';
  import { 
    Database, 
    Users, 
    User, 
    Car, 
    Truck, 
    Phone,
    X,
    ChevronRight,
    MapPin            // ← ADD THIS
  } from '@lucide/svelte';
  
  let { data } = $props();
  
  let selectedTable = $state<string | null>(null);
  let selectedTableDisplay = $state('');
  
  function openTable(tableName: string, displayName: string) {
    selectedTable = tableName;
    selectedTableDisplay = displayName;
  }
  
  function closeTable() {
    selectedTable = null;
    selectedTableDisplay = '';
  }
  
  function getIcon(iconName: string) {
    const icons = {
      users: Users,
      user: User,
      car: Car,
      truck: Truck,
      phone: Phone,
      map: MapPin       // ← ADD THIS
    };
    return icons[iconName] || Database;
  }
</script>

<RoleGuard requiredRoles={['Admin']}>
  <div class="min-h-screen bg-gray-50">
    <Breadcrumbs />

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Database class="w-8 h-8 text-blue-600" />
          Database Management
        </h1>
        <p class="text-gray-600 mt-2">
          View and manage your organization's database tables
        </p>
      </div>

      <!-- Table Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each data.tables as table}
          {@const IconComponent = getIcon(table.icon)}
          <button
            onclick={() => openTable(table.name, table.display)}
            class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all duration-200 text-left group"
          >
            <div class="flex items-start justify-between mb-4">
              <div class="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                <IconComponent class="w-6 h-6 text-blue-600" />
              </div>
              <ChevronRight class="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
            </div>
            
            <h3 class="text-lg font-semibold text-gray-900 mb-2">
              {table.display}
            </h3>
            
            <div class="flex items-baseline gap-2">
              <span class="text-3xl font-bold text-gray-900">
                {table.records.toLocaleString()}
              </span>
              <span class="text-sm text-gray-500">records</span>
            </div>
            
            {#if table.error}
              <p class="mt-2 text-xs text-red-600">Error loading count</p>
            {/if}
            
            <div class="mt-4 text-sm text-blue-600 font-medium group-hover:underline">
              View table →
            </div>
          </button>
        {/each}
      </div>

      <!-- Statistics Overview -->
      <div class="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Database Overview</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p class="text-sm text-gray-600 mb-1">Total Tables</p>
            <p class="text-2xl font-bold text-gray-900">{data.tables.length}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600 mb-1">Total Records</p>
            <p class="text-2xl font-bold text-gray-900">
              {data.tables.reduce((sum, t) => sum + t.records, 0).toLocaleString()}
            </p>
          </div>
          <div>
            <p class="text-sm text-gray-600 mb-1">Organization ID</p>
            <p class="text-2xl font-bold text-gray-900">{data.userOrgId}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600 mb-1">Access Level</p>
            <p class="text-2xl font-bold text-green-600">Admin</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Table Viewer Modal -->
    {#if selectedTable}
      <div class="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4">
        <div class="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
          <!-- Modal Header -->
          <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <Database class="w-5 h-5 text-blue-600" />
              <h2 class="text-xl font-semibold text-gray-900">{selectedTableDisplay}</h2>
              <span class="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                Org ID: {data.userOrgId}
              </span>
            </div>
            <button
              onclick={closeTable}
              class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X class="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <!-- Modal Body -->
          <div class="flex-1 overflow-auto p-6">
            <TableViewer tableName={selectedTable} orgId={data.userOrgId} />
          </div>

          <!-- Modal Footer -->
          <div class="px-6 py-4 border-t border-gray-200 flex justify-end">
            <button
              onclick={closeTable}
              class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    {/if}
  </div>
</RoleGuard>