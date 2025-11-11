<script lang="ts">
  import {
    Building2,
    Plus,
    Search,
    Edit,
    Trash2,
    Save,
    X,
    Mail,
    Phone,
    MapPin,
    Link as LinkIcon,
  } from "@lucide/svelte";
  import { onMount } from "svelte";
  import { supabase } from "$lib/supabase";

  type OrgRow = Record<string, any> & { org_id: number; name: string };

  // ---------- Constants ----------
  const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const dayMap: Record<string, string> = {
    Su: "Sunday",
    Mo: "Monday",
    Tu: "Tuesday",
    We: "Wednesday",
    Th: "Thursday",
    Fr: "Friday",
    Sa: "Saturday",
  };
  const DAYS: Array<{
    code: "Su" | "Mo" | "Tu" | "We" | "Th" | "Fr" | "Sa";
    label: string;
  }> = [
    { code: "Su", label: "Sunday" },
    { code: "Mo", label: "Monday" },
    { code: "Tu", label: "Tuesday" },
    { code: "We", label: "Wednesday" },
    { code: "Th", label: "Thursday" },
    { code: "Fr", label: "Friday" },
    { code: "Sa", label: "Saturday" },
  ];
  const HOUR_OPTS = Array.from({ length: 24 }, (_, i) =>
    String(i).padStart(2, "0")
  ); // '00'..'23'

  // ---------- Helpers ----------
  function ordinal(n: number) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }
  function formatDaysOff(str?: string | null): string[] {
    if (!str) return [];
    return String(str)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((tok) => {
        const m = tok.match(/^(\d{1,2})\/(\d{1,2})$/);
        if (!m) return "";
        const mm = Math.max(1, Math.min(12, parseInt(m[1], 10)));
        const dd = Math.max(1, Math.min(31, parseInt(m[2], 10)));
        return `${MONTHS[mm - 1]} ${ordinal(dd)}`;
      })
      .filter(Boolean);
  }
  function usernameExample(
    code: string | null | undefined,
    first = "John",
    last = "Doe"
  ) {
    if (!code) return "";
    const c = String(code).toUpperCase().trim();
    if (c === "F1L") {
      const ex = `${(first[0] ?? "").toLowerCase()}${(last ?? "").toLowerCase()}`;
      return `Format “F1L”: first initial + last name. Example: ${first} ${last} → ${ex}`;
    }
    const m = c.match(/^F(\d+)L(\d+)$/);
    if (m) {
      const n = parseInt(m[1], 10);
      const k = parseInt(m[2], 10);
      const firstPart = (first ?? "").slice(0, Math.max(0, n));
      const lastPart = (last ?? "").slice(0, Math.max(0, k)).toLowerCase();
      const ex = `${firstPart}${lastPart}`;
      return `Format “F${n}L${k}”: first ${n} of first + first ${k} of last. Example: ${first} ${last} → ${ex}`;
    }
    return "";
  }

  // Working hours UI <-> compact string
  type DayHours = { open: boolean; start: string; end: string }; // '07'..'18'
  type WorkingHoursUI = Record<
    "Su" | "Mo" | "Tu" | "We" | "Th" | "Fr" | "Sa",
    DayHours
  >;

  function defaultWorkingHoursUI(): WorkingHoursUI {
    const d: WorkingHoursUI = {
      Su: { open: false, start: "09", end: "17" },
      Mo: { open: true, start: "09", end: "17" },
      Tu: { open: true, start: "09", end: "17" },
      We: { open: true, start: "09", end: "17" },
      Th: { open: true, start: "09", end: "17" },
      Fr: { open: true, start: "09", end: "17" },
      Sa: { open: false, start: "09", end: "17" },
    };
    return d;
  }
  function parseWorkingHoursToUI(input?: string | null): WorkingHoursUI {
    const ui = defaultWorkingHoursUI();
    if (!input) return ui;
    for (const token of String(input)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)) {
      const m = token.match(/^([A-Z][a-z])(\d{2})-(\d{2})$/);
      if (!m) continue;
      const [, code, start, end] = m as unknown as [
        string,
        "Su" | "Mo" | "Tu" | "We" | "Th" | "Fr" | "Sa",
        string,
        string,
      ];
      if (ui[code]) ui[code] = { open: true, start, end };
    }
    return ui;
  }
  function packWorkingHours(ui: WorkingHoursUI): string {
    const parts: string[] = [];
    for (const d of DAYS) {
      const v = ui[d.code];
      if (v?.open) {
        // clamp order if needed
        let s = v.start,
          e = v.end;
        if (parseInt(e) < parseInt(s)) e = s; // never let end < start
        parts.push(`${d.code}${s}-${e}`);
      }
    }
    return parts.join(", ");
  }

  // ---------- Form model ----------
  let form = $state({
    // Overview
    name: "",
    org_status: "",
    org_email: "",
    org_phone: "",
    org_website: "",
    // Address
    org_address: "",
    org_address2: "",
    org_city: "",
    org_state: "",
    org_zip_code: "",
    // Operations
    working_hours: "", // NOT directly used; we fill from UI pack
    days_off: "",
    rides_phone_number: "",
    client_min_age: "",
    min_days_in_advance_for_ride_requests: "",
    // Contacts (no phone fields)
    primary_contact_name: "",
    primary_contact_email: "",
    primary_contact_address: "",
    primary_contact_address2: "",
    primary_contact_city: "",
    primary_contact_state: "",
    primary_contact_zipcode: "",
    secondary_contact_name: "",
    secondary_contact_email: "",
    secondary_contact_address: "",
    secondary_contact_address2: "",
    secondary_contact_city: "",
    secondary_contact_state: "",
    secondary_contact_zipcode: "",
    // Login / username
    //username_format: "",
    user_initial_password: "",
    // Meta (read only)
    org_creation_date: "",
    first_ride_date: "",
    last_activity_in_portal: "",
  });

  // Wizard state
  const STEP_LABELS = [
    "Overview",
    "Address",
    "Operations",
    "Primary Contact",
    "Secondary Contact",
    "Login",
    "Review",
  ] as const;
  let addStep = $state(0);
  let editStep = $state(0);

  // Working hours UI for add/edit
  let whAdd = $state<WorkingHoursUI>(defaultWorkingHoursUI());
  let whEdit = $state<WorkingHoursUI>(defaultWorkingHoursUI());

  const OPTIONAL_KEYS = new Set<string>([
    "days_off",
    "org_address2",
    "first_ride_date",
    "last_activity_in_portal",
    "primary_contact_address2",
    "secondary_contact_name",
    "secondary_contact_email",
    "secondary_contact_address",
    "secondary_contact_address2",
    "secondary_contact_city",
    "secondary_contact_state",
    "secondary_contact_zipcode",
  ]);
  function isRequired(key: string) {
    return !OPTIONAL_KEYS.has(key);
  }
  const FIELD_LABELS: Record<string, string> = {
    name: "Name",
    org_status: "Organization Status",
    org_email: "Organization Email",
    org_phone: "Organization Phone",
    org_website: "Website",
    org_address: "Street",
    org_address2: "Street 2",
    org_city: "City",
    org_state: "State",
    org_zip_code: "Zip Code",
    working_hours: "Working Hours",
    days_off: "Days Off",
    rides_phone_number: "Rides Phone",
    client_min_age: "Client Minimum Age",
    min_days_in_advance_for_ride_requests: "Min Days in Advance",
    primary_contact_name: "Primary Contact Name",
    primary_contact_email: "Primary Contact Email",
    primary_contact_address: "Primary Contact Address",
    primary_contact_address2: "Primary Contact Address 2",
    primary_contact_city: "Primary Contact City",
    primary_contact_state: "Primary Contact State",
    primary_contact_zipcode: "Primary Contact Zip",
    secondary_contact_name: "Secondary Contact Name",
    secondary_contact_email: "Secondary Contact Email",
    secondary_contact_address: "Secondary Contact Address",
    secondary_contact_address2: "Secondary Contact Address 2",
    secondary_contact_city: "Secondary Contact City",
    secondary_contact_state: "Secondary Contact State",
    secondary_contact_zipcode: "Secondary Contact Zip",
    //username_format: "Username Format",
    user_initial_password: "Initial Password",
  };
  let fieldErrors = $state<Record<string, string>>({});

  function validateRequiredForStep(stepIdx: number): string[] {
    // step-specific requireds to reduce overwhelm
    fieldErrors = {};
    const requiredByStep: Record<number, string[]> = {
      0: ["name", "org_status", "org_website", "org_email", "org_phone"],
      1: ["org_address", "org_city", "org_state", "org_zip_code"],
      2: [
        "rides_phone_number",
        "client_min_age",
        "min_days_in_advance_for_ride_requests",
      ], // working hours via UI
      3: [
        "primary_contact_name",
        "primary_contact_email",
        "primary_contact_address",
        "primary_contact_city",
        "primary_contact_state",
        "primary_contact_zipcode",
      ],
      4: [], // secondary optional
      5: ["user_initial_password"],
      6: [], // review
    };
    const keys = requiredByStep[stepIdx] ?? [];
    const missing: string[] = [];
    for (const key of keys) {
      const val = (form as any)[key];
      const empty = val == null || String(val).trim() === "";
      if (empty) {
        missing.push(key);
        fieldErrors[key] = "Required";
      }
    }
    // Also require at least one open day in step 2:
    if (stepIdx === 2) {
      const anyOpen = DAYS.some(
        (d) => whAdd[d.code].open || whEdit[d.code].open
      );
      if (!anyOpen) missing.push("working_hours");
    }
    return missing;
  }

  function labelWithRequired(label: string, key: string) {
    return isRequired(key) ? `${label} *` : label;
  }
  function emptyToNull(obj: Record<string, any>) {
    const out: Record<string, any> = {};
    for (const k in obj) out[k] = obj[k] === "" ? null : obj[k];
    return out;
  }
  function coerceNumbers(payload: Record<string, any>, keys: string[]) {
    for (const k of keys) {
      if (
        payload[k] === null ||
        payload[k] === undefined ||
        payload[k] === ""
      ) {
        payload[k] = null;
        continue;
      }
      const n = Number(payload[k]);
      payload[k] = isNaN(n) ? null : n;
    }
  }

  // ---------- Data / UI State ----------
  let organizations: OrgRow[] = [];
  let filteredOrganizations: OrgRow[] = [];
  let isLoading = $state(true);
  let searchTerm = $state("");
  let showAddModal = $state(false);
  let showEditModal = $state(false);
  let showDeleteModal = $state(false);
  let showPasswordModal = $state(false);
  let selectedOrg: OrgRow | null = null;
  let editingOrg: OrgRow | null = null;
  let editMessage = $state("");
  let editMessageSuccess = $state(false);
  let passwordInput = $state("");
  let passwordError = $state("");

  function showEditMessage(message: string, success: boolean) {
    editMessage = message;
    editMessageSuccess = success;
    setTimeout(() => {
      editMessage = "";
    }, 5000);
  }

  onMount(async () => {
    await loadOrganizations();
    if (filteredOrganizations.length === 0 && organizations.length > 0) {
      filteredOrganizations = organizations;
    }
  });

  async function loadOrganizations() {
    try {
      isLoading = true;
      // Order by org_id ASC (lowest on top)
      const { data, error } = await supabase
        .from("organization")
        .select("*")
        .order("org_id", { ascending: true });
      if (error) {
        showEditMessage(
          "Failed to load organizations: " + error.message,
          false
        );
        return;
      }
      // Client-side safety sort as well
      organizations = (data || []).sort(
        (a, b) => (a.org_id ?? 0) - (b.org_id ?? 0)
      );
      applyFilter();
    } catch (e: any) {
      showEditMessage(
        "Failed to load organizations: " + (e?.message ?? "Unknown error"),
        false
      );
    } finally {
      isLoading = false;
    }
  }
  async function refreshOrganizations() {
    try {
      isLoading = true;
      const { data, error } = await supabase
        .from("organization")
        .select("*")
        .order("org_id", { ascending: true });
      if (error) {
        showEditMessage(
          "Failed to refresh organizations: " + error.message,
          false
        );
        return;
      }
      organizations = (data || []).sort(
        (a, b) => (a.org_id ?? 0) - (b.org_id ?? 0)
      );
      applyFilter();
    } catch (e: any) {
      showEditMessage(
        "Failed to refresh organizations: " + (e?.message ?? "Unknown error"),
        false
      );
    } finally {
      isLoading = false;
    }
  }

  function applyFilter() {
    if (!searchTerm.trim()) {
      filteredOrganizations = organizations;
    } else {
      const q = searchTerm.toLowerCase();
      filteredOrganizations = organizations.filter(
        (org) =>
          (org.name ?? "").toLowerCase().includes(q) ||
          (org.org_email ?? "").toLowerCase().includes(q) ||
          (org.org_city ?? "").toLowerCase().includes(q) ||
          (org.org_state ?? "").toLowerCase().includes(q)
      );
    }
    // keep UI order by org_id asc
    filteredOrganizations = filteredOrganizations
      .slice()
      .sort((a, b) => (a.org_id ?? 0) - (b.org_id ?? 0));
  }
  $effect(() => {
    if (organizations) applyFilter();
  });

  // ---------- Modals ----------
  function openAddModal() {
    // reset form + wizard
    for (const k of Object.keys(form)) (form as any)[k] = "";
    fieldErrors = {};
    addStep = 0;
    whAdd = defaultWorkingHoursUI();
    showAddModal = true;
  }
  function openEditModal(org: OrgRow) {
    editingOrg = org;
    for (const k of Object.keys(form)) {
      let v = (org as any)[k];
      if (k === "days_off" && (v == null || v === ""))
        v = (org as any)["days-off"];
      (form as any)[k] = v == null ? "" : String(v);
    }
    // Normalize org_status
    const rawStatus = (org.org_status ??
      org.org_status_enum ??
      org.status ??
      "") as string;
    const s = String(rawStatus).trim().toLowerCase();
    form.org_status =
      s === "active" ? "Active" : s === "inactive" ? "Inactive" : "Inactive";

    // Seed working-hours UI from existing DB value
    whEdit = parseWorkingHoursToUI(
      org.working_hours ?? org["working_hours"] ?? ""
    );

    fieldErrors = {};
    editStep = 0;
    showEditModal = true;
  }
  function openDeleteModal(org: OrgRow) {
    selectedOrg = org;
    showDeleteModal = true;
  }
  function openPasswordModal() {
    passwordInput = "";
    passwordError = "";
    showDeleteModal = false;
    showPasswordModal = true;
  }
  function closeModals() {
    showAddModal = false;
    showEditModal = false;
    showDeleteModal = false;
    showPasswordModal = false;
    selectedOrg = null;
    editingOrg = null;
    passwordInput = "";
    passwordError = "";
  }

  // ---------- Step navigation ----------
  function nextAddStep() {
    const missing = validateRequiredForStep(addStep);
    if (missing.length) {
      const names = missing.map((k) => FIELD_LABELS[k] ?? k).join(", ");
      showEditMessage(`Please fill in: ${names}.`, false);
      return;
    }
    if (addStep < STEP_LABELS.length - 1) addStep += 1;
  }
  function prevAddStep() {
    if (addStep > 0) addStep -= 1;
  }

  function nextEditStep() {
    const missing = validateRequiredForStep(editStep);
    if (missing.length) {
      const names = missing.map((k) => FIELD_LABELS[k] ?? k).join(", ");
      showEditMessage(`Please fill in: ${names}.`, false);
      return;
    }
    if (editStep < STEP_LABELS.length - 1) editStep += 1;
  }
  function prevEditStep() {
    if (editStep > 0) editStep -= 1;
  }

  // ---------- CRUD ----------
  async function addOrganization(e: Event) {
    e.preventDefault();
    // final step validation
    for (let s = 0; s <= 5; s++) {
      const miss = validateRequiredForStep(s);
      if (miss.length) {
        addStep = s;
        const names = miss.map((k) => FIELD_LABELS[k] ?? k).join(", ");
        showEditMessage(`Please fill in: ${names}.`, false);
        return;
      }
    }
    try {
      const payload: Record<string, any> = emptyToNull({ ...form });
      // set working_hours from UI
      payload.working_hours = packWorkingHours(whAdd);

      // remap + numeric coercion
      coerceNumbers(payload, [
        "client_min_age",
        "min_days_in_advance_for_ride_requests",
      ]);
      if ("days_off" in payload) {
        payload["days-off"] = payload.days_off;
        delete payload.days_off;
      }
      if ("org_status" in payload) {
        payload.org_status_enum = payload.org_status;
        delete payload.org_status;
      }
      delete payload.org_creation_date;
      delete payload.first_ride_date;
      delete payload.last_activity_in_portal;

      const { error } = await supabase
        .from("organization")
        .insert([payload])
        .select()
        .single();
      if (error) {
        showEditMessage("Failed to add organization: " + error.message, false);
        return;
      }

      showEditMessage("Organization added successfully!", true);
      closeModals();
      await refreshOrganizations();
    } catch (e: any) {
      showEditMessage(
        "Failed to add organization: " + (e?.message ?? "Unknown error"),
        false
      );
    }
  }

  async function updateOrganization(e: Event) {
    e.preventDefault();
    if (!editingOrg) return;

    // final step validation
    for (let s = 0; s <= 5; s++) {
      const miss = validateRequiredForStep(s);
      if (miss.length) {
        editStep = s;
        const names = miss.map((k) => FIELD_LABELS[k] ?? k).join(", ");
        showEditMessage(`Please fill in: ${names}.`, false);
        return;
      }
    }
    try {
      const payload: Record<string, any> = emptyToNull({ ...form });

      // set working_hours from UI
      payload.working_hours = packWorkingHours(whEdit);

      coerceNumbers(payload, [
        "client_min_age",
        "min_days_in_advance_for_ride_requests",
      ]);
      if ("days_off" in payload) {
        payload["days-off"] = payload.days_off;
        delete payload.days_off;
      }
      if ("org_status" in payload) {
        payload.org_status_enum = payload.org_status;
        delete payload.org_status;
      }
      delete payload.org_creation_date;
      delete payload.first_ride_date;
      delete payload.last_activity_in_portal;

      const { error } = await supabase
        .from("organization")
        .update(payload)
        .eq("org_id", editingOrg.org_id)
        .select()
        .single();

      if (error) {
        showEditMessage(
          "Failed to update organization: " + error.message,
          false
        );
        return;
      }

      showEditMessage("Organization updated successfully!", true);
      closeModals();
      await refreshOrganizations();
    } catch (e: any) {
      showEditMessage(
        "Failed to update organization: " + (e?.message ?? "Unknown error"),
        false
      );
    }
  }

  async function deleteOrganization() {
    if (!selectedOrg) return;
    try {
      const { error } = await supabase
        .from("organization")
        .delete()
        .eq("org_id", selectedOrg.org_id);
      if (error) {
        showEditMessage(
          "Failed to delete organization: " + error.message,
          false
        );
        return;
      }
      showEditMessage("Organization deleted successfully!", true);
      closeModals();
      await refreshOrganizations();
    } catch (e: any) {
      showEditMessage(
        "Failed to delete organization: " + (e?.message ?? "Unknown error"),
        false
      );
    }
  }
  async function confirmDeleteWithPassword() {
    if (!passwordInput.trim()) {
      passwordError = "Please enter your password to confirm deletion.";
      return;
    }
    try {
      passwordError = "";
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.email) {
        passwordError = "Unable to verify user identity.";
        return;
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordInput,
      });
      if (signInError) {
        passwordError = "Invalid password. Please try again.";
        return;
      }
      await deleteOrganization();
    } catch {
      passwordError = "Error verifying password. Please try again.";
    }
  }
