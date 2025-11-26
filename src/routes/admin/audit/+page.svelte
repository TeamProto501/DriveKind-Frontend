<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import { PhoneCall, FileText, X } from "@lucide/svelte";
  import Table from "./table.svelte";
  import { invalidateAll } from "$app/navigation";
  import { onMount } from "svelte";

  let { data = $bindable(), form = $bindable() }: { data: PageData; form: ActionData | null } = $props();

  // Invalidate data when component mounts after navigation
  onMount(() => {
    invalidateAll();
  });

  // -----------------------------
  // TAB / HEADER STATE
  // -----------------------------
  let activeTab = $derived((data.tab as "audits" | "calls") ?? "audits");

  let headerTitle = $derived(activeTab === "audits" ? "Audit Logs" : "Call Log");

  let headerDescription = $derived(
    activeTab === "audits"
      ? "View activity logs captured by the audit logger."
      : "View and edit logged calls. Dispatcher and Client are resolved from their respective tables."
  );

  // -----------------------------
  // AUDITS TAB STATE
  // -----------------------------
  let search = $state("");

  let previewRows = $derived(
    form && "data" in form && (form as any).data ? (form as any).data : null
  );

  let auditRowsRaw = $derived(activeTab === "audits" ? (data.data ?? []) : []);
  let auditRowsBase = $derived(previewRows ?? auditRowsRaw);

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

  // -----------------------------
  // STAFF / CLIENT LOOKUPS
  // -----------------------------

  // Base arrays
  let staffProfiles = $derived(((data as any).staffProfiles ?? []) as StaffProfile[]);
  let clients = $derived(((data as any).clients ?? []) as ClientRow[]);

  // Filtered versions (still org-scoped)
  let filteredStaff = $derived(staffProfiles);
  let filteredClients = $derived(clients);

  // Maps for quick lookup by id
  let staffById = $derived.by(() => {
    const map = new Map<string, StaffProfile>();
    for (const sp of filteredStaff) {
      if (sp.user_id) map.set(sp.user_id, sp);
    }
    return map;
  });

  let clientById = $derived.by(() => {
    const map = new Map<number, ClientRow>();
    for (const c of filteredClients) {
      if (c.client_id != null) map.set(c.client_id, c);
    }
    return map;
  });

  // For audits: show dispatcher name instead of user id
  let filteredAuditRows = $derived.by(() => {
    const baseRows = Array.isArray(auditRowsBase) ? auditRowsBase : [];

    // Build staff map so we can resolve user names
    const staffProfilesForAudits = ((data as any).staffProfiles ?? []) as StaffProfile[];
    const staffMap = new Map<string, StaffProfile>();
    for (const sp of staffProfilesForAudits) {
      if (sp.user_id) staffMap.set(sp.user_id, sp);
    }

    // 1) Enrich rows:
    //    - convert user_id → user_name
    //    - format timestamp for display
    //    - drop org_id from display
    const enriched = baseRows.map((row: any) => {
      if (!row) return row;

      const uid = row.user_id as string | null | undefined;

      // Always drop org_id so it never appears in the table
      const { org_id: _dropOrg, user_id: _dropUserId, ...rest } = row;

      // Friendly timestamp format, but keep same key name "timestamp"
      const formattedTimestamp = row.timestamp
        ? formatCallTime(row.timestamp)
        : row.timestamp;

      if (!uid) {
        return {
          ...rest,
          timestamp: formattedTimestamp,
        };
      }

      const sp = staffMap.get(uid);
      const name =
        sp ? `${sp.first_name ?? ""} ${sp.last_name ?? ""}`.trim() || uid : uid;

      return {
        ...rest,
        timestamp: formattedTimestamp,
        user_name: name,
      };
    });

    // 2) Apply search on the enriched rows, so user_name is searchable
    const term = search.trim().toLowerCase();
    if (!term) return enriched;

    return enriched.filter((row: any) =>
      Object.values(row ?? {})
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  });

  // Options for dropdowns (reactive)
  let dispatcherOptions = $derived(
    filteredStaff.map((sp) => {
      const name = `${sp.first_name ?? ""} ${sp.last_name ?? ""}`.trim();
      return {
        value: sp.user_id,
        label: name || sp.user_id
      };
    })
  );

  let clientOptions = $derived(
    filteredClients.map((c) => {
      const name = `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim();
      return {
        value: String(c.client_id),
        label: name || `Client #${c.client_id}`
      };
    })
  );

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
  let rawCallRows = $derived(
    activeTab === "calls" ? ((data.data as CallRowFromServer[]) ?? []) : []
  );

  // Sort by call_time descending
  let sortedCallRows = $derived(
    [...rawCallRows].sort(
      (a, b) => toMillis(b.call_time) - toMillis(a.call_time)
    )
  );

  // Build display rows:
  // - Dispatcher name from staff_profiles
  // - Client name from clients
  // - Caller name: prefer client name if client is selected
  let displayCallRows = $derived.by(() => {
    return sortedCallRows.map((row) => {
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
  });

  // -----------------------------
  // EDIT MODAL STATE / HELPERS
  // -----------------------------
  let showEditModal = $state(false);
  let editRow: DisplayCallRow | null = $state(null);
  let editCallTimeLocal = $state("");
  let editCallType = $state("");

  // For dropdown bindings
  let selectedDispatcherId = $state("");
  let selectedClientId = $state(""); // "" = no client selected

  // phone-number behavior
  let useClientPhone = $state(false);
  let clientPhoneForEdit = $derived(
    selectedClientId && clientById.get(Number(selectedClientId))
      ? clientById.get(Number(selectedClientId))!.primary_phone ?? ""
      : ""
  );

  // If you want the input to be locked when using client phone:
  let phoneLockedToClient = $derived(
    !!selectedClientId && !!clientPhoneForEdit && useClientPhone
  );

  // caller name requirements:
  // - if NO client selected -> fields required
  // - if client selected -> fields auto-filled and disabled
  let callerLockedToClient = $derived(!!selectedClientId);

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
    // If we have a client with a phone, use the client's phone by default
    if (client && clientPhone) {
      useClientPhone = true;
      if (editRow) {
        editRow.phone_number = clientPhone;
      }
    } else {
      useClientPhone = false;
      // keep existing manual phone number in editRow
      if (editRow) {
        editRow.phone_number = manualPhone;
      }
    }

    // If we already have a client, make sure caller name fields reflect that client
    if (selectedClientId && editRow && client) {
      editRow.caller_first_name = client.first_name ?? "";
      editRow.caller_last_name = client.last_name ?? "";
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
  // - if blank, keep caller name editable and keep manual phone state
  // - if client chosen, auto-populate caller name AND phone number
  function handleClientChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    selectedClientId = select.value;
    if (!editRow) return;

    if (!selectedClientId) {
      // No client selected; leave caller names and phone as user typed
      useClientPhone = false;
      return;
    }

    const client = clientById.get(Number(selectedClientId));
    if (client) {
      editRow.caller_first_name = client.first_name ?? "";
      editRow.caller_last_name = client.last_name ?? "";

      const clientPhone = client.primary_phone ?? "";
      if (clientPhone) {
        // Always sync to the selected client's phone
        useClientPhone = true;
        editRow.phone_number = clientPhone;
      } else {
        useClientPhone = false;
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
  let showDeleteModal = $state(false);
  let deleteRow: DisplayCallRow | null = $state(null);

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
  let showCreateModal = $state(false);

  let newSelectedDispatcherId = $state("");
  let newSelectedClientId = $state("");
  let newCallTimeLocal = $state("");
  let newPhoneNumber = $state("");
  let newCallType = $state("");
  let newOtherType = $state("");
  let newForwardedToName = $state("");
  let newCallerFirstName = $state("");
  let newCallerLastName = $state("");

  let newCallerLockedToClient = $derived(!!newSelectedClientId);

  function openCreate() {
    newSelectedDispatcherId = "";
    newSelectedClientId = "";
    newCallTimeLocal = getNowLocal();
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
      // no client, keep manual caller fields and phone as-is
      return;
    }

    const client = clientById.get(Number(newSelectedClientId));
    if (client) {
      newCallerFirstName = client.first_name ?? "";
      newCallerLastName = client.last_name ?? "";
      if (client.primary_phone) {
        // For new call, also default phone number to client's phone
        newPhoneNumber = client.primary_phone;
      }
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
      
        href="?tab=audits"
        class="inline-flex items-center border-b-2 px-1 pb-2 font-medium
        {activeTab === 'audits'
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
      >
        <FileText class="w-4 h-4 mr-1.5" />
        Audits
      </a>
      
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
        <Table
          data={filteredAuditRows}
          showIndex={false}
          columns={[
            "transaction_id",
            "timestamp",
            "user_name",
            "action_enum",
            "table_name_enum",
            "field_name",
            "old_value",
            "new_value"
          ]}
        />
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
          onclick={openCreate}
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
            onclick={closeEdit}
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <form method="POST" action="?/updateCall" class="space-y-4">
          <!-- hidden fields -->
          <input type="hidden" name="call_id" value={editRow.call_id} />
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
                  - Select dispatcher -
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
                onchange={handleClientChange}
                class="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm bg-white"
              >
                <option value="">
                  - No client selected -
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
                    onchange={handleUseClientPhoneChange}
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
                  - Select call type -
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
              {#if callerLockedToClient}
                <input
                  type="text"
                  value={editRow.caller_first_name}
                  disabled
                  class="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm bg-gray-100"
                />
                <input type="hidden" name="caller_first_name" value={editRow.caller_first_name ?? ""} />
              {:else}
                <input
                  type="text"
                  name="caller_first_name"
                  bind:value={editRow.caller_first_name}
                  required
                  class="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                />
              {/if}
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700">
                Caller Last Name
              </label>
              {#if callerLockedToClient}
                <input
                  type="text"
                  value={editRow.caller_last_name}
                  disabled
                  class="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm bg-gray-100"
                />
                <input type="hidden" name="caller_last_name" value={editRow.caller_last_name ?? ""} />
              {:else}
                <input
                  type="text"
                  name="caller_last_name"
                  bind:value={editRow.caller_last_name}
                  required
                  class="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                />
              {/if}
            </div>
          </div>

          <div class="mt-5 flex justify-end gap-3">
            <button
              type="button"
              class="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              onclick={closeEdit}
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
            onclick={closeDelete}
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <p class="text-sm text-gray-700 mb-4">
          Are you sure you want to delete this call log? This action cannot be undone.
        </p>

        <form method="POST" action="?/deleteCall" class="mt-4 flex justify-end gap-3">
          <input type="hidden" name="call_id" value={deleteRow.call_id} />
          <input type="hidden" name="stayOnTab" value="calls" />

          <button
            type="button"
            class="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onclick={closeDelete}
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
            onclick={closeCreate}
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <form method="POST" action="?/createCall" class="space-y-4">
          <!-- Dispatcher / Client selects -->
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label class="block text-xs font-medium text-gray-600">
                Dispatcher <span class="text-red-500">*</span>
              </label>
              <select
                name="user_id"
                bind:value={newSelectedDispatcherId}
                required
                class="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm bg-white"
              >
                <option value="">- Select dispatcher -</option>
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
                onchange={handleNewClientChange}
                class="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm bg-white"
              >
                <option value="">- No client selected -</option>
                {#each clientOptions as opt}
                  <option value={opt.value}>{opt.label}</option>
                {/each}
              </select>
            </div>
          </div>

          <!-- Call time -->
          <div>
            <label class="block text-xs font-medium text-gray-700">
              Call Time <span class="text-red-500">*</span>
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
                Call Type <span class="text-red-500">*</span>
              </label>
              <select
                name="call_type"
                bind:value={newCallType}
                required
                class="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm bg-white"
              >
                <option value="">- Select call type -</option>
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
                <input type="hidden" name="other_type" value="" />
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
                Caller First Name {#if !newCallerLockedToClient}<span class="text-red-500">*</span>{/if}
              </label>
              {#if newCallerLockedToClient}
                <input
                  type="text"
                  value={newCallerFirstName}
                  disabled
                  class="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm bg-gray-100"
                />
                <input type="hidden" name="caller_first_name" value={newCallerFirstName} />
              {:else}
                <input
                  type="text"
                  name="caller_first_name"
                  bind:value={newCallerFirstName}
                  required
                  class="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                />
              {/if}
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700">
                Caller Last Name {#if !newCallerLockedToClient}<span class="text-red-500">*</span>{/if}
              </label>
              {#if newCallerLockedToClient}
                <input
                  type="text"
                  value={newCallerLastName}
                  disabled
                  class="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm bg-gray-100"
                />
                <input type="hidden" name="caller_last_name" value={newCallerLastName} />
              {:else}
                <input
                  type="text"
                  name="caller_last_name"
                  bind:value={newCallerLastName}
                  required
                  class="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                />
              {/if}
            </div>
          </div>

          <input type="hidden" name="stayOnTab" value="calls" />

          <div class="mt-5 flex justify-end gap-3">
            <button
              type="button"
              class="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              onclick={closeCreate}
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