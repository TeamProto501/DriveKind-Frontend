<!-- src/routes/admin/audit/+page.svelte -->
<script lang="ts">
  import RoleGuard from "$lib/components/RoleGuard.svelte";
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte";
  import {
    FileText,
    Search,
    Filter,
    Download,
    Eye,
    Calendar,
    User,
    Shield,
    Database,
    Settings,
  } from "@lucide/svelte";
  import Table from "./table.svelte";

  let { data } = $props();

  // 디버깅용
  $effect(() => {
    console.log("Raw data:", data);
    console.log("data.data:", data?.data);
    console.log("Is data.data array?", Array.isArray(data?.data));
  });

  let items = $derived(
    Array.isArray(data?.data?.data)
      ? data.data.data
      : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
          ? data
          : []
  );

  let searchQuery = $state("");
  let selectedTable = $state("all");
  let selectedAction = $state("all");
  let selectedDateRange = $state("all");
  let showDetailsModal = $state(false);
  let selectedLog = $state(null);

  let filteredData = $derived(
    items.filter((log) => {
      const matchesSearch =
        !searchQuery ||
        log.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.table_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.field_name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTable =
        selectedTable === "all" || log.table_name === selectedTable;

      const matchesAction =
        selectedAction === "all" || log.action === selectedAction;

      if (selectedDateRange === "all")
        return matchesSearch && matchesTable && matchesAction;

      const logDate = new Date(log.timestamp);
      const now = new Date();
      const timeDiff = now.getTime() - logDate.getTime();
      const daysDiff = timeDiff / (1000 * 3600 * 24);

      let matchesDate = true;
      switch (selectedDateRange) {
        case "24h":
          matchesDate = daysDiff <= 1;
          break;
        case "7d":
          matchesDate = daysDiff <= 7;
          break;
        case "30d":
          matchesDate = daysDiff <= 30;
          break;
        case "90d":
          matchesDate = daysDiff <= 90;
          break;
      }

      return matchesSearch && matchesTable && matchesAction && matchesDate;
    })
  );

  function viewDetails(log: any) {
    selectedLog = log;
    showDetailsModal = true;
  }

  function exportLogs() {
    console.log("Exporting audit logs...");
  }

  function closeModal() {
    showDetailsModal = false;
    selectedLog = null;
  }
</script>

<!-- <RoleGuard requiredRoles={["Admin", "Super Admin"]}> -->
<div class="min-h-screen bg-gray-50">
  <Breadcrumbs />

  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Audit Logs</h1>
      <p class="text-gray-600 mt-2">
        Monitor system activity and database changes.
      </p>
    </div>

    <!-- Filters and Controls -->
    <div class="bg-white shadow rounded-lg p-6 mb-6">
      <div class="flex flex-col sm:flex-row gap-4">
        <div class="flex-1">
          <div class="relative">
            <Search
              class="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              bind:value={searchQuery}
              type="text"
              placeholder="Search logs..."
              class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <div class="flex gap-2">
          <select
            bind:value={selectedTable}
            class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Tables</option>
            <option value="organization">Organization</option>
            <option value="clients">Clients</option>
            <option value="trips">Trips</option>
            <option value="staff_profiles">Staff Profiles</option>
          </select>
          <select
            bind:value={selectedAction}
            class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Actions</option>
            <option value="INSERT">Insert</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
          </select>
          <select
            bind:value={selectedDateRange}
            class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Time</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <button
            onclick={exportLogs}
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Download class="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Audit Logs Table -->
    <div class="bg-white shadow rounded-lg overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-medium text-gray-900">Activity Logs</h2>
          <span class="text-sm text-gray-500"
            >{filteredData.length} entries</span
          >
        </div>
      </div>
      <div class="overflow-x-auto">
        <Table data={filteredData} />
      </div>
    </div>
  </div>
</div>

<!-- Details Modal -->
{#if showDetailsModal && selectedLog}
  <div
    class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
  >
    <div
      class="relative top-20 mx-auto p-5 border w-2xl shadow-lg rounded-md bg-white max-w-2xl"
    >
      <div class="mt-3">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-medium text-gray-900">Audit Log Details</h3>
          <button
            onclick={closeModal}
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>

        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700"
                >Transaction ID</label
              >
              <p class="mt-1 text-sm text-gray-900">
                #{selectedLog.transaction_id}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700"
                >Timestamp</label
              >
              <p class="mt-1 text-sm text-gray-900">
                {selectedLog.timestamp}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">User</label
              >
              <p class="mt-1 text-sm text-gray-900">{selectedLog.name}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700"
                >Action</label
              >
              <p class="mt-1 text-sm text-gray-900">{selectedLog.action}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700"
                >Table Name</label
              >
              <p class="mt-1 text-sm text-gray-900">
                {selectedLog.table_name}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700"
                >Field Name</label
              >
              <p class="mt-1 text-sm text-gray-900">
                {selectedLog.field_name}
              </p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700"
                >Old Value</label
              >
              <p class="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                {selectedLog.old_value || "-"}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700"
                >New Value</label
              >
              <p class="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                {selectedLog.new_value || "-"}
              </p>
            </div>
          </div>
        </div>

        <div class="mt-6 flex justify-end">
          <button
            onclick={closeModal}
            class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-400 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
<!-- </RoleGuard> -->
