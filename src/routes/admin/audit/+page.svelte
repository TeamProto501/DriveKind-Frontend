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
    clients?: any[];
    staff?: any[];
  }

  let { data }: { data: PageData } = $props();

  const orgId = $derived(data?.profile?.org_id ?? null);

  // ==== LOGS (ORG-ISOLATED) ======================================
  let rawItems = $derived(
    Array.isArray(data?.data?.data)
      ? data.data.data
      : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
          ? data
          : []
  );

  let items = $derived(
    Array.isArray(rawItems)
      ? rawItems.filter((log: any) => {
          if (orgId == null) return true;
          const logOrg =
            log.org_id ??
            log.organization_id ??
            log.orgid ??
            null;
          if (logOrg == null) return true;
          return logOrg === orgId;
        })
      : []
  );

  // ==== CLIENTS (FOR CALLER DROPDOWN) ============================
  let clients = $derived(
    Array.isArray((data as any)?.clients) ? (data as any).clients : []
  );

  let visibleClients = $derived(
    Array.isArray(clients)
      ? clients.filter((c: any) => {
          if (orgId == null) return true;
          const cOrg = c.org_id ?? c.organization_id ?? null;
          if (cOrg == null) return true;
          return cOrg === orgId;
        })
      : []
  );

// ==== STAFF (FOR STAFF DROPDOWN) ===============================
let staff = $derived(
  Array.isArray((data as any)?.staff) ? (data as any).staff : []
);

// Convert role enums into usable string array
function normalizeRoles(r: any): string[] {
  if (!r) return [];

  if (Array.isArray(r)) return r.map((x) => String(x).toLowerCase());

  if (typeof r === "string") {
    try {
      const parsed = JSON.parse(r);
      if (Array.isArray(parsed)) return parsed.map((x) => String(x).toLowerCase());
    } catch {
      return r.split(",").map((x) => x.trim().toLowerCase());
    }
  }

  return [];
}

const ALLOWED = ["dispatcher", "admin", "super admin"];

function hasAllowedRole(roles: any) {
  const normalized = normalizeRoles(roles);
  return normalized.some((r) => ALLOWED.includes(r));
}

