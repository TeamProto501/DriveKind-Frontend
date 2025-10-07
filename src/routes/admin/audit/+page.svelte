<!-- src/routes/admin/audit/+page.svelte -->
<script lang="ts">
  import RoleGuard from "$lib/components/RoleGuard.svelte";
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte";
  import { Search, Download } from "@lucide/svelte";
  import Table from "./table.svelte";

  let { data } = $props();

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

  function exportLogs() {
    console.log("Exporting audit logs...");
  }
</script>

<RoleGuard requiredRoles={["Admin"]}>
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
</RoleGuard>
