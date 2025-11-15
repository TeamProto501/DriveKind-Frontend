<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { API_BASE_URL } from "$lib/api";
  import { toastStore } from "$lib/toast";
  import { X } from "@lucide/svelte";

  export let client: Client | null = null;
  export let createMode: boolean = false;
  export let session: any = undefined;
  export let orgId: number;
  export let minimumAge: number = 0;
  const dispatch = createEventDispatcher();

  type Client = {
    client_id?: number;
    org_id?: number;
    first_name: string;
    last_name: string;
    email?: string | null;
    primary_phone: string;
    secondary_phone?: string | null;
    contact_pref?: "Phone" | "Email" | "Text" | "" | null;
    date_of_birth: string;
    gender: "Male" | "Female" | "Other";
    street_address: string;
    address2?: string | null;
    city: string;
    state: string;
    zip_code: string;
    lives_alone: boolean;
    primaryPhone_is_cell: boolean;
    primaryPhone_can_text: boolean;
    secondaryPhone_is_cell?: boolean;
    secondaryPhone_can_text?: boolean;
    service_animal: boolean;
    oxygen: boolean;
    client_status_enum: "Active" | "Inactive" | "Temporary Thru";
    mobility_assistance_enum?: "cane" | "crutches" | "light walker" | "rollator" | null;
    residence_enum:
      | "house"
      | "apartment"
      | "mobile home"
      | "townhouse"
      | "condo";
    service_animal_size_enum?: "small" | "medium" | "large" | null;
    date_enrolled: string;
    temp_client_date?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
    emergency_contact_relationship?: string | null;
    allergies?: string | null;
    other_allergies?: string | null;
    pick_up_instructions?: string | null;
    comments?: string | null;
    other_limitations?: string | null;
    referral_method?: string | null;
    driver_preference?: string | null;
  };

  const statusOptions = ["Active", "Inactive", "Temporary Thru"] as const;
  const mobilityOptions = ["", "cane", "crutches", "light walker", "rollator"] as const;
  const genderOptions = ["Male", "Female", "Other"] as const;
  const residenceOptions = [
    "house",
    "apartment",
    "mobile home",
    "townhouse",
    "condo",
  ] as const;
  const serviceAnimalSizeOptions = ["", "small", "medium", "large"] as const;
  const contactPrefOptions = ["", "Phone", "Email", "Text"] as const;

  let mode: "view" | "edit" = createMode ? "edit" : "view";
  let step = 1;

  let form: Client = initForm();
  let saving = false;
  let errorMessage: string | null = null;

  function calculateAge(birthDate: string): number {
    const today = new Date();
    const birth = new Date(birthDate);

    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }

    return age;
  }
  function initForm(): Client {
    if (!client || createMode) {
      return {
        first_name: "",
        last_name: "",
        email: null,
        primary_phone: "",
        secondary_phone: null,
        contact_pref: null,
        date_of_birth: "",
        gender: "Other",
        street_address: "",
        address2: null,
        city: "",
        state: "NY", // ← Set default state to NY
        zip_code: "",
        lives_alone: false,
        primaryPhone_is_cell: true,
        primaryPhone_can_text: true,
        secondaryPhone_is_cell: false,
        secondaryPhone_can_text: false,
        service_animal: false,
        oxygen: false,
        client_status_enum: "Active",
        mobility_assistance_enum: null,
        residence_enum: "house",
        service_animal_size_enum: null,
        date_enrolled: new Date().toISOString().split("T")[0],
        temp_client_date: null,
        emergency_contact_name: null,
        emergency_contact_phone: null,
        emergency_contact_relationship: null,
        allergies: null,
        other_allergies: null,
        pick_up_instructions: null,
        comments: null,
        other_limitations: null,
        referral_method: null,
        driver_preference: null,
        org_id: orgId,
      };
    }
    return { ...client, org_id: client.org_id || orgId };
  }

  $: form = initForm();

  // --- REQUIRED FIELD VALIDATION (now includes Email + Contact Preference) ---
  function errsStep(s: number): string[] {
    const e: string[] = [];
    if (s === 1) {
      if (!form.first_name.trim()) e.push("First name is required.");
      if (!form.last_name.trim()) e.push("Last name is required.");
      // Email is optional - removed from validation
      if (!form.primary_phone.trim()) e.push("Primary phone is required.");
      if (!form.date_of_birth) {
        e.push("Date of birth is required.");
      } else {
        const birthDate = new Date(form.date_of_birth);
        const today = new Date();
        if (isNaN(birthDate.getTime())) {
          e.push("Invalid date of birth");
        } else if (birthDate > today) {
          e.push(`Date of birth cannot be in the future ${minimumAge}`);
        } else if (minimumAge > 0) {
          const age = calculateAge(form.date_of_birth);
          if (age < minimumAge) {
            e.push(
              `Client must be at least ${minimumAge} years old. Current age: ${age}.`
            );
          }
        }
      }
      if (!form.gender) e.push("Gender is required.");
      if (!form.contact_pref) e.push("Contact preference is required.");
    }
    if (s === 2) {
      if (!form.street_address.trim()) e.push("Street address is required.");
      if (!form.city.trim()) e.push("City is required.");
      if (!form.state.trim()) e.push("State is required.");
      if (!form.zip_code.trim()) e.push("ZIP code is required.");
    }
    return e;
  }

  function next() {
    const e = errsStep(step);
    if (e.length) {
      errorMessage = e.join(" ");
      return;
    }
    errorMessage = null;
    step = Math.min(4, step + 1);
  }
  function back() {
    step = Math.max(1, step - 1);
    errorMessage = null;
  }

  function goToClientStep(target: number) {
    // free backward navigation
    if (target <= step) {
      step = Math.max(1, Math.min(4, target));
      errorMessage = null;
      return;
    }
    // block forward unless current step validates
    const e = errsStep(step);
    if (e.length) {
      errorMessage = e.join(" ");
      return;
    }
    errorMessage = null;
    step = Math.max(1, Math.min(4, target));
  }

  async function saveClient() {
    const e = [...errsStep(1), ...errsStep(2)];
    if (e.length) {
      errorMessage = e.join(" ");
      return;
    }
    saving = true;
    try {
      const body = {
        ...form,
        contact_pref: form.contact_pref || null,
        mobility_assistance_enum: form.mobility_assistance_enum || null,
        service_animal_size_enum: form.service_animal_size_enum || null,
        email: form.email?.trim() || null,
        secondary_phone: form.secondary_phone?.trim() || null,
        address2: form.address2?.trim() || null,
        emergency_contact_name: form.emergency_contact_name?.trim() || null,
        emergency_contact_phone: form.emergency_contact_phone?.trim() || null,
        emergency_contact_relationship:
          form.emergency_contact_relationship?.trim() || null,
        allergies: form.allergies?.trim() || null,
        other_allergies: form.other_allergies?.trim() || null,
        pick_up_instructions: form.pick_up_instructions?.trim() || null,
        comments: form.comments?.trim() || null,
        other_limitations: form.other_limitations?.trim() || null,
        temp_client_date: form.temp_client_date || null,
        referral_method: form.referral_method?.trim() || null,
        driver_preference: form.driver_preference?.trim() || null,
      };

      if (createMode) {
        const { org_id, client_id, ...createData } = body;
        const res = await fetch(`${API_BASE_URL}/clients`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(createData),
        });
        if (!res.ok) {
          throw new Error((await res.text()) || "Failed to create client");
        }
        toastStore.success("Client created successfully");
      } else if (client) {
        const { client_id, ...updateData } = body;
        const res = await fetch(`${API_BASE_URL}/clients/${client.client_id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(updateData),
        });
        if (!res.ok) {
          throw new Error((await res.text()) || "Failed to update client");
        }
        toastStore.success("Client updated successfully");
      }

      dispatch("updated");
      dispatch("close");
    } catch (err: any) {
      errorMessage = err.message || "Failed to save client";
      toastStore.error(errorMessage);
    } finally {
      saving = false;
    }
  }
</script>

<div
  class="fixed top-0 right-0 w-[28rem] max-w-[92vw] h-full bg-white shadow-xl border-l border-gray-200 flex flex-col z-50"
>
  <!-- Header -->
  <div class="px-6 py-4 border-b flex items-center justify-between">
    <h2 class="text-lg md:text-xl font-semibold text-gray-900">
      {createMode
        ? "Add New Client"
        : mode === "view"
          ? "Client Profile"
          : "Edit Client"}
    </h2>
    <button
      on:click={() => dispatch("close")}
      class="text-gray-500 hover:text-gray-700"
    >
      <X class="w-5 h-5" />
    </button>
  </div>

  <!-- Body -->
  <div class="flex-1 overflow-y-auto p-6 space-y-4">
    {#if errorMessage}
      <div
        class="rounded-md bg-red-50 border border-red-200 p-3 text-base text-red-700"
      >
        <p class="font-medium mb-2">Please fix the following errors:</p>
        <ul class="list-disc list-inside space-y-1">
          {#each errorMessage.split(". ").filter((e) => e.trim()) as err}
            <li>{err}{err.endsWith(".") ? "" : "."}</li>
          {/each}
        </ul>
      </div>
    {/if}

    {#if !createMode && mode === "view" && client}
      <!-- READ-ONLY PROFILE -->
      <div class="space-y-4 text-[15px] leading-6">
        <div class="bg-gray-50 rounded-lg p-3">
          <div class="font-semibold text-gray-900 text-lg">
            {client.first_name}
            {client.last_name}
          </div>
          <div class="text-gray-600">
            {client.gender} • {client.client_status_enum}
          </div>
        </div>

        <div class="grid grid-cols-1 gap-3">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <div class="text-xs text-gray-500">Primary Phone</div>
              <div class="font-medium">{client.primary_phone}</div>
            </div>
            <div>
              <div class="text-xs text-gray-500">Secondary Phone</div>
              <div class="font-medium">{client.secondary_phone || "—"}</div>
            </div>
          </div>
          <div>
            <label class="block text-base font-medium"
              >Email <span class="text-gray-500 font-normal">(optional)</span
              ></label
            >
            <input
              type="email"
              class="mt-1 w-full border rounded px-3 py-2 text-base"
              bind:value={form.email}
              placeholder="client@example.com"
            />
          </div>
          <div>
            <div class="text-xs text-gray-500">Address</div>
            <div class="font-medium">
              {[client.street_address, client.address2]
                .filter(Boolean)
                .join(" ")}
            </div>
            <div class="font-medium">
              {client.city}, {client.state}
              {client.zip_code}
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <div class="text-xs text-gray-500">DOB</div>
              <div class="font-medium">{client.date_of_birth}</div>
            </div>
            <div>
              <div class="text-xs text-gray-500">Contact Preference</div>
              <div class="font-medium">{client.contact_pref || "—"}</div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <div class="text-xs text-gray-500">Lives Alone</div>
              <div class="font-medium">{client.lives_alone ? "Yes" : "No"}</div>
            </div>
            <div>
              <div class="text-xs text-gray-500">Service Animal</div>
              <div class="font-medium">
                {client.service_animal ? "Yes" : "No"}
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <div class="text-xs text-gray-500">Mobility Assistance</div>
              <div class="font-medium">
                {client.mobility_assistance_enum || "—"}
              </div>
            </div>
            <div>
              <div class="text-xs text-gray-500">Residence</div>
              <div class="font-medium">{client.residence_enum}</div>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-2">
            <div>
              <div class="text-xs text-gray-500">Emergency Contact</div>
              <div class="font-medium">
                {client.emergency_contact_name ||
                  "—"}{client.emergency_contact_relationship
                  ? ` (${client.emergency_contact_relationship})`
                  : ""}
              </div>
            </div>
            <div>
              <div class="text-xs text-gray-500">Emergency Phone</div>
              <div class="font-medium">
                {client.emergency_contact_phone || "—"}
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-2">
            <div>
              <div class="text-xs text-gray-500">Allergies</div>
              <div class="font-medium">
                {client.allergies || client.other_allergies || "—"}
              </div>
            </div>
            <div>
              <div class="text-xs text-gray-500">Pickup Instructions</div>
              <div class="font-medium">
                {client.pick_up_instructions || "—"}
              </div>
            </div>
            <div>
              <div class="text-xs text-gray-500">Comments</div>
              <div class="font-medium">{client.comments || "—"}</div>
            </div>
            <div>
              <div class="text-xs text-gray-500">Other Limitations</div>
              <div class="font-medium">{client.other_limitations || "—"}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="px-6 pb-6 pt-2">
        <button
          on:click={() => {
            mode = "edit";
            step = 1;
          }}
          class="w-full rounded-lg bg-blue-600 text-white py-3 text-base"
        >
          Edit Information
        </button>
      </div>
    {:else}
      <!-- CLICKABLE STEPPER -->
      <div class="flex items-center justify-center gap-3 mb-2 select-none">
        {#each [1, 2, 3, 4] as s}
          <div class="flex items-center gap-2">
            <button
              type="button"
              title={`Go to step ${s}`}
              on:click={() => goToClientStep(s)}
              class="w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors
                    {step === s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}"
              aria-current={step === s ? 'step' : undefined}
              aria-label={`Step ${s}`}
            >
              {s}
            </button>
            {#if s < 4}
              <!-- svelte-ignore element_invalid_self_closing_tag -->
              <button
                type="button"
                aria-label={`Jump toward step ${s + 1}`}
                on:click={() => goToClientStep(s + 1)}
                class="w-8 h-[2px] rounded {step > s ? 'bg-blue-600' : 'bg-gray-200 hover:bg-gray-300'}"
              />
            {/if}
          </div>
        {/each}
      </div>

      {#if step === 1}
        <!-- Basic Info -->
        <div class="space-y-3">
          <div>
            <label class="block text-base font-medium">First Name *</label
            ><input
              required
              class="mt-1 w-full border rounded px-3 py-2 text-base"
              bind:value={form.first_name}
            />
          </div>
          <div>
            <label class="block text-base font-medium">Last Name *</label><input
              required
              class="mt-1 w-full border rounded px-3 py-2 text-base"
              bind:value={form.last_name}
            />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-base font-medium">Date of Birth *</label
              ><input
                required
                type="date"
                class="mt-1 w-full border rounded px-3 py-2 text-base"
                bind:value={form.date_of_birth}
              />
            </div>
            <div>
              <label class="block text-base font-medium">Gender *</label>
              <select
                required
                class="mt-1 w-full border rounded px-3 py-2 text-base"
                bind:value={form.gender}
              >
                {#each genderOptions as g}<option value={g}>{g}</option>{/each}
              </select>
            </div>
          </div>
          <div>
            <label class="block text-base font-medium">Email</label><input
              type="email"
              class="mt-1 w-full border rounded px-3 py-2 text-base"
              bind:value={form.email}
            />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-base font-medium">Primary Phone *</label
              ><input
                required
                class="mt-1 w-full border rounded px-3 py-2 text-base"
                bind:value={form.primary_phone}
              />
            </div>
            <div>
              <label class="block text-base font-medium">Secondary Phone</label
              ><input
                class="mt-1 w-full border rounded px-3 py-2 text-base"
                bind:value={form.secondary_phone}
              />
            </div>
          </div>
          <div>
            <label class="block text-base font-medium"
              >Contact Preference *</label
            >
            <select
              required
              class="mt-1 w-full border rounded px-3 py-2 text-base"
              bind:value={form.contact_pref}
            >
              {#each contactPrefOptions as p}<option value={p}
                  >{p || "None"}</option
                >{/each}
            </select>
          </div>
        </div>
      {/if}

      {#if step === 2}
        <!-- Address -->
        <div class="space-y-3">
          <div>
            <label class="block text-base font-medium">Street Address *</label
            ><input
              required
              class="mt-1 w-full border rounded px-3 py-2 text-base"
              bind:value={form.street_address}
            />
          </div>
          <div>
            <label class="block text-base font-medium">Address Line 2</label
            ><input
              class="mt-1 w-full border rounded px-3 py-2 text-base"
              bind:value={form.address2}
              placeholder="Apt, Suite, etc."
            />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-base font-medium">City *</label><input
                required
                class="mt-1 w-full border rounded px-3 py-2 text-base"
                bind:value={form.city}
              />
            </div>
            <div>
              <label class="block text-base font-medium">State *</label><input
                required
                class="mt-1 w-full border rounded px-3 py-2 text-base uppercase"
                maxlength="2"
                bind:value={form.state}
                placeholder="NY"
              />
            </div>
          </div>
          <div>
            <label class="block text-base font-medium">Zip Code *</label><input
              required
              class="mt-1 w-full border rounded px-3 py-2 text-base"
              bind:value={form.zip_code}
              maxlength="10"
            />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <label class="flex items-center gap-2 text-base"
              ><input type="checkbox" bind:checked={form.lives_alone} /> Lives alone</label
            >
            <label class="flex items-center gap-2 text-base"
              ><input
                type="checkbox"
                bind:checked={form.primaryPhone_is_cell}
              /> Primary phone is cell</label
            >
          </div>
          <div class="grid grid-cols-2 gap-3">
            <label class="flex items-center gap-2 text-base"
              ><input
                type="checkbox"
                bind:checked={form.primaryPhone_can_text}
              /> Primary can text</label
            >
            <label class="flex items-center gap-2 text-base"
              ><input
                type="checkbox"
                bind:checked={form.secondaryPhone_is_cell}
              /> Secondary phone is cell</label
            >
          </div>
          <div class="grid grid-cols-2 gap-3">
            <label class="flex items-center gap-2 text-base"
              ><input
                type="checkbox"
                bind:checked={form.secondaryPhone_can_text}
              /> Secondary can text</label
            >
            <span></span>
          </div>
        </div>
      {/if}

      {#if step === 3}
        <!-- Transportation & Medical -->
        <div class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <!-- svelte-ignore a11y_label_has_associated_control -->
              <label class="block text-base font-medium"
                >Mobility Assistance</label
              >
              <select
                class="mt-1 w-full border rounded px-3 py-2 text-base"
                bind:value={form.mobility_assistance_enum}
              >
                {#each mobilityOptions as m}<option value={m}
                    >{m || "None"}</option
                  >{/each}
              </select>
            </div>
            <div>
              <!-- svelte-ignore a11y_label_has_associated_control -->
              <label class="block text-base font-medium">Residence *</label>
              <select
                required
                class="mt-1 w-full border rounded px-3 py-2 text-base"
                bind:value={form.residence_enum}
              >
                {#each residenceOptions as r}<option value={r}>{r}</option
                  >{/each}
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <label class="flex items-center gap-2 text-base"
              ><input type="checkbox" bind:checked={form.service_animal} /> Service
              animal</label
            >
            <label class="flex items-center gap-2 text-base"
              ><input type="checkbox" bind:checked={form.oxygen} /> Requires oxygen</label
            >
          </div>
          <div>
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label class="block text-base font-medium"
              >Service Animal Size</label
            >
            <select
              class="mt-1 w-full border rounded px-3 py-2 text-base"
              bind:value={form.service_animal_size_enum}
            >
              {#each serviceAnimalSizeOptions as s}<option value={s}
                  >{s || "None"}</option
                >{/each}
            </select>
          </div>

          <div class="grid grid-cols-1 gap-3">
            <div>
              <label class="block text-base font-medium">Allergies</label
              ><textarea
                rows="2"
                class="mt-1 w-full border rounded px-3 py-2 text-base"
                bind:value={form.allergies}
              />
            </div>
            <div>
              <label class="block text-base font-medium">Other Allergies</label
              ><textarea
                rows="2"
                class="mt-1 w-full border rounded px-3 py-2 text-base"
                bind:value={form.other_allergies}
              />
            </div>
            <div>
              <label class="block text-base font-medium"
                >Other Limitations</label
              ><textarea
                rows="2"
                class="mt-1 w-full border rounded px-3 py-2 text-base"
                bind:value={form.other_limitations}
              />
            </div>
          </div>

          <!-- Emergency Contact (optional) -->
          <div class="border-t pt-3 space-y-3">
            <h3 class="text-base font-semibold">Emergency Contact</h3>
            <div class="grid grid-cols-1 gap-3">
              <div>
                <label class="block text-base font-medium">Name</label>
                <input
                  class="mt-1 w-full border rounded px-3 py-2 text-base"
                  bind:value={form.emergency_contact_name}
                  placeholder="e.g., Jane Doe"
                />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-base font-medium">Relationship</label>
                  <input
                    class="mt-1 w-full border rounded px-3 py-2 text-base"
                    bind:value={form.emergency_contact_relationship}
                    placeholder="e.g., Daughter, Neighbor"
                  />
                </div>
                <div>
                  <label class="block text-base font-medium">Phone</label>
                  <input
                    class="mt-1 w-full border rounded px-3 py-2 text-base"
                    bind:value={form.emergency_contact_phone}
                    placeholder="e.g., 555-123-4567"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      {/if}

      {#if step === 4}
        <!-- Enrollment & Notes -->
        <div class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-base font-medium">Status *</label>
              <select
                required
                class="mt-1 w-full border rounded px-3 py-2 text-base"
                bind:value={form.client_status_enum}
              >
                {#each statusOptions as s}<option value={s}>{s}</option>{/each}
              </select>
            </div>
            <div>
              <label class="block text-base font-medium">Date Enrolled *</label>
              <input
                required
                type="date"
                class="mt-1 w-full border rounded px-3 py-2 text-base"
                bind:value={form.date_enrolled}
              />
            </div>
          </div>
          {#if form.client_status_enum === "Temporary Thru"}
            <div>
              <label class="block text-base font-medium"
                >Temporary Client Date</label
              >
              <input
                type="date"
                class="mt-1 w-full border rounded px-3 py-2 text-base"
                bind:value={form.temp_client_date}
              />
            </div>
          {/if}
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-base font-medium">Referral Method</label
              ><input
                class="mt-1 w-full border rounded px-3 py-2 text-base"
                bind:value={form.referral_method}
              />
            </div>
            <div>
              <label class="block text-base font-medium"
                >Driver Preference</label
              ><input
                class="mt-1 w-full border rounded px-3 py-2 text-base"
                bind:value={form.driver_preference}
              />
            </div>
          </div>
          <div class="grid grid-cols-1 gap-3">
            <div>
              <label class="block text-base font-medium"
                >Pickup Instructions</label
              ><textarea
                rows="2"
                class="mt-1 w-full border rounded px-3 py-2 text-base"
                bind:value={form.pick_up_instructions}
              />
            </div>
            <div>
              <label class="block text-base font-medium">Comments</label
              ><textarea
                rows="3"
                class="mt-1 w-full border rounded px-3 py-2 text-base"
                bind:value={form.comments}
              />
            </div>
          </div>
        </div>
      {/if}
    {/if}
  </div>

  <!-- Footer -->
  {#if createMode || mode === "edit"}
    <div class="px-6 py-4 border-t flex items-center justify-between">
      <div>
        {#if step > 1}<button
            on:click={back}
            class="px-4 py-2 rounded-lg border">Back</button
          >{/if}
      </div>
      <div class="flex gap-2">
        <button
          on:click={() => dispatch("close")}
          class="px-4 py-2 rounded-lg border">Cancel</button
        >
        {#if step < 4}
          <button
            on:click={next}
            class="px-4 py-2 rounded-lg bg-blue-600 text-white">Next</button
          >
        {:else}
          <button
            on:click={saveClient}
            disabled={saving}
            class="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : createMode
                ? "Create Client"
                : "Save Changes"}
          </button>
        {/if}
      </div>
    </div>
  {/if}
</div>
