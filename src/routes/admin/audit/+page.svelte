<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import { PhoneCall, FileText, X } from "@lucide/svelte";
  import Table from "./table.svelte";

  export let data: PageData;
  export let form: ActionData | null = null;

  // Make tab reactive instead of a const
  let activeTab: "audits" | "calls" = "audits";
  $: activeTab = ((data.tab as "audits" | "calls") ?? "audits");

  // Header text reacts to the tab
  $: headerTitle =
    activeTab === "audits" ? "Audit Logs" : "Call Log";

  $: headerDescription =
    activeTab === "audits"
      ? "View activity logs captured by the audit logger."
      : "View and edit logged calls. org_id is hidden; user_id, call_type, and client_id are read-only.";

  // ----- Audits tab state -----
  let search = "";

  // If previewByRange returned data, use that; otherwise use the loaded rows
  $: previewRows =
    form && "data" in form && form?.data ? (form as any).data : null;

  $: auditRowsRaw = activeTab === "audits" ? (data.data ?? []) : [];
  $: auditRowsBase = previewRows ?? auditRowsRaw;

  $: filteredAuditRows =
    search.trim().length === 0
      ? auditRowsBase
      : auditRowsBase.filter((row: any) =>
          Object.values(row ?? {})
            .join(" ")
            .toLowerCase()
            .includes(search.toLowerCase())
        );

  // ----- Calls tab state -----
  $: callRows = activeTab === "calls" ? (data.data ?? []) : [];

  type CallRow = {
    call_id: number;
    user_id: string;
    client_id: number | null;
    call_type: string | null;
    call_time: string | null;
    other_type: string | null;
    phone_number: string | null;
    forwarded_to_name: string | null;
    caller_first_name: string | null;
    caller_last_name: string | null;
  };

  let showEditModal = false;
  let editRow: CallRow | null = null;

  function openEdit(row: any) {
    editRow = row;
    showEditModal = true;
  }

  function closeEdit() {
    showEditModal = false;
    editRow = null;
  }

  function toLocalInputValue(isoOrSql: string | null): string {
    if (!isoOrSql) return "";
    // Accept "YYYY-MM-DD HH:MM:SS" or ISO 8601
    const normalized = isoOrSql.replace(" ", "T");
    const d = new Date(normalized);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  }

  $: editCallTimeLocal = editRow
    ? toLocalInputValue(editRow.call_time)
    : "";
</script>

