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
    BookText,
  } from "@lucide/svelte";

  // Mock audit log data
  const auditLogs = [
    {
      id: 1,
      timestamp: "2024-01-15 14:30:22",
      user: "admin@drivekind.com",
      action: "LOGIN",
      resource: "AUTH",
      details: "User logged in successfully",
      ipAddress: "192.168.1.100",
      status: "SUCCESS",
    },
    {
      id: 2,
      timestamp: "2024-01-15 14:25:15",
      user: "admin@drivekind.com",
      action: "UPDATE",
      resource: "USER",
      details: "Updated user profile: john.doe@drivekind.com",
      ipAddress: "192.168.1.100",
      status: "SUCCESS",
    },
    {
      id: 3,
      timestamp: "2024-01-15 14:20:08",
      user: "dispatcher@drivekind.com",
      action: "CREATE",
      resource: "TRIP",
      details: "Created new trip request #TR-2024-001",
      ipAddress: "192.168.1.101",
      status: "SUCCESS",
    },
    {
      id: 4,
      timestamp: "2024-01-15 14:15:42",
      user: "driver@drivekind.com",
      action: "UPDATE",
      resource: "TRIP",
      details: "Updated trip status to IN_PROGRESS",
      ipAddress: "192.168.1.102",
      status: "SUCCESS",
    },
    {
      id: 5,
      timestamp: "2024-01-15 14:10:30",
      user: "unknown",
      action: "LOGIN",
      resource: "AUTH",
      details: "Failed login attempt for invalid user",
      ipAddress: "192.168.1.103",
      status: "FAILED",
    },
  ];

  let searchQuery = $state("");
  let selectedResource = $state("all");
  let selectedStatus = $state("all");
  let selectedDateRange = $state("24h");
  let showDetailsModal = $state(false);
  let selectedLog = $state(null);

  let filteredLogs = $derived(
    auditLogs.filter((log) => {
      const matchesSearch =
        !searchQuery ||
        log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.details.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesResource =
        selectedResource === "all" || log.resource === selectedResource;
      const matchesStatus =
        selectedStatus === "all" || log.status === selectedStatus;

      return matchesSearch && matchesResource && matchesStatus;
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
              >{filteredLogs.length} entries</span
            >
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Timestamp
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  User
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Action
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Resource
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Details
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {#each filteredLogs as log}
                <tr class="hover:bg-gray-50">
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div class="flex items-center">
                      <Calendar class="w-4 h-4 text-gray-400 mr-2" />
                      {log.timestamp}
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.user}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span
                      class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {log.action}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div class="flex items-center">
                      <BookText class="w-4 h-4 text-gray-600 mr-2" />
                      {log.resource}
                    </div>
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {log.details}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span
                      class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getStatusColor(
                        log.status
                      )}"
                    >
                      {log.status}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onclick={() => viewDetails(log)}
                      class="text-blue-600 hover:text-blue-900 transition-colors"
                    >
                      <Eye class="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
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
