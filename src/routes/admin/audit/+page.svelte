<!-- src/routes/admin/audit/+page.svelte -->
<script lang="ts">
  import RoleGuard from "$lib/components/RoleGuard.svelte";
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte";
  import { Search, Download, Trash2 } from "@lucide/svelte";
  import Table from "./table.svelte";
  import { navigating } from "$app/stores";
  import { goto } from "$app/navigation";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { enhance } from "$app/forms";

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
  //delete stuff
  // Delete Modal State
  let showDeleteModal = $state(false);
  let deleteStartTime = $state("");
  let deleteEndTime = $state("");
  let isDeleting = $state(false);
  let deleteError = $state("");
  let previewData = $state<any[]>([]);
  let isLoadingPreview = $state(false);
  let previewFormElement: HTMLFormElement;
  function openDeleteModal() {
    showDeleteModal = true;
    deleteError = "";
    previewData = [];
    // Set default values to last 24 hours
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    deleteEndTime = now.toISOString().slice(0, 16);
    deleteStartTime = yesterday.toISOString().slice(0, 16);
  }

  function closeDeleteModal() {
    showDeleteModal = false;
    deleteStartTime = "";
    deleteEndTime = "";
    deleteError = "";
    previewData = [];
  }

  function downloadCSV() {
    if (previewData.length === 0) {
      alert("No data to BackUp.");
      return;
    }

    // Get all unique keys from the data
    const headers = Array.from(
      new Set(previewData.flatMap((item) => Object.keys(item)))
    );

    // Create CSV content
    const csvRows = [];
    csvRows.push(headers.join(","));

    for (const row of previewData) {
      const values = headers.map((header) => {
        const value = row[header];
        // Handle values with commas, quotes, or newlines
        if (value === null || value === undefined) return "";
        const stringValue = String(value);
        if (
          stringValue.includes(",") ||
          stringValue.includes('"') ||
          stringValue.includes("\n")
        ) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
      csvRows.push(values.join(","));
    }

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const fileName =
      `logs_backup_${deleteStartTime}_to_${deleteEndTime}.csv`.replace(
        /:/g,
        "-"
      );
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  function validateAndSubmit() {
    if (!deleteStartTime || !deleteEndTime) {
      deleteError = "Insert Start Time and End Time.";
      return false;
    }

    const start = new Date(deleteStartTime);
    const end = new Date(deleteEndTime);

    if (start >= end) {
      deleteError = "Start Time must be before End Time.";
      return false;
    }

    if (
      !confirm(
        `Would You like to delete logs from ${deleteStartTime} to ${deleteEndTime}?`
      )
    ) {
      return false;
    }

    deleteError = "";
    isDeleting = true;
    return true;
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
              onclick={() => selectTab(t.id)}
              class="flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 {selectedTab ===
              t.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
            >
              <span>{t.label}</span>
            </button>
          {/each}
        </nav>
        <button
          type="button"
          onclick={openDeleteModal}
          class="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 font-medium text-sm"
        >
          <Trash2 class="w-4 h-4" />
          <span>Delete Logs</span>
        </button>
      </div>
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

  <!-- Delete Modal -->
  <Dialog.Root bind:open={showDeleteModal}>
    <Dialog.Content class="sm:max-w-md bg-white">
      <Dialog.Header>
        <Dialog.Title>Delete Logs by Time Range</Dialog.Title>
        <Dialog.Description>
          Select a time range to delete logs. You can preview and backup the
          data before deletion.
        </Dialog.Description>
      </Dialog.Header>
      <form
        bind:this={previewFormElement}
        method="POST"
        action="?/previewByRange"
        use:enhance={() => {
          if (!deleteStartTime || !deleteEndTime) {
            deleteError = "Enter Both Start and End Time.";
            isLoadingPreview = false;
            return ({ update }) => update({ reset: false });
          }

          const start = new Date(deleteStartTime);
          const end = new Date(deleteEndTime);

          if (start >= end) {
            deleteError = "Start Time must be before End Time.";
            isLoadingPreview = false;
            return ({ update }) => update({ reset: false });
          }

          isLoadingPreview = true;
          deleteError = "";

          return async ({ result, update }) => {
            isLoadingPreview = false;

            if (result.type === "success" && result.data) {
              const resultData = result.data.data;
              if (Array.isArray(resultData)) {
                previewData = resultData;
                if (previewData.length === 0) {
                  deleteError = "No data found in the selected time range.";
                }
              } else {
                deleteError = "Failed to load preview data.";
              }
            } else {
              deleteError = "Error loading preview data.";
            }

            await update({ reset: false });
          };
        }}
        style="display: none;"
      >
        <input type="hidden" name="startTime" value={deleteStartTime} />
        <input type="hidden" name="endTime" value={deleteEndTime} />
      </form>

      <!-- Delete Form -->
      <form
        method="POST"
        action="?/deleteByRange"
        use:enhance={() => {
          if (!validateAndSubmit()) {
            return ({ update }) => update({ reset: false });
          }

          return async ({ result, update }) => {
            isDeleting = false;
            if (result.type === "success") {
              closeDeleteModal();
              // Reload the page to show updated data
              goto("", { invalidateAll: true });
            } else {
              deleteError = "Failed to delete logs.";
            }
            await update({ reset: false });
          };
        }}
        class="space-y-4"
      >
        <div class="space-y-2">
          <Label for="startTime">Start Time</Label>
          <Input
            id="startTime"
            name="startTime"
            type="datetime-local"
            bind:value={deleteStartTime}
            onchange={() => {
              previewData = [];
              deleteError = "";
            }}
          />
        </div>

        <div class="space-y-2">
          <Label for="endTime">End Time</Label>
          <Input
            id="endTime"
            name="endTime"
            type="datetime-local"
            bind:value={deleteEndTime}
            onchange={() => {
              previewData = [];
              deleteError = "";
            }}
          />
        </div>

        <Button
          type="button"
          variant="outline"
          class="w-full"
          onclick={() => {
            if (previewFormElement) {
              previewFormElement.requestSubmit();
            }
          }}
          disabled={isLoadingPreview}
        >
          {isLoadingPreview ? "Loading..." : "Preview Data to Delete"}
        </Button>

        {#if previewData.length > 0}
          <div
            class="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2"
          >
            <div class="flex items-center justify-between">
              <p class="text-sm font-medium text-blue-900">
                {previewData.length} records will be deleted
              </p>
              <Button
                type="button"
                size="sm"
                variant="default"
                onclick={downloadCSV}
                class="flex items-center gap-1"
              >
                <Download class="w-4 h-4" />
                Download CSV
              </Button>
            </div>
            <p class="text-xs text-blue-700">
              Please download the CSV backup before deleting.
            </p>
          </div>
        {/if}

        {#if deleteError}
          <div class="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-sm text-red-800">{deleteError}</p>
          </div>
        {/if}

        <div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p class="text-sm text-yellow-800">
            ⚠️ Warning: This action cannot be undone. All logs within the
            specified time range will be permanently deleted.
          </p>
        </div>

        <Dialog.Footer>
          <Button
            type="button"
            variant="outline"
            onclick={closeDeleteModal}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="destructive"
            disabled={isDeleting}
            class="flex items-center gap-2"
          >
            {#if isDeleting}
              <span>Deleting...</span>
            {:else}
              <Trash2 class="w-4 h-4" />
              <span>Delete Logs</span>
            {/if}
          </Button>
        </Dialog.Footer>
      </form>
    </Dialog.Content>
  </Dialog.Root>
</RoleGuard>