<section class="space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <div class="flex items-center gap-2">
        {#if activeTab === "audits"}
          <FileText class="w-6 h-6 text-blue-600" />
        {:else}
          <PhoneCall class="w-6 h-6 text-blue-600" />
        {/if}
        <h1 class="text-2xl font-semibold">{headerTitle}</h1>
      </div>
      <p class="mt-1 text-sm text-gray-600">
        {headerDescription}
      </p>
    </div>
  </div>

  <!-- Tabs -->
  <div class="border-b border-gray-200">
    <nav class="-mb-px flex space-x-6 text-sm">
      <a
        href="?tab=audits"
        class="inline-flex items-center border-b-2 px-1 pb-2 font-medium
        {activeTab === 'audits'
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
      >
        <FileText class="w-4 h-4 mr-1.5" />
        Audits
      </a>
      <a
        href="?tab=calls"
        class="inline-flex items-center border-b-2 px-1 pb-2 font-medium
        {activeTab === 'calls'
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
      >
        <PhoneCall class="w-4 h-4 mr-1.5" />
        Calls
      </a>
    </nav>
  </div>

  {#if activeTab === "audits"}
    <!-- AUDITS TAB -->
    <div class="space-y-4">
      <!-- Range form + delete / preview -->
      <form
        method="POST"
        class="flex flex-wrap items-end gap-4 rounded-md border border-gray-200 bg-white p-4"
      >
        <div>
          <label
            for="startTime"
            class="block text-xs font-medium text-gray-600"
            >Start Time</label
          >
          <input
            id="startTime"
            name="startTime"
            type="datetime-local"
            required
            class="mt-1 block w-56 rounded-md border border-gray-300 px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label
            for="endTime"
            class="block text-xs font-medium text-gray-600"
            >End Time</label
          >
          <input
            id="endTime"
            name="endTime"
            type="datetime-local"
            required
            class="mt-1 block w-56 rounded-md border border-gray-300 px-2 py-1 text-sm"
          />
        </div>

        <div class="ml-auto flex gap-2">
          <button
            type="submit"
            formaction="?/previewByRange"
            class="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Preview Logs
          </button>
          <button
            type="submit"
            formaction="?/deleteByRange"
            class="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700"
          >
            Delete Logs
          </button>
        </div>
      </form>

      <!-- Search bar -->
      <div class="flex justify-between items-center">
        <div class="relative w-full max-w-md">
          <input
            type="text"
            placeholder="Search logs..."
            bind:value={search}
            class="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <h2 class="mb-2 text-base font-semibold text-gray-900">
          Activity Logs
        </h2>
        <Table data={filteredAuditRows} />
      </div>
    </div>
  {:else}
    <!-- CALLS TAB -->
    <div class="space-y-4">
      <div class="flex justify-between items-center">
        <h2 class="text-base font-semibold text-gray-900">Calls</h2>
      </div>

      <Table data={callRows} enableEdit={true} onEdit={openEdit} />
    </div>
  {/if}

  <!-- EDIT CALL MODAL -->
  {#if showEditModal && editRow}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div class="w-full max-w-xl rounded-lg bg-white p-6 shadow-lg">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-lg font-semibold">
            Edit Call #{editRow.call_id}
          </h3>
          <button
            type="button"
            class="text-gray-400 hover:text-gray-600"
            on:click={closeEdit}
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <form method="POST" action="?/updateCall" class="space-y-4">
          <input type="hidden" name="call_id" value={editRow.call_id} />

          <!-- Read-only fields -->
          <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label class="block text-xs font-medium text-gray-600"
                >User ID</label
              >
              <input
                class="mt-1 block w-full rounded-md border border-gray-200 bg-gray-100 px-2 py-1 text-xs"
                name="user_id"
                value={editRow.user_id}
                readonly
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600"
                >Call Type</label
              >
              <input
                class="mt-1 block w-full rounded-md border border-gray-200 bg-gray-100 px-2 py-1 text-xs"
                name="call_type"
                value={editRow.call_type ?? ""}
                readonly
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600"
                >Client ID</label
              >
              <input
                class="mt-1 block w-full rounded-md border border-gray-200 bg-gray-100 px-2 py-1 text-xs"
                name="client_id"
                value={editRow.client_id ?? ""}
                readonly
              />
            </div>
          </div>

          <!-- Editable fields -->
          <div class="space-y-3">
            <div>
              <label class="block text-xs font-medium text-gray-700"
                >Call Time</label
              >
              <input
                type="datetime-local"
                name="call_time"
                bind:value={editCallTimeLocal}
                class="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-700"
                >Other Type</label
              >
              <input
                type="text"
                name="other_type"
                bind:value={editRow.other_type}
                class="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
              />
            </div>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label class="block text-xs font-medium text-gray-700"
                  >Phone Number</label
                >
                <input
                  type="text"
                  name="phone_number"
                  bind:value={editRow.phone_number}
                  class="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700"
                  >Forwarded To (Name)</label
                >
                <input
                  type="text"
                  name="forwarded_to_name"
                  bind:value={editRow.forwarded_to_name}
                  class="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label class="block text-xs font-medium text-gray-700"
                  >Caller First Name</label
                >
                <input
                  type="text"
                  name="caller_first_name"
                  bind:value={editRow.caller_first_name}
                  class="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700"
                  >Caller Last Name</label
                >
                <input
                  type="text"
                  name="caller_last_name"
                  bind:value={editRow.caller_last_name}
                  class="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                />
              </div>
            </div>
          </div>

          <div class="mt-5 flex justify-end gap-3">
            <button
              type="button"
              class="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              on:click={closeEdit}
            >
              Cancel
            </button>
            <button
              type="submit"
              class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}
</section>