let visibleStaff = $derived(
  Array.isArray(staff)
    ? staff.filter((s: any) => {
        // ORG ISOLATION
        if (orgId != null) {
          const sOrg = s.org_id ?? s.organization_id ?? null;
          if (sOrg != null && sOrg !== orgId) return false;
        }

        // ROLE CHECK
        const roles = s.role ?? s.roles ?? [];
        return hasAllowedRole(roles);
      })
    : []
);

  const currentStaffName = $derived(
    data?.profile
      ? `${data.profile.first_name ?? ""} ${data.profile.last_name ?? ""}`.trim()
      : ""
  );

  // ==== TABS / FILTERS ===========================================
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

  // ==== CALL EDIT / CREATE STATE =================================
  type CallForm = {
    id?: string | number | null;
    caller_name: string;
    phone_number: string;
    call_type: string;
    call_time: string;
    staff_name: string;
    forwarded_to_name: string;
    notes: string;
  };

  let showCallModal = $state(false);
  let isEditingCall = $state(false);
  let callStep = $state(1);
  let callSaving = $state(false);
  let callError = $state("");

  let callForm = $state<CallForm>({
    id: null,
    caller_name: "",
    phone_number: "",
    call_type: "",
    call_time: "",
    staff_name: "",
    forwarded_to_name: "",
    notes: "",
  });

  // Caller: manual vs client
  let callerMode = $state<"manual" | "client">("manual");
  let selectedClientId = $state<string>("");

  // Staff: “I took this call” toggle
  let staffIsCurrentUser = $state(true);

  // Keep staff_name synced when box checked
  $effect(() => {
    if (staffIsCurrentUser) {
      callForm.staff_name = currentStaffName || "";
    }
  });

  const callTypeOptions = ["Ride Request", "Hasnt heard from driver"];

  function resetCallForm() {
    callForm = {
      id: null,
      caller_name: "",
      phone_number: "",
      call_type: "",
      call_time: "",
      staff_name: "",
      forwarded_to_name: "",
      notes: "",
    };
    callerMode = "manual";
    selectedClientId = "";
    staffIsCurrentUser = true;
    callStep = 1;
    callError = "";
    isEditingCall = false;
  }

  function openCreateCall() {
    resetCallForm();
    showCallModal = true;
  }

  function openEditCall(event: CustomEvent<any>) {
    const log = event.detail;
    const id = log.id ?? log.call_id ?? null;

    callForm = {
      id,
      caller_name: log.caller_name ?? "",
      phone_number: log.phone_number ?? "",
      call_type: log.call_type ?? "",
      call_time: log.call_time
        ? new Date(log.call_time).toISOString().slice(0, 16)
        : "",
      staff_name: log.staff_name ?? "",
      forwarded_to_name: log.forwarded_to_name ?? "",
      notes: log.notes ?? "",
    };

    callerMode = "manual";
    selectedClientId = "";

    // If the existing staff matches the current user, default checkbox to checked
    if (currentStaffName) {
      staffIsCurrentUser =
        (callForm.staff_name ?? "").toLowerCase() ===
        currentStaffName.toLowerCase();
    } else {
      staffIsCurrentUser = false;
    }

    callStep = 1;
    callError = "";
    isEditingCall = true;
    showCallModal = true;
  }

  function closeCallModal() {
    showCallModal = false;
    callSaving = false;
    callError = "";
  }

  function handleClientSelect(event: Event) {
    const select = event.currentTarget as HTMLSelectElement;
    const value = select.value;
    selectedClientId = value;

    const client = visibleClients.find(
      (c: any) => String(c.client_id ?? c.id) === value
    );

    if (client) {
      const first = client.first_name ?? "";
      const last = client.last_name ?? "";
      callForm.caller_name = `${first} ${last}`.trim();

      if (!callForm.phone_number) {
        callForm.phone_number = client.primary_phone ?? "";
      }
    }
  }

  function validateCallStep(step: number): string[] {
    const errs: string[] = [];
    if (step === 1) {
      if (!callForm.caller_name.trim())
        errs.push("Caller name is required.");
      if (!callForm.phone_number.trim())
        errs.push("Phone number is required.");
      if (!callForm.call_type.trim())
        errs.push("Call type is required.");
      if (!callForm.call_time)
        errs.push("Call time is required.");
    }
    return errs;
  }

  function goToCallStep(target: number) {
    if (target <= callStep) {
      callStep = Math.max(1, Math.min(3, target));
      callError = "";
      return;
    }
    const errs = validateCallStep(callStep);
    if (errs.length) {
      callError = errs.join(" ");
      return;
    }
    callError = "";
    callStep = Math.max(1, Math.min(3, target));
  }

  async function submitCall() {
    const errs = [
      ...validateCallStep(1),
      ...validateCallStep(2),
      ...validateCallStep(3),
    ];
    if (errs.length) {
      callError = errs.join(" ");
      return;
    }

    callSaving = true;
    callError = "";

    try {
      const formData = new FormData();
      if (callForm.id !== null && callForm.id !== undefined) {
        formData.append("id", String(callForm.id));
      }
      formData.append("caller_name", callForm.caller_name);
      formData.append("phone_number", callForm.phone_number);
      formData.append("call_type", callForm.call_type);
      formData.append("call_time", callForm.call_time);
      formData.append("staff_name", callForm.staff_name);
      formData.append("forwarded_to_name", callForm.forwarded_to_name);
      formData.append("notes", callForm.notes);

      // 🔹 NEW: pass client_id when caller came from the client dropdown
      if (callerMode === "client" && selectedClientId) {
        formData.append("client_id", selectedClientId);
      }

      const res = await fetch("?/saveCall", {
        method: "POST",
        body: formData,
      });

      const result = await res.json().catch(() => null);

      if (!res.ok || !result?.success) {
        throw new Error(result?.error || "Failed to save call entry.");
      }

      closeCallModal();
      await goto("?tab=calls", {
        replaceState: true,
        noScroll: false,
        keepFocus: true,
        invalidateAll: true,
      });
    } catch (err: any) {
      callError = err?.message || "Failed to save call entry.";
    } finally {
      callSaving = false;
    }
  }

  // ==== FILTERED VIEW ============================================
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

  // ==== DELETE MODAL STATE =======================================
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
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
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

        <div class="flex items-center gap-3">
          {#if selectedTab === "calls"}
            <button
              type="button"
              onclick={openCreateCall}
              class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium text-sm"
            >
              <span>+ Add Call</span>
            </button>
          {/if}

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

    <!-- Audit / Call Logs Table -->
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
          isCalls={selectedTab === "calls"}
          on:editCall={openEditCall}
        />
      </div>
    </div>
  </div>

  <!-- Call Create / Edit Modal -->
  <Dialog.Root bind:open={showCallModal}>
    <Dialog.Content class="sm:max-w-lg bg-white">
      <Dialog.Header>
        <Dialog.Title>
          {isEditingCall ? "Edit Call Entry" : "Add Call Entry"}
        </Dialog.Title>
        <Dialog.Description>
          Enter call details in a few short steps. Fields marked * are required.
        </Dialog.Description>
      </Dialog.Header>

      {#if callError}
        <div class="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-base text-red-700">
          <p class="font-medium mb-2">Please fix the following errors:</p>
          <ul class="list-disc list-inside space-y-1">
            {#each callError.split(". ").filter((e) => e.trim()) as err}
              <li>{err}{err.endsWith(".") ? "" : "."}</li>
            {/each}
          </ul>
        </div>
      {/if}

      <!-- Stepper -->
      <div class="flex items-center justify-center gap-3 mb-4 select-none">
        {#each [1, 2, 3] as s}
          <div class="flex items-center gap-2">
            <button
              type="button"
              title={`Go to step ${s}`}
              onclick={() => goToCallStep(s)}
              class="w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors
                {callStep === s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}"
              aria-current={callStep === s ? "step" : undefined}
              aria-label={`Step ${s}`}
            >
              {s}
            </button>
            {#if s < 3}
              <!-- svelte-ignore element_invalid_self_closing_tag -->
              <button
                type="button"
                aria-label={`Jump toward step ${s + 1}`}
                onclick={() => goToCallStep(s + 1)}
                class="w-8 h-[2px] rounded {callStep > s ? 'bg-blue-600' : 'bg-gray-200 hover:bg-gray-300'}"
              />
            {/if}
          </div>
        {/each}
      </div>

      <!-- Step Content -->
      {#if callStep === 1}
        <div class="space-y-3">
          <div>
            <Label class="block text-base font-medium">Caller Name *</Label>

            <div class="mt-1 mb-2 flex gap-4 text-sm">
              <label class="flex items-center gap-2">
                <input
                  type="radio"
                  name="callerMode"
                  value="manual"
                  checked={callerMode === "manual"}
                  onchange={() => (callerMode = "manual")}
                />
                <span>Type name</span>
              </label>
              <label class="flex items-center gap-2">
                <input
                  type="radio"
                  name="callerMode"
                  value="client"
                  checked={callerMode === "client"}
                  onchange={() => (callerMode = "client")}
                />
                <span>Select client</span>
              </label>
            </div>

            {#if callerMode === "manual"}
              <Input
                class="mt-1 w-full text-base"
                bind:value={callForm.caller_name}
                placeholder="Caller name"
              />
            {:else}
              <select
                class="mt-1 w-full border rounded px-3 py-2 text-base"
                bind:value={selectedClientId}
                onchange={handleClientSelect}
              >
                <option value="">Select client...</option>
                {#each visibleClients as c}
                  <option value={String(c.client_id ?? c.id)}>
                    {c.first_name} {c.last_name}
                    {#if c.primary_phone}
                      ({c.primary_phone})
                    {/if}
                  </option>
                {/each}
              </select>
            {/if}
          </div>

          <div>
            <Label class="block text-base font-medium">Phone Number *</Label>
            <Input
              class="mt-1 w-full text-base"
              bind:value={callForm.phone_number}
              placeholder="e.g., 555-123-4567"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <Label class="block text-base font-medium">Call Type *</Label>
              <select
                class="mt-1 w-full border rounded px-3 py-2 text-base"
                bind:value={callForm.call_type}
              >
                <option value="">Select...</option>
                {#each callTypeOptions as ct}
                  <option value={ct}>{ct}</option>
                {/each}
              </select>
            </div>
            <div>
              <Label class="block text-base font-medium">Call Time *</Label>
              <Input
                type="datetime-local"
                class="mt-1 w-full text-base"
                bind:value={callForm.call_time}
              />
            </div>
          </div>
        </div>
      {:else if callStep === 2}
        <div class="space-y-3">
          <div>
            <Label class="block text-base font-medium">Staff Taking Call</Label>

            <div class="mt-1 mb-2 flex items-center gap-2 text-sm">
              <input
                id="staffIsCurrentUser"
                type="checkbox"
                bind:checked={staffIsCurrentUser}
              />
              <label for="staffIsCurrentUser" class="cursor-pointer">
                I took this call
              </label>
            </div>

            {#if staffIsCurrentUser}
              <Input
                class="mt-1 w-full text-base bg-gray-100"
                value={currentStaffName}
                disabled
              />
            {:else}
              <select
                class="mt-1 w-full border rounded px-3 py-2 text-base"
                bind:value={callForm.staff_name}
              >
                <option value="">Select staff...</option>
                {#each visibleStaff as s}
                  <option
                    value={`${(s.first_name ?? "")} ${(s.last_name ?? "")}`.trim()}
                  >
                    {s.first_name} {s.last_name}
                  </option>
                {/each}
              </select>
            {/if}
          </div>

          <div>
            <Label class="block text-base font-medium">Forwarded To</Label>
            <Input
              class="mt-1 w-full text-base"
              bind:value={callForm.forwarded_to_name}
              placeholder="Person/department this call was forwarded to"
            />
          </div>
        </div>
      {:else if callStep === 3}
        <div class="space-y-3">
          <div>
            <Label class="block text-base font-medium">Notes</Label>
            <!-- svelte-ignore element_invalid_self_closing_tag -->
            <textarea
              rows={4}
              class="mt-1 w-full text-base border rounded px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              placeholder="Additional details about the call (optional)"
              value={callForm.notes}
              oninput={(event) =>
                (callForm.notes = (event.currentTarget as HTMLTextAreaElement).value)
              }
            />
          </div>
        </div>
      {/if}

      <Dialog.Footer class="mt-6 flex items-center justify-between">
        <div>
          {#if callStep > 1}
            <Button
              type="button"
              variant="outline"
              onclick={() => {
                callStep = Math.max(1, callStep - 1);
                callError = "";
              }}
            >
              Back
            </Button>
          {/if}
        </div>
        <div class="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onclick={closeCallModal}
            disabled={callSaving}
          >
            Cancel
          </Button>

          {#if callStep < 3}
            <Button
              type="button"
              onclick={() => goToCallStep(callStep + 1)}
            >
              Next
            </Button>
          {:else}
            <Button
              type="button"
              onclick={submitCall}
              disabled={callSaving}
              class="bg-blue-600 text-white disabled:opacity-50"
            >
              {callSaving
                ? (isEditingCall ? "Saving..." : "Creating...")
                : (isEditingCall ? "Save Changes" : "Create Call")}
            </Button>
          {/if}
        </div>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>

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