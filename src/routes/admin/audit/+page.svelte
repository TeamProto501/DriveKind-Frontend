<!-- src/routes/admin/audit/+page.svelte -->
<script lang="ts">
  import RoleGuard from "$lib/components/RoleGuard.svelte";
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte";
  import { Search, Download } from "@lucide/svelte";
  import Table from "./table.svelte";
  import { navigating } from "$app/stores";
  import { goto } from "$app/navigation";

  interface PageData {
    session: { user: any };
    profile: any;
    roles: string[];
    data: any;
    tab?: string;
  }
  let { data }: { data: PageData } = $props();

  let items = $derived(
    Array.isArray(data?.data?.data)
      ? data.data.data
      : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
          ? data
          : []
  );
  const tabs = [
    {
      id: "audits",
      label: "Audits",
      description: "View Audit Logs",
    },
    {
      id: "calls",
      label: "Calls",
      description: "View Call Logs",
    },
  ];
  let selectedTab = $state(data?.tab ?? "audits");
  let isNavigating = $derived($navigating);
  function selectTab(tabId: string) {
    if (selectedTab !== tabId) {
      goto(`?tab=${tabId}`, {
        replaceState: false,
        noScroll: true,
        keepFocus: true,
      });
    }
  }
  $effect(() => {
    selectedTab = data?.tab ?? "audits";
  });
  let searchQuery = $state("");
  let selectedTable = $state("all");
  let selectedAction = $state("all");
  let selectedDateRange = $state("all");
  let selectedCallType = $state("all");
  let filteredData = $derived(
    items.filter((log) => {
      if (selectedTab === "audits") {
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
        }

        return matchesSearch && matchesTable && matchesAction && matchesDate;
      }

      if (selectedTab === "calls") {
        const matchesSearch =
          !searchQuery ||
          log.staff_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.caller_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.phone_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.forwarded_to_name
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase());

        const matchesCallType =
          selectedCallType === "all" || log.call_type === selectedCallType;

        if (selectedDateRange === "all")
          return matchesSearch && matchesCallType;

        const logDate = new Date(log.call_time);
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
        }

        return matchesSearch && matchesCallType && matchesDate;
      }

      return true;
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
      <div class="flex items-center justify-between px-6 py-4">
        <nav class="flex space-x-8">
          {#each tabs as t}
            <button
              type="button"
              on:click={() => selectTab(t.id)}
              class="flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 {selectedTab ===
              t.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
            >
              <span>{t.label}</span>
            </button>
          {/each}
        </nav>
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
                placeholder={selectedTab === "audits"
                  ? "Search logs..."
                  : "Search by staff, caller, phone..."}
                class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div class="flex gap-2">
            {#if selectedTab === "audits"}
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
            {:else if selectedTab === "calls"}
              <select
                bind:value={selectedCallType}
                class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Call Types</option>
                <option value="Ride Request">Ride Request</option>
                <option value="Hasnt heard from driver"
                  >Hasn't Heard from Driver</option
                >
              </select>
            {/if}
            <select
              bind:value={selectedDateRange}
              class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Time</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
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
