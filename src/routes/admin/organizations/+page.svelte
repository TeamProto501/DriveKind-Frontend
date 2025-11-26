<script lang="ts">
  import {
    Building2,
    Plus,
    Search,
    Edit,
    Save,
    X,
    Mail,
    Phone,
    MapPin,
    Link as LinkIcon,
  } from "@lucide/svelte";
  import { enhance } from "$app/forms";
  import { invalidateAll } from "$app/navigation";
  import type { PageData, ActionData } from "./$types";

  // Import constants and helpers from server
  import {
    type OrgRow,
    type WorkingHoursUI,
    type DayCode,
    DAYS,
    HOUR_OPTS_12,
    PERIOD_OPTS,
    STEP_LABELS,
    FIELD_LABELS,
    REQUIRED_BY_STEP,
    formatDaysOff,
    defaultWorkingHoursUI,
    parseWorkingHoursToUI,
    packWorkingHours,
    hourTo24,
    getOrgStatus,
    labelWithRequired,
  } from "./+page.server";

  // ==================== PROPS ====================
  let { data, form: formResult }: { data: PageData; form: ActionData } = $props();

  // ==================== REACTIVE DATA ====================
  let organizations = $derived((data.organizations as OrgRow[]) || []);
  let searchTerm = $state("");

  let filteredOrganizations = $derived.by(() => {
    if (!searchTerm.trim()) return organizations;
    const q = searchTerm.toLowerCase();
    return organizations.filter(
      (org) =>
        (org.name ?? "").toLowerCase().includes(q) ||
        (org.org_email ?? "").toLowerCase().includes(q) ||
        (org.org_city ?? "").toLowerCase().includes(q) ||
        (org.org_state ?? "").toLowerCase().includes(q)
    );
  });

  // ==================== FORM STATE ====================
  let formState = $state({
    name: "",
    org_status: "",
    org_email: "",
    org_phone: "",
    org_website: "",
    org_address: "",
    org_address2: "",
    org_city: "",
    org_state: "",
    org_zip_code: "",
    working_hours: "",
    days_off: "",
    rides_phone_number: "",
    client_min_age: "",
    min_days_in_advance_for_ride_requests: "",
    client_max_weekly_rides: "",
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
    user_initial_password: "",
  });

  // ==================== MODAL STATE ====================
  let showAddModal = $state(false);
  let showEditModal = $state(false);
  let showDeleteModal = $state(false);
  let showPasswordModal = $state(false);
  let selectedOrg: OrgRow | null = $state(null);
  let editingOrg: OrgRow | null = $state(null);

  // ==================== WIZARD STATE ====================
  let addStep = $state(0);
  let editStep = $state(0);
  let whAdd = $state<WorkingHoursUI>(defaultWorkingHoursUI());
  let whEdit = $state<WorkingHoursUI>(defaultWorkingHoursUI());
  let fieldErrors = $state<Record<string, string>>({});

  // ==================== MESSAGE STATE ====================
  let message = $state("");
  let messageSuccess = $state(false);

  // ==================== PASSWORD STATE ====================
  let passwordInput = $state("");
  let passwordError = $state("");

  // ==================== MESSAGE HELPER ====================
  function showMessage(msg: string, success: boolean) {
    message = msg;
    messageSuccess = success;
    setTimeout(() => {
      message = "";
    }, 5000);
  }

  // ==================== FORM RESULT HANDLER ====================
  $effect(() => {
    if (formResult?.success) {
      showMessage(formResult.message || "Operation successful!", true);
      closeModals();
      invalidateAll();
    } else if (formResult?.error) {
      showMessage(formResult.error, false);
    }
  });

  // ==================== VALIDATION ====================
  function validateRequiredForStep(stepIdx: number): string[] {
    fieldErrors = {};
    const keys = REQUIRED_BY_STEP[stepIdx] ?? [];
    const missing: string[] = [];

    for (const key of keys) {
      const val = (formState as any)[key];
      const empty = val == null || String(val).trim() === "";
      if (empty) {
        missing.push(key);
        fieldErrors[key] = "Required";
      }
    }

    // Also require at least one open day in step 2
    if (stepIdx === 2) {
      const wh = showEditModal ? whEdit : whAdd;
      const anyOpen = DAYS.some((d) => wh[d.code].open);
      if (!anyOpen) {
        missing.push("working_hours");
        fieldErrors["working_hours"] = "At least one day must be open";
      }
    }

    return missing;
  }

  // ==================== MODAL FUNCTIONS ====================
  function resetForm() {
    for (const k of Object.keys(formState)) {
      (formState as any)[k] = "";
    }
    fieldErrors = {};
  }

  function openAddModal() {
    resetForm();
    addStep = 0;
    whAdd = defaultWorkingHoursUI();
    showAddModal = true;
  }

  function openEditModal(org: OrgRow) {
    editingOrg = org;

    for (const k of Object.keys(formState)) {
      let v = (org as any)[k];
      if (k === "days_off" && (v == null || v === "")) {
        v = (org as any)["days-off"];
      }
      (formState as any)[k] = v == null ? "" : String(v);
    }

    // Normalize org_status
    const rawStatus = (org.org_status ?? org.org_status_enum ?? org.status ?? "") as string;
    const s = String(rawStatus).trim().toLowerCase();
    formState.org_status = s === "active" ? "Active" : "Inactive";

    // Seed working-hours UI from existing DB value
    whEdit = parseWorkingHoursToUI(org.working_hours ?? "");

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

  // ==================== STEP NAVIGATION ====================
  function nextAddStep() {
    const missing = validateRequiredForStep(addStep);
    if (missing.length) {
      const names = missing.map((k) => FIELD_LABELS[k] ?? k).join(", ");
      showMessage(`Please fill in: ${names}.`, false);
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
      showMessage(`Please fill in: ${names}.`, false);
      return;
    }
    if (editStep < STEP_LABELS.length - 1) editStep += 1;
  }

  function prevEditStep() {
    if (editStep > 0) editStep -= 1;
  }

  // ==================== WORKING HOURS HELPERS ====================
  function getPackedWorkingHours(isEdit: boolean): string {
    return packWorkingHours(isEdit ? whEdit : whAdd);
  }

  function handleHourChange(dayCode: DayCode, field: "start" | "end", isEdit: boolean) {
    const wh = isEdit ? whEdit : whAdd;
    if (field === "start") {
      wh[dayCode].start = hourTo24(wh[dayCode].startHour, wh[dayCode].startPeriod);
    } else {
      wh[dayCode].end = hourTo24(wh[dayCode].endHour, wh[dayCode].endPeriod);
    }
  }

  // ==================== FORM SUBMISSION VALIDATION ====================
  function validateAllSteps(): boolean {
    for (let s = 0; s <= 5; s++) {
      const miss = validateRequiredForStep(s);
      if (miss.length) {
        if (showEditModal) {
          editStep = s;
        } else {
          addStep = s;
        }
        const names = miss.map((k) => FIELD_LABELS[k] ?? k).join(", ");
        showMessage(`Please fill in: ${names}.`, false);
        return false;
      }
    }
    return true;
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
            <h1 class="text-2xl font-bold text-gray-900">Organizations Management</h1>
            <p class="text-sm text-gray-600">Manage organizations in the database</p>
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
  {#if message}
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div
        class="rounded-md p-4 {messageSuccess
          ? 'bg-green-50 border border-green-200'
          : 'bg-red-50 border border-red-200'}"
      >
        <p class="text-base font-medium {messageSuccess ? 'text-green-800' : 'text-red-800'}">
          {message}
        </p>
      </div>
    </div>
  {/if}

  <!-- Main Content -->
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
    <!-- Search -->
    <div class="mb-6">
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div class="flex items-center space-x-4">
          <div class="flex-1 max-w-md">
            <div class="relative">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search organizations..."
                bind:value={searchTerm}
                class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div class="text-sm text-gray-500">
            {filteredOrganizations.length} organization{filteredOrganizations.length !== 1 ? "s" : ""} found
          </div>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200">
      {#if filteredOrganizations.length === 0}
        <div class="p-8 text-center">
          <Building2 class="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 class="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? "No organizations found" : "No organizations yet"}
          </h3>
          <p class="text-gray-500 mb-4">
            {searchTerm ? "Try adjusting your search terms." : "Get started by adding your first organization."}
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
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Organization</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {#each filteredOrganizations as org (org.org_id)}
                <tr class="hover:bg-gray-50">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="space-y-0.5">
                      <div class="text-sm font-medium text-gray-900 flex items-center gap-2">
                        {#if org.org_website}
                          <a
                            href={/^https?:\/\//.test(org.org_website) ? org.org_website : `https://${org.org_website}`}
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
                        <div class="text-gray-500">{org.org_zip_code ?? ""}</div>
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
                      <form method="POST" action="?/toggleStatus" use:enhance>
                        <input type="hidden" name="org_id" value={org.org_id} />
                        <input type="hidden" name="current_status" value={getOrgStatus(org)} />
                        <button
                          type="submit"
                          class={"inline-flex items-center px-3 py-2 rounded-md text-white " +
                            (getOrgStatus(org) === "Active"
                              ? "bg-red-600 hover:bg-red-700"
                              : "bg-green-600 hover:bg-green-700")}
                        >
                          {#if getOrgStatus(org) === "Active"}
                            <X class="w-4 h-4 mr-1" /> Deactivate
                          {:else}
                            <Save class="w-4 h-4 mr-1" /> Activate
                          {/if}
                        </button>
                      </form>
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

  <!-- Delete Confirmation Modal -->
  {#if showDeleteModal && selectedOrg}
    <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-medium text-gray-900">Delete Organization</h3>
            <button onclick={closeModals} class="text-gray-400 hover:text-gray-600">
              <X class="w-5 h-5" />
            </button>
          </div>
          <p class="text-sm text-gray-600 mb-6">
            Are you sure you want to delete <strong>{selectedOrg.name}</strong>? This action cannot be undone.
          </p>
          <div class="flex justify-end gap-3">
            <button onclick={closeModals} class="px-4 py-2 border border-gray-300 rounded-md">Cancel</button>
            <button onclick={openPasswordModal} class="px-4 py-2 bg-red-600 text-white rounded-md">Yes, Delete</button>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Password Confirmation Modal -->
  {#if showPasswordModal && selectedOrg}
    <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-medium text-gray-900">Confirm Deletion</h3>
            <button onclick={closeModals} class="text-gray-400 hover:text-gray-600">
              <X class="w-5 h-5" />
            </button>
          </div>
          <form
            method="POST"
            action="?/deleteOrganization"
            use:enhance={() => {
              return async ({ result }) => {
                if (result.type === "failure") {
                  passwordError = (result.data as any)?.error || "Error deleting organization";
                } else {
                  closeModals();
                  invalidateAll();
                }
              };
            }}
          >
            <input type="hidden" name="org_id" value={selectedOrg.org_id} />
            <div class="mb-6">
              <p class="text-sm text-gray-600 mb-4">
                Enter your password to delete <strong>{selectedOrg.name}</strong>.
              </p>
              <label class="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                name="password"
                bind:value={passwordInput}
                class="w-full px-3 py-2 border {passwordError ? 'border-red-300' : 'border-gray-300'} rounded-md"
              />
              {#if passwordError}
                <p class="mt-2 text-sm text-red-600">{passwordError}</p>
              {/if}
            </div>
            <div class="flex justify-end gap-3">
              <button type="button" onclick={closeModals} class="px-4 py-2 border border-gray-300 rounded-md">
                Cancel
              </button>
              <button type="submit" class="px-4 py-2 bg-red-600 text-white rounded-md">Delete Organization</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  {/if}

  <!-- ADD Organization Wizard -->
  {#if showAddModal}
    <div class="fixed inset-0 bg-gray-600/50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-10 mx-auto p-5 w-full max-w-4xl shadow-lg rounded-2xl bg-white">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-xl font-semibold">Add Organization</h3>
          <button onclick={closeModals} class="text-gray-400 hover:text-gray-600">
            <X class="w-5 h-5" />
          </button>
        </div>
        <p class="text-sm text-gray-500 mb-4">
          <span class="text-red-600">*</span> indicates required fields.
        </p>

        <!-- Step indicator -->
        <div class="mb-4 text-sm text-gray-700">
          Step {addStep + 1} of {STEP_LABELS.length}:
          <span class="font-medium">{STEP_LABELS[addStep]}</span>
        </div>

        <form
          method="POST"
          action="?/addOrganization"
          use:enhance={() => {
            if (!validateAllSteps()) {
              return async () => {};
            }
            return async ({ result }) => {
              if (result.type === "success") {
                showMessage("Organization added successfully!", true);
                closeModals();
                invalidateAll();
              } else if (result.type === "failure") {
                showMessage((result.data as any)?.error || "Failed to add organization", false);
              }
            };
          }}
          class="space-y-6"
        >
          <!-- Hidden fields for form submission -->
          <input type="hidden" name="working_hours" value={getPackedWorkingHours(false)} />

          <!-- STEP 0: Overview -->
          {#if addStep === 0}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium">{labelWithRequired("Name", "name")}</label>
                <input
                  type="text"
                  name="name"
                  bind:value={formState.name}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " + (fieldErrors.name ? "border-red-500" : "border-gray-300")}
                />
              </div>
              <div>
                <label class="block text-sm font-medium">{labelWithRequired("Organization Status", "org_status")}</label>
                <select
                  name="org_status"
                  bind:value={formState.org_status}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " + (fieldErrors.org_status ? "border-red-500" : "border-gray-300")}
                >
                  <option value="">—</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium">{labelWithRequired("Website", "org_website")}</label>
                <input
                  type="text"
                  name="org_website"
                  bind:value={formState.org_website}
                  class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                />
              </div>
              <div>
                <label class="block text-sm font-medium">{labelWithRequired("Organization Email", "org_email")}</label>
                <input
                  type="email"
                  name="org_email"
                  bind:value={formState.org_email}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " + (fieldErrors.org_email ? "border-red-500" : "border-gray-300")}
                />
              </div>
              <div>
                <label class="block text-sm font-medium">{labelWithRequired("Organization Phone", "org_phone")}</label>
                <input
                  type="tel"
                  name="org_phone"
                  bind:value={formState.org_phone}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " + (fieldErrors.org_phone ? "border-red-500" : "border-gray-300")}
                />
              </div>
            </div>
          {/if}

          <!-- STEP 1: Address -->
          {#if addStep === 1}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="md:col-span-2">
                <label class="block text-sm font-medium">{labelWithRequired("Street", "org_address")}</label>
                <input
                  type="text"
                  name="org_address"
                  bind:value={formState.org_address}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " + (fieldErrors.org_address ? "border-red-500" : "border-gray-300")}
                />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium">{labelWithRequired("Street 2", "org_address2")}</label>
                <input
                  type="text"
                  name="org_address2"
                  bind:value={formState.org_address2}
                  class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                />
              </div>
              <div>
                <label class="block text-sm font-medium">{labelWithRequired("City", "org_city")}</label>
                <input
                  type="text"
                  name="org_city"
                  bind:value={formState.org_city}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " + (fieldErrors.org_city ? "border-red-500" : "border-gray-300")}
                />
              </div>
              <div>
                <label class="block text-sm font-medium">{labelWithRequired("State", "org_state")}</label>
                <input
                  type="text"
                  name="org_state"
                  maxlength="2"
                  bind:value={formState.org_state}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " + (fieldErrors.org_state ? "border-red-500" : "border-gray-300")}
                />
              </div>
              <div>
                <label class="block text-sm font-medium">{labelWithRequired("Zip Code", "org_zip_code")}</label>
                <input
                  type="text"
                  name="org_zip_code"
                  bind:value={formState.org_zip_code}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " + (fieldErrors.org_zip_code ? "border-red-500" : "border-gray-300")}
                />
              </div>
            </div>
          {/if}

          <!-- STEP 2: Operations -->
          {#if addStep === 2}
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium">Working Hours <span class="text-red-600">*</span></label>
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
                            <input type="checkbox" bind:checked={whAdd[d.code].open} />
                          </td>
                          <td class="px-3 py-2">
                            <div class="flex gap-1">
                              <select
                                class="border rounded px-2 py-1"
                                bind:value={whAdd[d.code].startHour}
                                disabled={!whAdd[d.code].open}
                                onchange={() => handleHourChange(d.code, "start", false)}
                              >
                                {#each HOUR_OPTS_12 as h}<option value={h}>{h}</option>{/each}
                              </select>
                              <select
                                class="border rounded px-2 py-1"
                                bind:value={whAdd[d.code].startPeriod}
                                disabled={!whAdd[d.code].open}
                                onchange={() => handleHourChange(d.code, "start", false)}
                              >
                                {#each PERIOD_OPTS as p}<option value={p}>{p}</option>{/each}
                              </select>
                            </div>
                          </td>
                          <td class="px-3 py-2">
                            <div class="flex gap-1">
                              <select
                                class="border rounded px-2 py-1"
                                bind:value={whAdd[d.code].endHour}
                                disabled={!whAdd[d.code].open}
                                onchange={() => handleHourChange(d.code, "end", false)}
                              >
                                {#each HOUR_OPTS_12 as h}<option value={h}>{h}</option>{/each}
                              </select>
                              <select
                                class="border rounded px-2 py-1"
                                bind:value={whAdd[d.code].endPeriod}
                                disabled={!whAdd[d.code].open}
                                onchange={() => handleHourChange(d.code, "end", false)}
                              >
                                {#each PERIOD_OPTS as p}<option value={p}>{p}</option>{/each}
                              </select>
                            </div>
                          </td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
                {#if fieldErrors.working_hours}
                  <p class="text-xs text-red-600 mt-1">{fieldErrors.working_hours}</p>
                {/if}
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium">{labelWithRequired("Days Off", "days_off")}</label>
                  <input
                    type="text"
                    name="days_off"
                    placeholder="MM/DD, MM/DD"
                    bind:value={formState.days_off}
                    class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                  />
                  <p class="text-xs text-gray-500 mt-1">Will render like: {formatDaysOff(formState.days_off).join(", ")}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium">{labelWithRequired("Rides Phone", "rides_phone_number")}</label>
                  <input
                    type="tel"
                    name="rides_phone_number"
                    bind:value={formState.rides_phone_number}
                    class={"mt-1 w-full border rounded-md px-3 py-2 " + (fieldErrors.rides_phone_number ? "border-red-500" : "border-gray-300")}
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium">{labelWithRequired("Client Minimum Age", "client_min_age")}</label>
                  <input
                    type="number"
                    name="client_min_age"
                    bind:value={formState.client_min_age}
                    class={"mt-1 w-full border rounded-md px-3 py-2 " + (fieldErrors.client_min_age ? "border-red-500" : "border-gray-300")}
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium">{labelWithRequired("Min Days in Advance", "min_days_in_advance_for_ride_requests")}</label>
                  <input
                    type="number"
                    name="min_days_in_advance_for_ride_requests"
                    bind:value={formState.min_days_in_advance_for_ride_requests}
                    class={"mt-1 w-full border rounded-md px-3 py-2 " + (fieldErrors.min_days_in_advance_for_ride_requests ? "border-red-500" : "border-gray-300")}
                  />
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium">Max Weekly Rides (optional)</label>
                <input
                  type="number"
                  name="client_max_weekly_rides"
                  bind:value={formState.client_max_weekly_rides}
                  class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                  placeholder="Leave blank for no limit"
                />
              </div>
            </div>
          {/if}

          <!-- STEP 3: Primary Contact -->
          {#if addStep === 3}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium">{labelWithRequired("Name", "primary_contact_name")}</label>
                <input
                  type="text"
                  name="primary_contact_name"
                  bind:value={formState.primary_contact_name}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " + (fieldErrors.primary_contact_name ? "border-red-500" : "border-gray-300")}
                />
              </div>
              <div>
                <label class="block text-sm font-medium">{labelWithRequired("Email", "primary_contact_email")}</label>
                <input
                  type="email"
                  name="primary_contact_email"
                  bind:value={formState.primary_contact_email}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " + (fieldErrors.primary_contact_email ? "border-red-500" : "border-gray-300")}
                />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium">{labelWithRequired("Address", "primary_contact_address")}</label>
                <input
                  type="text"
                  name="primary_contact_address"
                  bind:value={formState.primary_contact_address}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " + (fieldErrors.primary_contact_address ? "border-red-500" : "border-gray-300")}
                />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium">{labelWithRequired("Address 2", "primary_contact_address2")}</label>
                <input
                  type="text"
                  name="primary_contact_address2"
                  bind:value={formState.primary_contact_address2}
                  class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                />
              </div>
              <div>
                <label class="block text-sm font-medium">{labelWithRequired("City", "primary_contact_city")}</label>
                <input
                  type="text"
                  name="primary_contact_city"
                  bind:value={formState.primary_contact_city}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " + (fieldErrors.primary_contact_city ? "border-red-500" : "border-gray-300")}
                />
              </div>
              <div>
                <label class="block text-sm font-medium">{labelWithRequired("State", "primary_contact_state")}</label>
                <input
                  type="text"
                  name="primary_contact_state"
                  maxlength="2"
                  bind:value={formState.primary_contact_state}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " + (fieldErrors.primary_contact_state ? "border-red-500" : "border-gray-300")}
                />
              </div>
              <div>
                <label class="block text-sm font-medium">{labelWithRequired("Zip", "primary_contact_zipcode")}</label>
                <input
                  type="text"
                  name="primary_contact_zipcode"
                  bind:value={formState.primary_contact_zipcode}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " + (fieldErrors.primary_contact_zipcode ? "border-red-500" : "border-gray-300")}
                />
              </div>
            </div>
          {/if}

          <!-- STEP 4: Secondary Contact (optional) -->
          {#if addStep === 4}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium">{labelWithRequired("Name", "secondary_contact_name")}</label>
                <input
                  type="text"
                  name="secondary_contact_name"
                  bind:value={formState.secondary_contact_name}
                  class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                />
              </div>
              <div>
                <label class="block text-sm font-medium">{labelWithRequired("Email", "secondary_contact_email")}</label>
                <input
                  type="email"
                  name="secondary_contact_email"
                  bind:value={formState.secondary_contact_email}
                  class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium">{labelWithRequired("Address", "secondary_contact_address")}</label>
                <input
                  type="text"
                  name="secondary_contact_address"
                  bind:value={formState.secondary_contact_address}
                  class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium">{labelWithRequired("Address 2", "secondary_contact_address2")}</label>
                <input
                  type="text"
                  name="secondary_contact_address2"
                  bind:value={formState.secondary_contact_address2}
                  class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                />
              </div>
              <div>
                <label class="block text-sm font-medium">{labelWithRequired("City", "secondary_contact_city")}</label>
                <input
                  type="text"
                  name="secondary_contact_city"
                  bind:value={formState.secondary_contact_city}
                  class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                />
              </div>
              <div>
                <label class="block text-sm font-medium">{labelWithRequired("State", "secondary_contact_state")}</label>
                <input
                  type="text"
                  name="secondary_contact_state"
                  maxlength="2"
                  bind:value={formState.secondary_contact_state}
                  class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                />
              </div>
              <div>
                <label class="block text-sm font-medium">{labelWithRequired("Zip", "secondary_contact_zipcode")}</label>
                <input
                  type="text"
                  name="secondary_contact_zipcode"
                  bind:value={formState.secondary_contact_zipcode}
                  class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                />
              </div>
            </div>
          {/if}

          <!-- STEP 5: Login -->
          {#if addStep === 5}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium">{labelWithRequired("Initial Password", "user_initial_password")}</label>
                <input
                  type="text"
                  name="user_initial_password"
                  bind:value={formState.user_initial_password}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " + (fieldErrors.user_initial_password ? "border-red-500" : "border-gray-300")}
                />
              </div>
            </div>
          {/if}

          <!-- STEP 6: Review -->
          {#if addStep === 6}
            <div class="text-sm text-gray-700 space-y-2">
              <p class="font-medium">Please review your entries. You can go Back to make changes.</p>
              <p><span class="font-medium">Name:</span> {formState.name}</p>
              <p><span class="font-medium">Status:</span> {formState.org_status}</p>
              <p><span class="font-medium">Website:</span> {formState.org_website}</p>
              <p><span class="font-medium">Email/Phone:</span> {formState.org_email} / {formState.org_phone}</p>
              <p>
                <span class="font-medium">Address:</span>
                {formState.org_address}{formState.org_address2 ? `, ${formState.org_address2}` : ""}, {formState.org_city}, {formState.org_state} {formState.org_zip_code}
              </p>
              <p><span class="font-medium">Working Hours:</span> {getPackedWorkingHours(false) || "—"}</p>
              <p><span class="font-medium">Days Off:</span> {formatDaysOff(formState.days_off).join(", ") || "—"}</p>
              <p><span class="font-medium">Rides Phone:</span> {formState.rides_phone_number}</p>
              <p><span class="font-medium">Client Min Age / Min Days:</span> {formState.client_min_age} / {formState.min_days_in_advance_for_ride_requests}</p>
              <p><span class="font-medium">Max Weekly Rides:</span> {formState.client_max_weekly_rides || "No limit"}</p>
              <p><span class="font-medium">Primary Contact:</span> {formState.primary_contact_name} ({formState.primary_contact_email})</p>
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
              <button type="button" onclick={nextAddStep} class="px-4 py-2 bg-blue-600 text-white rounded-md">
                Next
              </button>
            {:else}
              <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-md inline-flex items-center gap-2">
                <Save class="w-4 h-4" /><span>Add Organization</span>
              </button>
            {/if}
          </div>
        </form>
      </div>
    </div>
  {/if}

  <!-- EDIT Organization Wizard -->
  {#if showEditModal && editingOrg}
    <div class="fixed inset-0 bg-gray-600/50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-10 mx-auto p-5 w-full max-w-4xl shadow-lg rounded-2xl bg-white">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-xl font-semibold">Edit Organization</h3>
          <button onclick={closeModals} class="text-gray-400 hover:text-gray-600">
            <X class="w-5 h-5" />
          </button>
        </div>
        <p class="text-sm text-gray-500 mb-4">
          <span class="text-red-600">*</span> indicates required fields.
        </p>

        <div class="mb-4 text-sm text-gray-700">
          Step {editStep + 1} of {STEP_LABELS.length}:
          <span class="font-medium">{STEP_LABELS[editStep]}</span>
        </div>

        <form
          method="POST"
          action="?/updateOrganization"
          use:enhance={() => {
            if (!validateAllSteps()) {
              return async () => {};
            }
            return async ({ result }) => {
              if (result.type === "success") {
                showMessage("Organization updated successfully!", true);
                closeModals();
                invalidateAll();
              } else if (result.type === "failure") {
                showMessage((result.data as any)?.error || "Failed to update organization", false);
              }
            };
          }}
          class="space-y-6"
        >
          <!-- Hidden fields -->
          <input type="hidden" name="org_id" value={editingOrg.org_id} />
          <input type="hidden" name="working_hours" value={getPackedWorkingHours(true)} />

          <!-- STEP 0: Overview -->
          {#if editStep === 0}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium">{labelWithRequired("Name", "name")}</label>
                <input
                  type="text"
                  name="name"
                  bind:value={formState.name}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " + (fieldErrors.name ? "border-red-500" : "border-gray-300")}
                />
              </div>
              <div>
                <label class="block text-sm font-medium">{labelWithRequired("Organization Status", "org_status")}</label>
                <select
                  name="org_status"
                  bind:value={formState.org_status}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " + (fieldErrors.org_status ? "border-red-500" : "border-gray-300")}
                >
                  <option value="">—</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium">{labelWithRequired("Website", "org_website")}</label>
                <input
                  type="text"
                  name="org_website"
                  bind:value={formState.org_website}
                  class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                />
              </div>
              <div>
                <label class="block text-sm font-medium">{labelWithRequired("Organization Email", "org_email")}</label>
                <input
                  type="email"
                  name="org_email"
                  bind:value={formState.org_email}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " + (fieldErrors.org_email ? "border-red-500" : "border-gray-300")}
                />
              </div>
              <div>
                <label class="block text-sm font-medium">{labelWithRequired("Organization Phone", "org_phone")}</label>
                <input
                  type="tel"
                  name="org_phone"
                  bind:value={formState.org_phone}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " + (fieldErrors.org_phone ? "border-red-500" : "border-gray-300")}
                />
              </div>
            </div>
          {/if}

          <!-- STEP 1: Address -->
          {#if editStep === 1}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="md:col-span-2">
                <label class="block text-sm font-medium">{labelWithRequired("Street", "org_address")}</label>
                <input
                  type="text"
                  name="org_address"
                  bind:value={formState.org_address}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " + (fieldErrors.org_address ? "border-red-500" : "border-gray-300")}
                />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium">{labelWithRequired("Street 2", "org_address2")}</label>
                <input
                  type="text"
                  name="org_address2"
                  bind:value={formState.org_address2}
                  class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                />
              </div>
              <div>
                <label class="block text-sm font-medium">{labelWithRequired("City", "org_city")}</label>
                <input
                  type="text"
                  name="org_city"
                  bind:value={formState.org_city}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " + (fieldErrors.org_city ? "border-red-500" : "border-gray-300")}
                />
              </div>
              <div>
                <label class="block text-sm font-medium">{labelWithRequired("State", "org_state")}</label>
                <input
                  type="text"
                  name="org_state"
                  maxlength="2"
                  bind:value={formState.org_state}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " + (fieldErrors.org_state ? "border-red-500" : "border-gray-300")}
                />
              </div>
              <div>
                <label class="block text-sm font-medium">{labelWithRequired("Zip Code", "org_zip_code")}</label>
                <input
                  type="text"
                  name="org_zip_code"
                  bind:value={formState.org_zip_code}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " + (fieldErrors.org_zip_code ? "border-red-500" : "border-gray-300")}
                />
              </div>
            </div>
          {/if}

          <!-- STEP 2: Operations -->
          {#if editStep === 2}
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium">Working Hours <span class="text-red-600">*</span></label>
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
                            <input type="checkbox" bind:checked={whEdit[d.code].open} />
                          </td>
                          <td class="px-3 py-2">
                            <div class="flex gap-1">
                              <select
                                class="border rounded px-2 py-1"
                                bind:value={whEdit[d.code].startHour}
                                disabled={!whEdit[d.code].open}
                                onchange={() => handleHourChange(d.code, "start", true)}
                              >
                                {#each HOUR_OPTS_12 as h}<option value={h}>{h}</option>{/each}
                              </select>
                              <select
                                class="border rounded px-2 py-1"
                                bind:value={whEdit[d.code].startPeriod}
                                disabled={!whEdit[d.code].open}
                                onchange={() => handleHourChange(d.code, "start", true)}
                              >
                                {#each PERIOD_OPTS as p}<option value={p}>{p}</option>{/each}
                              </select>
                            </div>
                          </td>
                          <td class="px-3 py-2">
                            <div class="flex gap-1">
                              <select
                                class="border rounded px-2 py-1"
                                bind:value={whEdit[d.code].endHour}
                                disabled={!whEdit[d.code].open}
                                onchange={() => handleHourChange(d.code, "end", true)}
                              >
                                {#each HOUR_OPTS_12 as h}<option value={h}>{h}</option>{/each}
                              </select>
                              <select
                                class="border rounded px-2 py-1"
                                bind:value={whEdit[d.code].endPeriod}
                                disabled={!whEdit[d.code].open}
                                onchange={() => handleHourChange(d.code, "end", true)}
                              >
                                {#each PERIOD_OPTS as p}<option value={p}>{p}</option>{/each}
                              </select>
                            </div>
                          </td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
                {#if fieldErrors.working_hours}
                  <p class="text-xs text-red-600 mt-1">{fieldErrors.working_hours}</p>
                {/if}
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium">{labelWithRequired("Days Off", "days_off")}</label>
                  <input
                    type="text"
                    name="days_off"
                    placeholder="MM/DD, MM/DD"
                    bind:value={formState.days_off}
                    class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                  />
                  <p class="text-xs text-gray-500 mt-1">Will render like: {formatDaysOff(formState.days_off).join(", ")}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium">{labelWithRequired("Rides Phone", "rides_phone_number")}</label>
                  <input
                    type="tel"
                    name="rides_phone_number"
                    bind:value={formState.rides_phone_number}
                    class={"mt-1 w-full border rounded-md px-3 py-2 " + (fieldErrors.rides_phone_number ? "border-red-500" : "border-gray-300")}
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium">{labelWithRequired("Client Minimum Age", "client_min_age")}</label>
                  <input
                    type="number"
                    name="client_min_age"
                    bind:value={formState.client_min_age}
                    class={"mt-1 w-full border rounded-md px-3 py-2 " + (fieldErrors.client_min_age ? "border-red-500" : "border-gray-300")}
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium">Max Weekly Rides (optional)</label>
                  <input
                    type="number"
                    name="client_max_weekly_rides"
                    bind:value={formState.client_max_weekly_rides}
                    class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                    placeholder="Leave blank for no limit"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium">{labelWithRequired("Min Days in Advance", "min_days_in_advance_for_ride_requests")}</label>
                  <input
                    type="number"
                    name="min_days_in_advance_for_ride_requests"
                    bind:value={formState.min_days_in_advance_for_ride_requests}
                    class={"mt-1 w-full border rounded-md px-3 py-2 " + (fieldErrors.min_days_in_advance_for_ride_requests ? "border-red-500" : "border-gray-300")}
                  />
                </div>
              </div>
            </div>
          {/if}

          <!-- STEP 3: Primary Contact -->
          {#if editStep === 3}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium">{labelWithRequired("Name", "primary_contact_name")}</label>
                <input
                  type="text"
                  name="primary_contact_name"
                  bind:value={formState.primary_contact_name}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " + (fieldErrors.primary_contact_name ? "border-red-500" : "border-gray-300")}
                />
              </div>
              <div>
                <label class="block text-sm font-medium">{labelWithRequired("Email", "primary_contact_email")}</label>
                <input
                  type="email"
                  name="primary_contact_email"
                  bind:value={formState.primary_contact_email}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " + (fieldErrors.primary_contact_email ? "border-red-500" : "border-gray-300")}
                />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium">{labelWithRequired("Address", "primary_contact_address")}</label>
                <input
                  type="text"
                  name="primary_contact_address"
                  bind:value={formState.primary_contact_address}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " + (fieldErrors.primary_contact_address ? "border-red-500" : "border-gray-300")}
                />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium">{labelWithRequired("Address 2", "primary_contact_address2")}</label>
                <input
                  type="text"
                  name="primary_contact_address2"
                  bind:value={formState.primary_contact_address2}
                  class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                />
              </div>
              <div>
                <label class="block text-sm font-medium">{labelWithRequired("City", "primary_contact_city")}</label>
                <input
                  type="text"
                  name="primary_contact_city"
                  bind:value={formState.primary_contact_city}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " + (fieldErrors.primary_contact_city ? "border-red-500" : "border-gray-300")}
                />
              </div>
              <div>
                <label class="block text-sm font-medium">{labelWithRequired("State", "primary_contact_state")}</label>
                <input
                  type="text"
                  name="primary_contact_state"
                  maxlength="2"
                  bind:value={formState.primary_contact_state}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " + (fieldErrors.primary_contact_state ? "border-red-500" : "border-gray-300")}
                />
              </div>
              <div>
                <label class="block text-sm font-medium">{labelWithRequired("Zip", "primary_contact_zipcode")}</label>
                <input
                  type="text"
                  name="primary_contact_zipcode"
                  bind:value={formState.primary_contact_zipcode}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " + (fieldErrors.primary_contact_zipcode ? "border-red-500" : "border-gray-300")}
                />
              </div>
            </div>
          {/if}

          <!-- STEP 4: Secondary Contact -->
          {#if editStep === 4}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium">{labelWithRequired("Name", "secondary_contact_name")}</label>
                <input
                  type="text"
                  name="secondary_contact_name"
                  bind:value={formState.secondary_contact_name}
                  class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                />
              </div>
              <div>
                <label class="block text-sm font-medium">{labelWithRequired("Email", "secondary_contact_email")}</label>
                <input
                  type="email"
                  name="secondary_contact_email"
                  bind:value={formState.secondary_contact_email}
                  class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium">{labelWithRequired("Address", "secondary_contact_address")}</label>
                <input
                  type="text"
                  name="secondary_contact_address"
                  bind:value={formState.secondary_contact_address}
                  class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium">{labelWithRequired("Address 2", "secondary_contact_address2")}</label>
                <input
                  type="text"
                  name="secondary_contact_address2"
                  bind:value={formState.secondary_contact_address2}
                  class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                />
              </div>
              <div>
                <label class="block text-sm font-medium">{labelWithRequired("City", "secondary_contact_city")}</label>
                <input
                  type="text"
                  name="secondary_contact_city"
                  bind:value={formState.secondary_contact_city}
                  class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                />
              </div>
              <div>
                <label class="block text-sm font-medium">{labelWithRequired("State", "secondary_contact_state")}</label>
                <input
                  type="text"
                  name="secondary_contact_state"
                  maxlength="2"
                  bind:value={formState.secondary_contact_state}
                  class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                />
              </div>
              <div>
                <label class="block text-sm font-medium">{labelWithRequired("Zip", "secondary_contact_zipcode")}</label>
                <input
                  type="text"
                  name="secondary_contact_zipcode"
                  bind:value={formState.secondary_contact_zipcode}
                  class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                />
              </div>
            </div>
          {/if}

          <!-- STEP 5: Login -->
          {#if editStep === 5}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium">{labelWithRequired("Initial Password", "user_initial_password")}</label>
                <input
                  type="text"
                  name="user_initial_password"
                  bind:value={formState.user_initial_password}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " + (fieldErrors.user_initial_password ? "border-red-500" : "border-gray-300")}
                />
              </div>
            </div>
          {/if}

          <!-- STEP 6: Review -->
          {#if editStep === 6}
            <div class="text-sm text-gray-700 space-y-2">
              <p class="font-medium">Review and save changes.</p>
              <p><span class="font-medium">Name:</span> {formState.name}</p>
              <p><span class="font-medium">Status:</span> {formState.org_status}</p>
              <p><span class="font-medium">Website:</span> {formState.org_website}</p>
              <p><span class="font-medium">Email/Phone:</span> {formState.org_email} / {formState.org_phone}</p>
              <p>
                <span class="font-medium">Address:</span>
                {formState.org_address}{formState.org_address2 ? `, ${formState.org_address2}` : ""}, {formState.org_city}, {formState.org_state} {formState.org_zip_code}
              </p>
              <p><span class="font-medium">Working Hours:</span> {getPackedWorkingHours(true) || "—"}</p>
              <p><span class="font-medium">Days Off:</span> {formatDaysOff(formState.days_off).join(", ") || "—"}</p>
              <p><span class="font-medium">Rides Phone:</span> {formState.rides_phone_number}</p>
              <p><span class="font-medium">Client Min Age / Min Days:</span> {formState.client_min_age} / {formState.min_days_in_advance_for_ride_requests}</p>
              <p><span class="font-medium">Max Weekly Rides:</span> {formState.client_max_weekly_rides || "No limit"}</p>
              <p><span class="font-medium">Primary Contact:</span> {formState.primary_contact_name} ({formState.primary_contact_email})</p>
            </div>
          {/if}

          <!-- Wizard controls -->
          <div class="flex justify-between pt-2">
            <button
              type="button"
              onclick={editStep === 0 ? closeModals : prevEditStep}
              class="px-4 py-2 border border-gray-300 rounded-md"
            >
              {editStep === 0 ? "Cancel" : "Back"}
            </button>
            {#if editStep < STEP_LABELS.length - 1}
              <button type="button" onclick={nextEditStep} class="px-4 py-2 bg-blue-600 text-white rounded-md">
                Next
              </button>
            {:else}
              <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-md inline-flex items-center gap-2">
                <Save class="w-4 h-4" /><span>Save Changes</span>
              </button>
            {/if}
          </div>
        </form>
      </div>
    </div>
  {/if}
</div>