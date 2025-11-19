<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import { PhoneCall, FileText, X } from "@lucide/svelte";
  import Table from "./table.svelte";

  export let data: PageData;
  export let form: ActionData | null = null;

  // -----------------------------
  // TAB / HEADER STATE
  // -----------------------------
  let activeTab: "audits" | "calls" = "audits";
  $: activeTab = ((data.tab as "audits" | "calls") ?? "audits");

  $: headerTitle = activeTab === "audits" ? "Audit Logs" : "Call Log";

  $: headerDescription =
    activeTab === "audits"
      ? "View activity logs captured by the audit logger."
      : "View and edit logged calls. Dispatcher and Client are resolved from their respective tables.";

  // -----------------------------
  // AUDITS TAB STATE
  // -----------------------------
  let search = "";

  $: previewRows =
    form && "data" in form && (form as any).data ? (form as any).data : null;

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

  // -----------------------------
  // CALLS TAB DATA SHAPING
  // -----------------------------

  type StaffProfile = {
    user_id: string;
    first_name: string | null;
    last_name: string | null;
    org_id: number | null;
  };

  type ClientRow = {
    client_id: number;
    first_name: string | null;
    last_name: string | null;
    primary_phone?: string | null;
    org_id: number | null;
  };

  type CallRowFromServer = {
    call_id: number;
    user_id: string | null;
    client_id: number | null;
    org_id: number | null;
    call_type: string | null;
    call_time: string | null; // "YYYY-MM-DD HH:MM:SS"
    other_type: string | null;
    phone_number: string | null;
    forwarded_to_name: string | null;
    caller_first_name: string | null;
    caller_last_name: string | null;
  };

  type DisplayCallRow = {
    // Visible columns
    call_id: number;
    dispatcher: string;
    client: string;
    caller_name: string;
    call_time: string | null;      // formatted for display
    phone_number: string | null;
    call_type: string | null;
    other_type: string | null;
    forwarded_to_name: string | null;

    // Hidden fields for editing / saving
    call_time_raw: string | null;  // original DB format
    user_id: string | null;
    client_id: number | null;
    org_id: number | null;
    caller_first_name: string | null;
    caller_last_name: string | null;
  };

  const CALL_TYPE_OPTIONS = [
    "Ride Request",
    "Cancelled Ride",
    "Hasnt heard from driver",
    "Prospective Volunteer",
    "Other",
  ];

  const staffProfiles = ((data as any).staffProfiles ?? []) as StaffProfile[];
  const clients = ((data as any).clients ?? []) as ClientRow[];

  // Already org-scoped on the server
  const filteredStaff = staffProfiles;
  const filteredClients = clients;

  // Maps for quick lookup by id
  const staffById = new Map<string, StaffProfile>();
  for (const sp of filteredStaff) {
    if (sp.user_id) staffById.set(sp.user_id, sp);
  }

  const clientById = new Map<number, ClientRow>();
  for (const c of filteredClients) {
    if (c.client_id != null) clientById.set(c.client_id, c);
  }

  // Options for dropdowns
  const dispatcherOptions = filteredStaff.map((sp) => {
    const name = `${sp.first_name ?? ""} ${sp.last_name ?? ""}`.trim();
    return {
      value: sp.user_id,
      label: name || sp.user_id,
    };
  });

  const clientOptions = filteredClients.map((c) => {
    const name = `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim();
    return {
      value: String(c.client_id),
      label: name || `Client #${c.client_id}`,
    };
  });

  // Helpers for time formatting
  function formatCallTime(dt: string | null): string | null {
    if (!dt) return null;
    const isoish = dt.replace(" ", "T");
    const d = new Date(isoish);
    if (Number.isNaN(d.getTime())) return dt;
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function toMillis(dt: string | null): number {
    if (!dt) return 0;
    const isoish = dt.replace(" ", "T");
    const t = Date.parse(isoish);
    return Number.isNaN(t) ? 0 : t;
  }

  function getNowLocal(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  }

  const nowLocal = getNowLocal();

  // Raw rows from server (calls), only when calls tab
  $: rawCallRows =
    activeTab === "calls" ? ((data.data as CallRowFromServer[]) ?? []) : [];

  // Sort by call_time descending
  $: sortedCallRows = [...rawCallRows].sort(
    (a, b) => toMillis(b.call_time) - toMillis(a.call_time)
  );

  // Build display rows:
  // - Dispatcher name from staff_profiles
  // - Client name from clients
  // - Caller name: prefer client name if client is selected
  let displayCallRows: DisplayCallRow[] = [];

  $: displayCallRows = sortedCallRows.map((row) => {
    const dispatcher = row.user_id ? staffById.get(row.user_id) : undefined;
    const dispatcherName = dispatcher
      ? `${dispatcher.first_name ?? ""} ${dispatcher.last_name ?? ""}`.trim()
      : row.user_id ?? "";

    const client =
      row.client_id != null ? clientById.get(row.client_id) : undefined;
    const clientName = client
      ? `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim()
      : row.client_id != null
      ? String(row.client_id)
      : "";

    const manualCallerName = `${row.caller_first_name ?? ""} ${
      row.caller_last_name ?? ""
    }`.trim();

    // If a client is selected, that name takes precedence over the manual one
    const callerName = clientName || manualCallerName;

    return {
      call_id: row.call_id,
      dispatcher: dispatcherName,
      client: clientName,
      caller_name: callerName,
      call_time: formatCallTime(row.call_time),
      phone_number: row.phone_number,
      call_type: row.call_type,
      other_type: row.other_type,
      forwarded_to_name: row.forwarded_to_name,

      call_time_raw: row.call_time,
      user_id: row.user_id,
      client_id: row.client_id,
      org_id: row.org_id,
      caller_first_name: row.caller_first_name,
      caller_last_name: row.caller_last_name,
    };
  });

  // -----------------------------
  // EDIT MODAL STATE / HELPERS
  // -----------------------------
  let showEditModal = false;
  let editRow: DisplayCallRow | null = null;
  let editCallTimeLocal = "";
  let editCallType = "";

  // For dropdown bindings
  let selectedDispatcherId: string = "";
  let selectedClientId: string = ""; // "" = no client selected

  // phone-number behavior
  let useClientPhone = false;
  $: clientPhoneForEdit =
    selectedClientId && clientById.get(Number(selectedClientId))
      ? clientById.get(Number(selectedClientId))!.primary_phone ?? ""
      : "";

  $: phoneLockedToClient =
    !!selectedClientId && !!clientPhoneForEdit && useClientPhone;

  // caller name requirements:
  // - if NO client selected -> fields required
  // - if client selected -> fields auto-filled & disabled
  $: callerLockedToClient = !!selectedClientId;

  function toLocalInputValue(isoOrSql: string | null): string {
    if (!isoOrSql) return "";
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

  function openEdit(row: DisplayCallRow) {
    editRow = { ...row };
    editCallTimeLocal = toLocalInputValue(row.call_time_raw);
    editCallType = row.call_type ?? "";

    // Preselect dispatcher and client based on current row
    selectedDispatcherId = row.user_id ?? "";
    selectedClientId = row.client_id != null ? String(row.client_id) : "";

    const client = row.client_id != null ? clientById.get(row.client_id) : undefined;
    const manualPhone = row.phone_number ?? "";
    const clientPhone = client?.primary_phone ?? "";

    // Default behavior:
    // - If we have a client but ALSO have a manual phone -> checkbox UNCHECKED
    // - If we have a client with phone and NO manual phone -> checkbox CHECKED
    if (client && clientPhone && !manualPhone) {
      useClientPhone = true;
      if (editRow) {
        editRow.phone_number = clientPhone;
      }
    } else {
      useClientPhone = false;
      // keep existing manual phone number in editRow
    }

    // If we already have a client, make sure caller name fields reflect that client
    if (selectedClientId && editRow) {
      if (client) {
        editRow.caller_first_name = client.first_name ?? "";
        editRow.caller_last_name = client.last_name ?? "";
      }
    }

    showEditModal = true;
  }

  function closeEdit() {
    showEditModal = false;
    editRow = null;
    editCallTimeLocal = "";
    selectedDispatcherId = "";
    selectedClientId = "";
    useClientPhone = false;
  }

  // Handle client select changes:
  // - if blank, keep caller name editable & keep manual phone state
  // - if client chosen, auto-populate caller name, and if useClientPhone is true, override phone
  function handleClientChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    selectedClientId = select.value;
    if (!editRow) return;

    if (!selectedClientId) {
      // No client selected; leave caller names and phone as user typed
      return;
    }

    const client = clientById.get(Number(selectedClientId));
    if (client) {
      editRow.caller_first_name = client.first_name ?? "";
      editRow.caller_last_name = client.last_name ?? "";

      const clientPhone = client.primary_phone ?? "";
      if (useClientPhone && clientPhone) {
        editRow.phone_number = clientPhone;
      }
    }
  }

  function handleUseClientPhoneChange() {
    if (!editRow) return;

    if (useClientPhone && clientPhoneForEdit) {
      // When toggled on, override with client phone
      editRow.phone_number = clientPhoneForEdit;
    }
    // When toggled off, we leave whatever manual value is currently in the field
  }

  // -----------------------------
  // DELETE MODAL STATE
  // -----------------------------
  let showDeleteModal = false;
  let deleteRow: DisplayCallRow | null = null;

  function openDelete(row: DisplayCallRow) {
    deleteRow = row;
    showDeleteModal = true;
  }

  function closeDelete() {
    showDeleteModal = false;
    deleteRow = null;
  }

  // -----------------------------
  // CREATE CALL MODAL STATE
  // -----------------------------
  let showCreateModal = false;

  let newSelectedDispatcherId: string = "";
  let newSelectedClientId: string = "";
  let newCallTimeLocal: string = "";
  let newPhoneNumber: string = "";
  let newCallType: string = "";
  let newOtherType: string = "";
  let newForwardedToName: string = "";
  let newCallerFirstName: string = "";
  let newCallerLastName: string = "";

  $: newCallerLockedToClient = !!newSelectedClientId;

  function openCreate() {
    newSelectedDispatcherId = "";
    newSelectedClientId = "";
    newCallTimeLocal = "";
    newPhoneNumber = "";
    newCallType = "";
    newOtherType = "";
    newForwardedToName = "";
    newCallerFirstName = "";
    newCallerLastName = "";
    showCreateModal = true;
  }

  function closeCreate() {
    showCreateModal = false;
  }

  function handleNewClientChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    newSelectedClientId = select.value;

    if (!newSelectedClientId) {
      // no client, keep manual caller fields as-is
      return;
    }

    const client = clientById.get(Number(newSelectedClientId));
    if (client) {
      newCallerFirstName = client.first_name ?? "";
      newCallerLastName = client.last_name ?? "";
    }
  }
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
        <button
          type="button"
          class="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          on:click={openCreate}
        >
          + Add Call
        </button>
      </div>

      <Table
        data={displayCallRows}
        enableEdit={true}
        onEdit={openEdit}
        onDelete={openDelete}
        showIndex={false}
        columns={[
          "call_id",
          "dispatcher",
          "client",
          "caller_name",
          "call_time",
          "phone_number",
          "call_type",
          "other_type",
          "forwarded_to_name"
        ]}
      />
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
          <!-- hidden fields -->
          <input type="hidden" name="call_id" value={editRow.call_id} />
          <!-- keep us on calls tab after submit -->
          <input type="hidden" name="stayOnTab" value="calls" />

          <!-- Dispatcher / Client selects -->
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label class="block text-xs font-medium text-gray-600">
                Dispatcher
              </label>
              <select
                name="user_id"
                bind:value={selectedDispatcherId}
                class="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm bg-white"
              >
                <option value="">
                  — Select dispatcher —
                </option>
                {#each dispatcherOptions as opt}
                  <option value={opt.value}>{opt.label}</option>
                {/each}
              </select>
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-600">
                Client (optional)
              </label>
              <select
                name="client_id"
                bind:value={selectedClientId}
                on:change={handleClientChange}
                class="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm bg-white"
              >
                <option value="">
                  — No client selected —
                </option>
                {#each clientOptions as opt}
                  <option value={opt.value}>{opt.label}</option>
                {/each}
              </select>
            </div>
          </div>

          <!-- Call time -->
          <div>
            <label class="block text-xs font-medium text-gray-700">
              Call Time
            </label>
            <input
              type="datetime-local"
              name="call_time"
              bind:value={editCallTimeLocal}
              max={nowLocal}
              class="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
            />
          </div>

          <!-- Phone / Call Type -->
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label class="block text-xs font-medium text-gray-700">
                Phone Number
              </label>
              <input
                type="text"
                name="phone_number"
                bind:value={editRow.phone_number}
                disabled={phoneLockedToClient}
                class="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm disabled:bg-gray-100"
              />
              {#if selectedClientId && clientPhoneForEdit}
                <label class="mt-2 flex items-center gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    bind:checked={useClientPhone}
                    on:change={handleUseClientPhoneChange}
                  />
                  <span>Use client phone ({clientPhoneForEdit})</span>
                </label>
              {/if}
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700">
                Call Type
              </label>
              <select
                name="call_type"
                bind:value={editCallType}
                class="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm bg-white"
              >
                <option value="">
                  — Select call type —
                </option>
                {#each CALL_TYPE_OPTIONS as opt}
                  <option value={opt}>{opt}</option>
                {/each}
              </select>
            </div>
          </div>

          <!-- Other type / Forwarded to -->
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              {#if editCallType === "Other"}
                <label class="block text-xs font-medium text-gray-700">
                  Other Type
                </label>
                <input
                  type="text"
                  name="other_type"
                  bind:value={editRow.other_type}
                  class="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                />
              {:else}
                <!-- Keep other_type in sync but hidden -->
                <input type="hidden" name="other_type" value={editRow.other_type ?? ""} />
              {/if}
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700">
                Forwarded To (Name)
              </label>
              <input
                type="text"
                name="forwarded_to_name"
                bind:value={editRow.forwarded_to_name}
                class="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
              />
            </div>
          </div>

          <!-- Caller name (manual vs client) -->
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label class="block text-xs font-medium text-gray-700">
                Caller First Name
              </label>
              <input
                type="text"
                name="caller_first_name"
                bind:value={editRow.caller_first_name}
                disabled={callerLockedToClient}
                required={!callerLockedToClient}
                class="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm disabled:bg-gray-100"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700">
                Caller Last Name
              </label>
              <input
                type="text"
                name="caller_last_name"
                bind:value={editRow.caller_last_name}
                disabled={callerLockedToClient}
                required={!callerLockedToClient}
                class="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm disabled:bg-gray-100"
              />
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

  <!-- DELETE CALL MODAL -->
  {#if showDeleteModal && deleteRow}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div class="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-lg font-semibold">
            Delete Call #{deleteRow.call_id}
          </h3>
          <button
            type="button"
            class="text-gray-400 hover:text-gray-600"
            on:click={closeDelete}
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <p class="text-sm text-gray-700 mb-4">
          Are you sure you want to delete this call log? This action cannot be undone.
        </p>

        <form method="POST" action="?/deleteCall" class="mt-4 flex justify-end gap-3">
          <input type="hidden" name="call_id" value={deleteRow.call_id} />
          <!-- keep us on calls tab -->
          <input type="hidden" name="stayOnTab" value="calls" />

          <button
            type="button"
            class="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            on:click={closeDelete}
          >
            Cancel
          </button>
          <button
            type="submit"
            class="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Delete
          </button>
        </form>
      </div>
    </div>
  {/if}

  <!-- CREATE CALL MODAL -->
  {#if showCreateModal}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div class="w-full max-w-xl rounded-lg bg-white p-6 shadow-lg">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-lg font-semibold">
            Add Call
          </h3>
          <button
            type="button"
            class="text-gray-400 hover:text-gray-600"
            on:click={closeCreate}
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <form method="POST" action="?/createCall" class="space-y-4">
          <!-- Dispatcher / Client selects -->
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label class="block text-xs font-medium text-gray-600">
                Dispatcher
              </label>
              <select
                name="user_id"
                bind:value={newSelectedDispatcherId}
                required
                class="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm bg-white"
              >
                <option value="">
                  — Select dispatcher —
                </option>
                {#each dispatcherOptions as opt}
                  <option value={opt.value}>{opt.label}</option>
                {/each}
              </select>
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-600">
                Client (optional)
              </label>
              <select
                name="client_id"
                bind:value={newSelectedClientId}
                on:change={handleNewClientChange}
                class="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm bg-white"
              >
                <option value="">
                  — No client selected —
                </option>
                {#each clientOptions as opt}
                  <option value={opt.value}>{opt.label}</option>
                {/each}
              </select>
            </div>
          </div>

          <!-- Call time -->
          <div>
            <label class="block text-xs font-medium text-gray-700">
              Call Time
            </label>
            <input
              type="datetime-local"
              name="call_time"
              bind:value={newCallTimeLocal}
              max={nowLocal}
              required
              class="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
            />
          </div>

          <!-- Phone / Call Type -->
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label class="block text-xs font-medium text-gray-700">
                Phone Number
              </label>
              <input
                type="text"
                name="phone_number"
                bind:value={newPhoneNumber}
                class="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700">
                Call Type
              </label>
              <select
                name="call_type"
                bind:value={newCallType}
                required
                class="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm bg-white"
              >
                <option value="">
                  — Select call type —
                </option>
                {#each CALL_TYPE_OPTIONS as opt}
                  <option value={opt}>{opt}</option>
                {/each}
              </select>
            </div>
          </div>

          <!-- Other type / Forwarded to -->
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              {#if newCallType === "Other"}
                <label class="block text-xs font-medium text-gray-700">
                  Other Type
                </label>
                <input
                  type="text"
                  name="other_type"
                  bind:value={newOtherType}
                  class="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                />
              {:else}
                <input type="hidden" name="other_type" value={newOtherType} />
              {/if}
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700">
                Forwarded To (Name)
              </label>
              <input
                type="text"
                name="forwarded_to_name"
                bind:value={newForwardedToName}
                class="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
              />
            </div>
          </div>

          <!-- Caller name (manual vs client) -->
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label class="block text-xs font-medium text-gray-700">
                Caller First Name
              </label>
              <input
                type="text"
                name="caller_first_name"
                bind:value={newCallerFirstName}
                disabled={newCallerLockedToClient}
                required={!newCallerLockedToClient}
                class="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm disabled:bg-gray-100"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700">
                Caller Last Name
              </label>
              <input
                type="text"
                name="caller_last_name"
                bind:value={newCallerLastName}
                disabled={newCallerLockedToClient}
                required={!newCallerLockedToClient}
                class="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm disabled:bg-gray-100"
              />
            </div>
          </div>

          <!-- keep us on calls tab -->
          <input type="hidden" name="stayOnTab" value="calls" />

          <div class="mt-5 flex justify-end gap-3">
            <button
              type="button"
              class="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              on:click={closeCreate}
            >
              Cancel
            </button>
            <button
              type="submit"
              class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Create Call
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}
</section>