</script>

<div class="min-h-screen bg-gray-50">
  <!-- Header -->
  <div class="bg-white shadow-sm border-b border-gray-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="p-2 bg-blue-100 rounded-lg">
            <Building2 class="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 class="text-2xl font-bold text-gray-900">
              Organizations Management
            </h1>
            <p class="text-sm text-gray-600">
              Manage organizations in the database
            </p>
          </div>
        </div>
        <button
          onclick={openAddModal}
          class="inline-flex items-center px-4 py-2 rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus class="w-4 h-4 mr-2" /> Add Organization
        </button>
      </div>
    </div>
  </div>

  <!-- Messages -->
  {#if editMessage}
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div
        class="rounded-md p-4 {editMessageSuccess
          ? 'bg-green-50 border border-green-200'
          : 'bg-red-50 border border-red-200'}"
      >
        <p
          class="text-base font-medium {editMessageSuccess
            ? 'text-green-800'
            : 'text-red-800'}"
        >
          {editMessage}
        </p>
      </div>
    </div>
  {/if}

  <!-- Main -->
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
    <!-- Search -->
    <div class="mb-6">
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div class="flex items-center space-x-4">
          <div class="flex-1 max-w-md">
            <div class="relative">
              <Search
                class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4"
              />
              <input
                type="text"
                placeholder="Search organizations..."
                bind:value={searchTerm}
                oninput={applyFilter}
                class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div class="text-sm text-gray-500">
            {filteredOrganizations.length} organization{filteredOrganizations.length !==
            1
              ? "s"
              : ""} found
          </div>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200">
      {#if isLoading}
        <div class="p-8 text-center">
          <div
            class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"
          ></div>
          <p class="mt-2 text-gray-500">Loading organizations...</p>
        </div>
      {:else if filteredOrganizations.length === 0}
        <div class="p-8 text-center">
          <Building2 class="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 class="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? "No organizations found" : "No organizations yet"}
          </h3>
          <p class="text-gray-500 mb-4">
            {searchTerm
              ? "Try adjusting your search terms."
              : "Get started by adding your first organization."}
          </p>
          {#if !searchTerm}
            <button
              onclick={openAddModal}
              class="inline-flex items-center px-4 py-2 rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus class="w-4 h-4 mr-2" /> Add First Organization
            </button>
          {/if}
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                  >Organization</th
                >
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                  >Contact</th
                >
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                  >Location</th
                >
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                  >Actions</th
                >
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {#each filteredOrganizations as org (org.org_id)}
                <tr class="hover:bg-gray-50">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="space-y-0.5">
                      <div
                        class="text-sm font-medium text-gray-900 flex items-center gap-2"
                      >
                        {#if org.org_website}
                          <a
                            href={/^https?:\/\//.test(org.org_website)
                              ? org.org_website
                              : `https://${org.org_website}`}
                            class="text-blue-600 hover:underline inline-flex items-center gap-1"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <LinkIcon class="w-4 h-4 text-gray-400" />
                            {org.name}
                          </a>
                        {:else}
                          <span>{org.name}</span>
                        {/if}
                      </div>
                      <div class="text-xs text-gray-500">ID: {org.org_id}</div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="space-y-1">
                      <div class="text-sm text-gray-900 flex items-center">
                        <Mail class="w-4 h-4 mr-1 text-gray-400" />
                        {org.org_email ?? "-"}
                      </div>
                      <div class="text-sm text-gray-900 flex items-center">
                        <Phone class="w-4 h-4 mr-1 text-gray-400" />
                        {org.org_phone ?? "-"}
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900 flex items-start">
                      <MapPin class="w-4 h-4 mr-1 mt-0.5 text-gray-400" />
                      <div>
                        <div>{org.org_city ?? "-"}, {org.org_state ?? "-"}</div>
                        <div class="text-gray-500">
                          {org.org_zip_code ?? ""}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div class="flex space-x-2">
                      <button
                        onclick={() => openEditModal(org)}
                        class="inline-flex items-center px-3 py-2 rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <Edit class="w-4 h-4 mr-1" /> Edit
                      </button>
                      <button
                        onclick={() => openDeleteModal(org)}
                        class="inline-flex items-center px-3 py-2 rounded-md text-white bg-red-600 hover:bg-red-700"
                      >
                        <Trash2 class="w-4 h-4 mr-1" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  </div>

  <!-- Delete Confirmation -->
  {#if showDeleteModal && selectedOrg}
    <div
      class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
    >
      <div
        class="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white"
      >
        <div class="mt-3">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-medium text-gray-900">
              Delete Organization
            </h3>
            <button
              onclick={closeModals}
              class="text-gray-400 hover:text-gray-600"
              ><X class="w-5 h-5" /></button
            >
          </div>
          <p class="text-sm text-gray-600 mb-6">
            Are you sure you want to delete <strong>{selectedOrg.name}</strong>?
            This action cannot be undone.
          </p>
          <div class="flex justify-end gap-3">
            <button
              onclick={closeModals}
              class="px-4 py-2 border border-gray-300 rounded-md">Cancel</button
            >
            <button
              onclick={openPasswordModal}
              class="px-4 py-2 bg-red-600 text-white rounded-md"
              >Yes, Delete</button
            >
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Password Confirm -->
  {#if showPasswordModal && selectedOrg}
    <div
      class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
    >
      <div
        class="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white"
      >
        <div class="mt-3">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-medium text-gray-900">Confirm Deletion</h3>
            <button
              onclick={closeModals}
              class="text-gray-400 hover:text-gray-600"
              ><X class="w-5 h-5" /></button
            >
          </div>
          <div class="mb-6">
            <p class="text-sm text-gray-600 mb-4">
              Enter your password to delete <strong>{selectedOrg.name}</strong>.
            </p>
            <label class="block text-sm font-medium text-gray-700 mb-2"
              >Password</label
            >
            <input
              type="password"
              bind:value={passwordInput}
              class="w-full px-3 py-2 border {passwordError
                ? 'border-red-300'
                : 'border-gray-300'} rounded-md"
            />
            {#if passwordError}<p class="mt-2 text-sm text-red-600">
                {passwordError}
              </p>{/if}
          </div>
          <div class="flex justify-end gap-3">
            <button
              onclick={closeModals}
              class="px-4 py-2 border border-gray-300 rounded-md">Cancel</button
            >
            <button
              onclick={confirmDeleteWithPassword}
              class="px-4 py-2 bg-red-600 text-white rounded-md"
              >Delete Organization</button
            >
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- ADD Organization Wizard -->
  {#if showAddModal}
    <div
      class="fixed inset-0 bg-gray-600/50 overflow-y-auto h-full w-full z-50"
    >
      <div
        class="relative top-10 mx-auto p-5 w-full max-w-4xl shadow-lg rounded-2xl bg-white"
      >
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-xl font-semibold">Add Organization</h3>
          <button
            onclick={closeModals}
            class="text-gray-400 hover:text-gray-600"
            ><X class="w-5 h-5" /></button
          >
        </div>
        <p class="text-sm text-gray-500 mb-4">
          <span class="text-red-600">*</span> indicates required fields.
        </p>

        <!-- Step indicator -->
        <div class="mb-4 text-sm text-gray-700">
          Step {addStep + 1} of {STEP_LABELS.length}:
          <span class="font-medium">{STEP_LABELS[addStep]}</span>
        </div>

        <form onsubmit={addOrganization} class="space-y-6">
          <!-- STEP 0: Overview -->
          {#if addStep === 0}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired("Name", "name")}</label
                ><input
                  type="text"
                  bind:value={form.name}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.name ? "border-red-500" : "border-gray-300")}
                />
              </div>
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired(
                    "Organization Status",
                    "org_status"
                  )}</label
                ><select
                  bind:value={form.org_status}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.org_status
                      ? "border-red-500"
                      : "border-gray-300")}
                  ><option value="">—</option><option value="Active"
                    >Active</option
                  ><option value="Inactive">Inactive</option></select
                >
              </div>
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired("Website", "org_website")}</label
                ><input
                  type="text"
                  bind:value={form.org_website}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.org_website
                      ? "border-red-500"
                      : "border-gray-300")}
                />
              </div>
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired("Organization Email", "org_email")}</label
                ><input
                  type="email"
                  bind:value={form.org_email}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.org_email
                      ? "border-red-500"
                      : "border-gray-300")}
                />
              </div>
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired("Organization Phone", "org_phone")}</label
                ><input
                  type="tel"
                  bind:value={form.org_phone}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.org_phone
                      ? "border-red-500"
                      : "border-gray-300")}
                />
              </div>
            </div>
          {/if}

          <!-- STEP 1: Address -->
          {#if addStep === 1}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="md:col-span-2">
                <label class="block text-sm font-medium"
                  >{labelWithRequired("Street", "org_address")}</label
                ><input
                  type="text"
                  bind:value={form.org_address}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.org_address
                      ? "border-red-500"
                      : "border-gray-300")}
                />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium"
                  >{labelWithRequired("Street 2", "org_address2")}</label
                ><input
                  type="text"
                  bind:value={form.org_address2}
                  class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                />
              </div>
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired("City", "org_city")}</label
                ><input
                  type="text"
                  bind:value={form.org_city}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.org_city
                      ? "border-red-500"
                      : "border-gray-300")}
                />
              </div>
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired("State", "org_state")}</label
                ><input
                  type="text"
                  maxlength="2"
                  bind:value={form.org_state}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.org_state
                      ? "border-red-500"
                      : "border-gray-300")}
                />
              </div>
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired("Zip Code", "org_zip_code")}</label
                ><input
                  type="text"
                  bind:value={form.org_zip_code}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.org_zip_code
                      ? "border-red-500"
                      : "border-gray-300")}
                />
              </div>
            </div>
          {/if}

          <!-- STEP 2: Operations (Working Hours UI + others) -->
          {#if addStep === 2}
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium"
                  >Working Hours <span class="text-red-600">*</span></label
                >
                <div class="mt-2 border rounded-lg overflow-hidden">
                  <table class="w-full text-sm">
                    <thead class="bg-gray-50">
                      <tr>
                        <th class="px-3 py-2 text-left">Day</th>
                        <th class="px-3 py-2 text-left">Open</th>
                        <th class="px-3 py-2 text-left">Start</th>
                        <th class="px-3 py-2 text-left">End</th>
                      </tr>
                    </thead>
                    <tbody>
                      {#each DAYS as d}
                        <tr class="border-t">
                          <td class="px-3 py-2">{d.label}</td>
                          <td class="px-3 py-2">
                            <input
                              type="checkbox"
                              bind:checked={whAdd[d.code].open}
                            />
                          </td>
                          <td class="px-3 py-2">
                            <select
                              class="border rounded px-2 py-1"
                              bind:value={whAdd[d.code].start}
                              disabled={!whAdd[d.code].open}
                            >
                              {#each HOUR_OPTS as h}<option value={h}
                                  >{h}:00</option
                                >{/each}
                            </select>
                          </td>
                          <td class="px-3 py-2">
                            <select
                              class="border rounded px-2 py-1"
                              bind:value={whAdd[d.code].end}
                              disabled={!whAdd[d.code].open}
                            >
                              {#each HOUR_OPTS as h}<option value={h}
                                  >{h}:00</option
                                >{/each}
                            </select>
                          </td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
                {#if fieldErrors.working_hours}<p
                    class="text-xs text-red-600 mt-1"
                  >
                    {fieldErrors.working_hours}
                  </p>{/if}
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium"
                    >{labelWithRequired("Days Off", "days_off")}</label
                  >
                  <input
                    type="text"
                    placeholder="MM/DD, MM/DD"
                    bind:value={form.days_off}
                    class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                  />
                  <p class="text-xs text-gray-500 mt-1">
                    Will render like: {formatDaysOff(form.days_off).join(", ")}
                  </p>
                </div>
                <div>
                  <label class="block text-sm font-medium"
                    >{labelWithRequired(
                      "Rides Phone",
                      "rides_phone_number"
                    )}</label
                  >
                  <input
                    type="tel"
                    bind:value={form.rides_phone_number}
                    class={"mt-1 w-full border rounded-md px-3 py-2 " +
                      (fieldErrors.rides_phone_number
                        ? "border-red-500"
                        : "border-gray-300")}
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium"
                    >{labelWithRequired(
                      "Client Minimum Age",
                      "client_min_age"
                    )}</label
                  >
                  <input
                    type="number"
                    bind:value={form.client_min_age}
                    class={"mt-1 w-full border rounded-md px-3 py-2 " +
                      (fieldErrors.client_min_age
                        ? "border-red-500"
                        : "border-gray-300")}
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium"
                    >{labelWithRequired(
                      "Min Days in Advance",
                      "min_days_in_advance_for_ride_requests"
                    )}</label
                  >
                  <input
                    type="number"
                    bind:value={form.min_days_in_advance_for_ride_requests}
                    class={"mt-1 w-full border rounded-md px-3 py-2 " +
                      (fieldErrors.min_days_in_advance_for_ride_requests
                        ? "border-red-500"
                        : "border-gray-300")}
                  />
                </div>
              </div>
            </div>
          {/if}

          <!-- STEP 3: Primary Contact -->
          {#if addStep === 3}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired("Name", "primary_contact_name")}</label
                ><input
                  type="text"
                  bind:value={form.primary_contact_name}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.primary_contact_name
                      ? "border-red-500"
                      : "border-gray-300")}
                />
              </div>
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired("Email", "primary_contact_email")}</label
                ><input
                  type="email"
                  bind:value={form.primary_contact_email}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.primary_contact_email
                      ? "border-red-500"
                      : "border-gray-300")}
                />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium"
                  >{labelWithRequired(
                    "Address",
                    "primary_contact_address"
                  )}</label
                ><input
                  type="text"
                  bind:value={form.primary_contact_address}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.primary_contact_address
                      ? "border-red-500"
                      : "border-gray-300")}
                />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium"
                  >{labelWithRequired(
                    "Address 2",
                    "primary_contact_address2"
                  )}</label
                ><input
                  type="text"
                  bind:value={form.primary_contact_address2}
                  class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                />
              </div>
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired("City", "primary_contact_city")}</label
                ><input
                  type="text"
                  bind:value={form.primary_contact_city}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.primary_contact_city
                      ? "border-red-500"
                      : "border-gray-300")}
                />
              </div>
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired("State", "primary_contact_state")}</label
                ><input
                  type="text"
                  maxlength="2"
                  bind:value={form.primary_contact_state}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.primary_contact_state
                      ? "border-red-500"
                      : "border-gray-300")}
                />
              </div>
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired("Zip", "primary_contact_zipcode")}</label
                ><input
                  type="text"
                  bind:value={form.primary_contact_zipcode}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.primary_contact_zipcode
                      ? "border-red-500"
                      : "border-gray-300")}
                />
              </div>
            </div>
          {/if}

          <!-- STEP 4: Secondary Contact (optional) -->
          {#if addStep === 4}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired("Name", "secondary_contact_name")}</label
                ><input
                  type="text"
                  bind:value={form.secondary_contact_name}
                  class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                />
              </div>
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired(
                    "Email",
                    "secondary_contact_email"
                  )}</label
                ><input
                  type="email"
                  bind:value={form.secondary_contact_email}
                  class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium"
                  >{labelWithRequired(
                    "Address",
                    "secondary_contact_address"
                  )}</label
                ><input
                  type="text"
                  bind:value={form.secondary_contact_address}
                  class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium"
                  >{labelWithRequired(
                    "Address 2",
                    "secondary_contact_address2"
                  )}</label
                ><input
                  type="text"
                  bind:value={form.secondary_contact_address2}
                  class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                />
              </div>
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired("City", "secondary_contact_city")}</label
                ><input
                  type="text"
                  bind:value={form.secondary_contact_city}
                  class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                />
              </div>
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired(
                    "State",
                    "secondary_contact_state"
                  )}</label
                ><input
                  type="text"
                  maxlength="2"
                  bind:value={form.secondary_contact_state}
                  class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                />
              </div>
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired(
                    "Zip",
                    "secondary_contact_zipcode"
                  )}</label
                ><input
                  type="text"
                  bind:value={form.secondary_contact_zipcode}
                  class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                />
              </div>
            </div>
          {/if}

          <!-- STEP 5: Login -->
          {#if addStep === 5}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!--  <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired(
                    "Username Format",
                    "username_format"
                  )}</label
                >
                <input
                  type="text"
                  bind:value={form.username_format}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.username_format
                      ? "border-red-500"
                      : "border-gray-300")}
                />
                <p class="mt-1 text-xs text-gray-500">
                  {usernameExample(form.username_format, "John", "Doe")}
                </p>
              </div> -->
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired(
                    "Initial Password",
                    "user_initial_password"
                  )}</label
                >
                <input
                  type="text"
                  bind:value={form.user_initial_password}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.user_initial_password
                      ? "border-red-500"
                      : "border-gray-300")}
                />
              </div>
            </div>
          {/if}

          <!-- STEP 6: Review -->
          {#if addStep === 6}
            <div class="text-sm text-gray-700 space-y-2">
              <p class="font-medium">
                Please review your entries. You can go Back to make changes.
              </p>
              <p><span class="font-medium">Name:</span> {form.name}</p>
              <p><span class="font-medium">Status:</span> {form.org_status}</p>
              <p>
                <span class="font-medium">Website:</span>
                {form.org_website}
              </p>
              <p>
                <span class="font-medium">Email/Phone:</span>
                {form.org_email} / {form.org_phone}
              </p>
              <p>
                <span class="font-medium">Address:</span>
                {form.org_address}
                {form.org_address2 ? `, ${form.org_address2}` : ""}, {form.org_city},
                {form.org_state}
                {form.org_zip_code}
              </p>
              <p>
                <span class="font-medium">Working Hours:</span>
                {packWorkingHours(whAdd) || "—"}
              </p>
              <p>
                <span class="font-medium">Days Off:</span>
                {formatDaysOff(form.days_off).join(", ") || "—"}
              </p>
              <p>
                <span class="font-medium">Rides Phone:</span>
                {form.rides_phone_number}
              </p>
              <p>
                <span class="font-medium">Client Min Age / Min Days:</span>
                {form.client_min_age} / {form.min_days_in_advance_for_ride_requests}
              </p>
              <p>
                <span class="font-medium">Primary Contact:</span>
                {form.primary_contact_name} ({form.primary_contact_email})
              </p>
              <!--  <p>
                <span class="font-medium">Username Format:</span>
                {form.username_format}
              </p> -->
            </div>
          {/if}

          <!-- Wizard controls -->
          <div class="flex justify-between pt-2">
            <button
              type="button"
              onclick={addStep === 0 ? closeModals : prevAddStep}
              class="px-4 py-2 border border-gray-300 rounded-md"
            >
              {addStep === 0 ? "Cancel" : "Back"}
            </button>
            {#if addStep < STEP_LABELS.length - 1}
              <button
                type="button"
                onclick={nextAddStep}
                class="px-4 py-2 bg-blue-600 text-white rounded-md">Next</button
              >
            {:else}
              <button
                type="submit"
                class="px-4 py-2 bg-blue-600 text-white rounded-md inline-flex items-center gap-2"
              >
                <Save class="w-4 h-4" /><span>Add Organization</span>
              </button>
            {/if}
          </div>
        </form>
      </div>
    </div>
  {/if}

  <!-- EDIT Organization Wizard -->
  {#if showEditModal}
    <div
      class="fixed inset-0 bg-gray-600/50 overflow-y-auto h-full w-full z-50"
    >
      <div
        class="relative top-10 mx-auto p-5 w-full max-w-4xl shadow-lg rounded-2xl bg-white"
      >
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-xl font-semibold">Edit Organization</h3>
          <button
            onclick={closeModals}
            class="text-gray-400 hover:text-gray-600"
            ><X class="w-5 h-5" /></button
          >
        </div>
        <p class="text-sm text-gray-500 mb-4">
          <span class="text-red-600">*</span> indicates required fields.
        </p>

        <div class="mb-4 text-sm text-gray-700">
          Step {editStep + 1} of {STEP_LABELS.length}:
          <span class="font-medium">{STEP_LABELS[editStep]}</span>
        </div>

        <form onsubmit={updateOrganization} class="space-y-6">
          <!-- Steps mirror Add but bind to whEdit and same form -->
          {#if editStep === 0}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired("Name", "name")}</label
                ><input
                  type="text"
                  bind:value={form.name}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.name ? "border-red-500" : "border-gray-300")}
                />
              </div>
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired(
                    "Organization Status",
                    "org_status"
                  )}</label
                ><select
                  bind:value={form.org_status}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.org_status
                      ? "border-red-500"
                      : "border-gray-300")}
                  ><option value="">—</option><option value="Active"
                    >Active</option
                  ><option value="Inactive">Inactive</option></select
                >
              </div>
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired("Website", "org_website")}</label
                ><input
                  type="text"
                  bind:value={form.org_website}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.org_website
                      ? "border-red-500"
                      : "border-gray-300")}
                />
              </div>
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired("Organization Email", "org_email")}</label
                ><input
                  type="email"
                  bind:value={form.org_email}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.org_email
                      ? "border-red-500"
                      : "border-gray-300")}
                />
              </div>
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired("Organization Phone", "org_phone")}</label
                ><input
                  type="tel"
                  bind:value={form.org_phone}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.org_phone
                      ? "border-red-500"
                      : "border-gray-300")}
                />
              </div>
            </div>
          {/if}

          {#if editStep === 1}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="md:col-span-2">
                <label class="block text-sm font-medium"
                  >{labelWithRequired("Street", "org_address")}</label
                ><input
                  type="text"
                  bind:value={form.org_address}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.org_address
                      ? "border-red-500"
                      : "border-gray-300")}
                />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium"
                  >{labelWithRequired("Street 2", "org_address2")}</label
                ><input
                  type="text"
                  bind:value={form.org_address2}
                  class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                />
              </div>
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired("City", "org_city")}</label
                ><input
                  type="text"
                  bind:value={form.org_city}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.org_city
                      ? "border-red-500"
                      : "border-gray-300")}
                />
              </div>
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired("State", "org_state")}</label
                ><input
                  type="text"
                  maxlength="2"
                  bind:value={form.org_state}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.org_state
                      ? "border-red-500"
                      : "border-gray-300")}
                />
              </div>
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired("Zip Code", "org_zip_code")}</label
                ><input
                  type="text"
                  bind:value={form.org_zip_code}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.org_zip_code
                      ? "border-red-500"
                      : "border-gray-300")}
                />
              </div>
            </div>
          {/if}

          {#if editStep === 2}
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium"
                  >Working Hours <span class="text-red-600">*</span></label
                >
                <div class="mt-2 border rounded-lg overflow-hidden">
                  <table class="w-full text-sm">
                    <thead class="bg-gray-50">
                      <tr>
                        <th class="px-3 py-2 text-left">Day</th>
                        <th class="px-3 py-2 text-left">Open</th>
                        <th class="px-3 py-2 text-left">Start</th>
                        <th class="px-3 py-2 text-left">End</th>
                      </tr>
                    </thead>
                    <tbody>
                      {#each DAYS as d}
                        <tr class="border-t">
                          <td class="px-3 py-2">{d.label}</td>
                          <td class="px-3 py-2"
                            ><input
                              type="checkbox"
                              bind:checked={whEdit[d.code].open}
                            /></td
                          >
                          <td class="px-3 py-2">
                            <select
                              class="border rounded px-2 py-1"
                              bind:value={whEdit[d.code].start}
                              disabled={!whEdit[d.code].open}
                            >
                              {#each HOUR_OPTS as h}<option value={h}
                                  >{h}:00</option
                                >{/each}
                            </select>
                          </td>
                          <td class="px-3 py-2">
                            <select
                              class="border rounded px-2 py-1"
                              bind:value={whEdit[d.code].end}
                              disabled={!whEdit[d.code].open}
                            >
                              {#each HOUR_OPTS as h}<option value={h}
                                  >{h}:00</option
                                >{/each}
                            </select>
                          </td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
                {#if fieldErrors.working_hours}<p
                    class="text-xs text-red-600 mt-1"
                  >
                    {fieldErrors.working_hours}
                  </p>{/if}
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium"
                    >{labelWithRequired("Days Off", "days_off")}</label
                  >
                  <input
                    type="text"
                    placeholder="MM/DD, MM/DD"
                    bind:value={form.days_off}
                    class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                  />
                  <p class="text-xs text-gray-500 mt-1">
                    Will render like: {formatDaysOff(form.days_off).join(", ")}
                  </p>
                </div>
                <div>
                  <label class="block text-sm font-medium"
                    >{labelWithRequired(
                      "Rides Phone",
                      "rides_phone_number"
                    )}</label
                  >
                  <input
                    type="tel"
                    bind:value={form.rides_phone_number}
                    class={"mt-1 w-full border rounded-md px-3 py-2 " +
                      (fieldErrors.rides_phone_number
                        ? "border-red-500"
                        : "border-gray-300")}
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium"
                    >{labelWithRequired(
                      "Client Minimum Age",
                      "client_min_age"
                    )}</label
                  >
                  <input
                    type="number"
                    bind:value={form.client_min_age}
                    class={"mt-1 w-full border rounded-md px-3 py-2 " +
                      (fieldErrors.client_min_age
                        ? "border-red-500"
                        : "border-gray-300")}
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium"
                    >{labelWithRequired(
                      "Min Days in Advance",
                      "min_days_in_advance_for_ride_requests"
                    )}</label
                  >
                  <input
                    type="number"
                    bind:value={form.min_days_in_advance_for_ride_requests}
                    class={"mt-1 w-full border rounded-md px-3 py-2 " +
                      (fieldErrors.min_days_in_advance_for_ride_requests
                        ? "border-red-500"
                        : "border-gray-300")}
                  />
                </div>
              </div>
            </div>
          {/if}

          {#if editStep === 3}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired("Name", "primary_contact_name")}</label
                ><input
                  type="text"
                  bind:value={form.primary_contact_name}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.primary_contact_name
                      ? "border-red-500"
                      : "border-gray-300")}
                />
              </div>
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired("Email", "primary_contact_email")}</label
                ><input
                  type="email"
                  bind:value={form.primary_contact_email}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.primary_contact_email
                      ? "border-red-500"
                      : "border-gray-300")}
                />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium"
                  >{labelWithRequired(
                    "Address",
                    "primary_contact_address"
                  )}</label
                ><input
                  type="text"
                  bind:value={form.primary_contact_address}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.primary_contact_address
                      ? "border-red-500"
                      : "border-gray-300")}
                />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium"
                  >{labelWithRequired(
                    "Address 2",
                    "primary_contact_address2"
                  )}</label
                ><input
                  type="text"
                  bind:value={form.primary_contact_address2}
                  class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                />
              </div>
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired("City", "primary_contact_city")}</label
                ><input
                  type="text"
                  bind:value={form.primary_contact_city}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.primary_contact_city
                      ? "border-red-500"
                      : "border-gray-300")}
                />
              </div>
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired("State", "primary_contact_state")}</label
                ><input
                  type="text"
                  maxlength="2"
                  bind:value={form.primary_contact_state}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.primary_contact_state
                      ? "border-red-500"
                      : "border-gray-300")}
                />
              </div>
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired("Zip", "primary_contact_zipcode")}</label
                ><input
                  type="text"
                  bind:value={form.primary_contact_zipcode}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.primary_contact_zipcode
                      ? "border-red-500"
                      : "border-gray-300")}
                />
              </div>
            </div>
          {/if}

          {#if editStep === 4}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired("Name", "secondary_contact_name")}</label
                ><input
                  type="text"
                  bind:value={form.secondary_contact_name}
                  class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                />
              </div>
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired(
                    "Email",
                    "secondary_contact_email"
                  )}</label
                ><input
                  type="email"
                  bind:value={form.secondary_contact_email}
                  class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium"
                  >{labelWithRequired(
                    "Address",
                    "secondary_contact_address"
                  )}</label
                ><input
                  type="text"
                  bind:value={form.secondary_contact_address}
                  class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium"
                  >{labelWithRequired(
                    "Address 2",
                    "secondary_contact_address2"
                  )}</label
                ><input
                  type="text"
                  bind:value={form.secondary_contact_address2}
                  class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                />
              </div>
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired("City", "secondary_contact_city")}</label
                ><input
                  type="text"
                  bind:value={form.secondary_contact_city}
                  class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                />
              </div>
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired(
                    "State",
                    "secondary_contact_state"
                  )}</label
                ><input
                  type="text"
                  maxlength="2"
                  bind:value={form.secondary_contact_state}
                  class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                />
              </div>
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired(
                    "Zip",
                    "secondary_contact_zipcode"
                  )}</label
                ><input
                  type="text"
                  bind:value={form.secondary_contact_zipcode}
                  class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                />
              </div>
            </div>
          {/if}

          {#if editStep === 5}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired(
                    "Username Format",
                    "username_format"
                  )}</label
                >
                <input
                  type="text"
                  bind:value={form.username_format}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.username_format
                      ? "border-red-500"
                      : "border-gray-300")}
                />
                <p class="mt-1 text-xs text-gray-500">
                  {usernameExample(form.username_format, "John", "Doe")}
                </p>
              </div> -->
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired(
                    "Initial Password",
                    "user_initial_password"
                  )}</label
                >
                <input
                  type="text"
                  bind:value={form.user_initial_password}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.user_initial_password
                      ? "border-red-500"
                      : "border-gray-300")}
                />
              </div>
            </div>
          {/if}

          {#if editStep === 6}
            <div class="text-sm text-gray-700 space-y-2">
              <p class="font-medium">Review and save changes.</p>
              <p><span class="font-medium">Name:</span> {form.name}</p>
              <p><span class="font-medium">Status:</span> {form.org_status}</p>
              <p>
                <span class="font-medium">Website:</span>
                {form.org_website}
              </p>
              <p>
                <span class="font-medium">Email/Phone:</span>
                {form.org_email} / {form.org_phone}
              </p>
              <p>
                <span class="font-medium">Address:</span>
                {form.org_address}
                {form.org_address2 ? `, ${form.org_address2}` : ""}, {form.org_city},
                {form.org_state}
                {form.org_zip_code}
              </p>
              <p>
                <span class="font-medium">Working Hours:</span>
                {packWorkingHours(whEdit) || "—"}
              </p>
              <p>
                <span class="font-medium">Days Off:</span>
                {formatDaysOff(form.days_off).join(", ") || "—"}
              </p>
              <p>
                <span class="font-medium">Rides Phone:</span>
                {form.rides_phone_number}
              </p>
              <p>
                <span class="font-medium">Client Min Age / Min Days:</span>
                {form.client_min_age} / {form.min_days_in_advance_for_ride_requests}
              </p>
              <p>
                <span class="font-medium">Primary Contact:</span>
                {form.primary_contact_name} ({form.primary_contact_email})
              </p>
              <!-- <p>
                <span class="font-medium">Username Format:</span>
                {form.username_format}
              </p> -->
            </div>
          {/if}

          <div class="flex justify-between pt-2">
            <button
              type="button"
              onclick={editStep === 0 ? closeModals : prevEditStep}
              class="px-4 py-2 border border-gray-300 rounded-md"
            >
              {editStep === 0 ? "Cancel" : "Back"}
            </button>
            {#if editStep < STEP_LABELS.length - 1}
              <button
                type="button"
                onclick={nextEditStep}
                class="px-4 py-2 bg-blue-600 text-white rounded-md">Next</button
              >
            {:else}
              <button
                type="submit"
                class="px-4 py-2 bg-blue-600 text-white rounded-md inline-flex items-center gap-2"
              >
                <Save class="w-4 h-4" /><span>Save Changes</span>
              </button>
            {/if}
          </div>
        </form>
      </div>
    </div>
  {/if}
</div>
