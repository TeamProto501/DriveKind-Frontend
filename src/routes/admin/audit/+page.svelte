<!-- src/routes/admin/audit/+page.svelte -->
<script lang="ts">
  import RoleGuard from "$lib/components/RoleGuard.svelte";
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte";
  let { data } = $props();
  let items = $derived(Array.isArray(data) ? data : (data?.data ?? []));
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

  let searchQuery = $state("");
  let selectedResource = $state("all");
  let selectedStatus = $state("all");
  let selectedDateRange = $state("24h");
  let showDetailsModal = $state(false);
  let selectedLog = $state(null);

  let filteredData = $derived(
    items.filter((log) => {
      const matchesSearch =
        !searchQuery ||
        log.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.table_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.field_name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesResource =
        selectedResource === "all" ||
        log.table_name?.toUpperCase().includes(selectedResource);

      const matchesAction =
        selectedStatus === "all" || log.action === selectedStatus;

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

      return matchesSearch && matchesResource && matchesAction && matchesDate;
    })
  );

  function getResourceIcon(resource: string) {
    switch (resource) {
      case "AUTH":
        return Shield;
      case "USER":
        return User;
      case "TRIP":
        return FileText;
      case "DATABASE":
        return Database;
      case "SYSTEM":
        return Settings;
      default:
        return FileText;
    }
  }

  function getStatusColor(status: string) {
    return status === "SUCCESS"
      ? "bg-green-100 text-green-800"
      : "bg-red-100 text-red-800";
  }

  function viewDetails(log: any) {
    selectedLog = log;
    showDetailsModal = true;
  }

  function exportLogs() {
    // Simulate export
    console.log("Exporting audit logs...");
  }

  function closeModal() {
    showDetailsModal = false;
    selectedLog = null;
  }
</script>

<RoleGuard requiredRoles={["Admin"]}>
  <div class="min-h-screen bg-gray-50">
    <Breadcrumbs />

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Audit Logs</h1>
        <p class="text-gray-600 mt-2">
          Monitor system activity and security events.
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
              bind:value={selectedResource}
              class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Resources</option>
              <option value="AUTH">Authentication</option>
              <option value="USER">User Management</option>
              <option value="TRIP">Trip Management</option>
              <option value="DATABASE">Database</option>
              <option value="SYSTEM">System</option>
            </select>
            <select
              bind:value={selectedStatus}
              class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILED">Failed</option>
            </select>
            <select
              bind:value={selectedDateRange}
              class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
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
        class="relative top-20 mx-auto p-5 border w-2xl shadow-lg rounded-md bg-white"
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
                  >Log ID</label
                >
                <p class="mt-1 text-sm text-gray-900">#{selectedLog.id}</p>
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
                <label class="block text-sm font-medium text-gray-700"
                  >User</label
                >
                <p class="mt-1 text-sm text-gray-900">{selectedLog.user}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700"
                  >IP Address</label
                >
                <p class="mt-1 text-sm text-gray-900">
                  {selectedLog.ipAddress}
                </p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700"
                  >Action</label
                >
                <p class="mt-1 text-sm text-gray-900">{selectedLog.action}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700"
                  >Resource</label
                >
                <p class="mt-1 text-sm text-gray-900">{selectedLog.resource}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700"
                  >Status</label
                >
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getStatusColor(
                    selectedLog.status
                  )}"
                >
                  {selectedLog.status}
                </span>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700"
                >Details</label
              >
              <p class="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                {selectedLog.details}
              </p>
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
</RoleGuard>
