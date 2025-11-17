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

  // ======= DELETE LOGS STATE =======
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

    const headers = Array.from(
      new Set(previewData.flatMap((item) => Object.keys(item)))
    );

    const csvRows = [];
    csvRows.push(headers.join(","));

    for (const row of previewData) {
      const values = headers.map((header) => {
        const value = row[header];
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

  // ======= EDIT CALL STATE =======
  let showEditCallModal = $state(false);
  let editCall: any = $state(null);
  let isSavingCall = $state(false);
  let editError = $state("");

  function openEditCallModal(row: any) {
    if (selectedTab !== "calls") return;

    const copy: any = { ...row };

    // Convert call_time to datetime-local for the input
    if (copy.call_time) {
      const dt = new Date(copy.call_time);
      if (!isNaN(dt.getTime())) {
        copy.call_time_local = dt.toISOString().slice(0, 16);
      } else {
        copy.call_time_local = "";
      }
    } else {
      copy.call_time_local = "";
    }

    editCall = copy;
    editError = "";
    showEditCallModal = true;
  }

  function closeEditCallModal() {
    showEditCallModal = false;
    editCall = null;
    editError = "";
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
              <option value="Cancelled Ride">Cancelled Ride</option>
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

    <!-- Activity Logs Table -->
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
        <Table
          data={filteredData}
          onEdit={selectedTab === "calls" ? openEditCallModal : null}
        />
      </div>
    </div>
  </div>

  <!-- ======= EDIT CALL MODAL ======= -->
  <Dialog.Root bind:open={showEditCallModal}>
    <Dialog.Content class="sm:max-w-lg bg-white">
      <Dialog.Header>
        <Dialog.Title>Edit Call</Dialog.Title>
        <Dialog.Description>
          Update the details for this call log entry.
        </Dialog.Description>
      </Dialog.Header>

      {#if editCall}
        <form
          method="POST"
          action="?/updateCall"
          use:enhance={() => {
            isSavingCall = true;
            editError = "";

            return async ({ result, update }) => {
              isSavingCall = false;

              if (result.type === "success") {
                closeEditCallModal();
                // Reload the page to show updated data
                goto("", { invalidateAll: true });
              } else {
                editError = "Failed to save changes.";
              }

              await update({ reset: false });
            };
          }}
          class="space-y-4"
        >
          <!-- IDs -->
          <input type="hidden" name="call_id" value={editCall.call_id} />
          {#if editCall.user_id}
            <input type="hidden" name="user_id" value={editCall.user_id} />
          {/if}
          {#if editCall.org_id}
            <input type="hidden" name="org_id" value={editCall.org_id} />
          {/if}

          <div class="space-y-2">
            <Label for="call_time">Call Time</Label>
            <Input
              id="call_time"
              name="call_time"
              type="datetime-local"
              bind:value={editCall.call_time_local}
            />
          </div>

          <div class="space-y-2">
            <Label for="call_type">Call Type</Label>
            <select
              id="call_type"
              name="call_type"
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              bind:value={editCall.call_type}
            >
              <option value="">Select type...</option>
              <option value="Ride Request">Ride Request</option>
              <option value="Hasnt heard from driver">
                Hasn't Heard from Driver
              </option>
              <option value="Cancelled Ride">Cancelled Ride</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div class="space-y-2">
            <Label for="other_type">Other Type</Label>
            <Input
              id="other_type"
              name="other_type"
              type="text"
              bind:value={editCall.other_type}
            />
          </div>

          <div class="space-y-2">
            <Label for="client_id">Client ID</Label>
            <Input
              id="client_id"
              name="client_id"
              type="number"
              bind:value={editCall.client_id}
            />
          </div>

          <div class="space-y-2">
            <Label for="phone_number">Phone Number</Label>
            <Input
              id="phone_number"
              name="phone_number"
              type="text"
              bind:value={editCall.phone_number}
            />
          </div>

          <div class="space-y-2">
            <Label for="forwarded_to_name">Forwarded To</Label>
            <Input
              id="forwarded_to_name"
              name="forwarded_to_name"
              type="text"
              bind:value={editCall.forwarded_to_name}
            />
          </div>

          <div class="space-y-2">
            <Label for="caller_first_name">Caller First Name</Label>
            <Input
              id="caller_first_name"
              name="caller_first_name"
              type="text"
              bind:value={editCall.caller_first_name}
            />
          </div>

          <div class="space-y-2">
            <Label for="caller_last_name">Caller Last Name</Label>
            <Input
              id="caller_last_name"
              name="caller_last_name"
              type="text"
              bind:value={editCall.caller_last_name}
            />
          </div>

          {#if editError}
            <div class="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p class="text-sm text-red-800">{editError}</p>
            </div>
          {/if}

          <Dialog.Footer>
            <Button
              type="button"
              variant="outline"
              onclick={closeEditCallModal}
              disabled={isSavingCall}
            >
              Cancel
            </Button>
            <Button type="submit" class="flex items-center gap-2">
              {#if isSavingCall}
                <span>Saving...</span>
              {:else}
                <span>Save Changes</span>
              {/if}
            </Button>
          </Dialog.Footer>
        </form>
      {/if}
    </Dialog.Content>
  </Dialog.Root>

  <!-- ======= DELETE LOGS MODAL ======= -->
  <Dialog.Root bind:open={showDeleteModal}>
    <Dialog.Content class="sm:max-w-md bg-white">
      <Dialog.Header>
        <Dialog.Title>Delete Logs by Time Range</Dialog.Title>
        <Dialog.Description>
          Select a time range to delete logs. You can preview and backup the
          data before deletion.
        </Dialog.Description>
      </Dialog.Header>

      <!-- Hidden preview form -->
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
            class="flex items-center gap-2 bg-red-600 text-white"
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