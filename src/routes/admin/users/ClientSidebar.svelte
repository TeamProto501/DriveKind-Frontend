<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { API_BASE_URL } from '$lib/api';
  import { toastStore } from '$lib/toast';
  import { X } from '@lucide/svelte';

  export let client: Client | null = null;
  export let createMode: boolean = false;
  export let session: any = undefined;
  export let orgId: number;

  const dispatch = createEventDispatcher();

  type Client = {
    client_id?: number;
    first_name: string;
    last_name: string;
    email?: string;
    primary_phone: string;
    secondary_phone?: string;
    contact_pref?: string | null;
    date_of_birth: string;
    gender: string;
    street_address: string;
    address2?: string;
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
    client_status_enum: string;
    mobility_assistance_enum?: string | null;
    residence_enum: string;
    car_height_needed_enum: string;
    service_animal_size_enum?: string | null;
    date_enrolled: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    emergency_contact_relationship?: string;
    allergies?: string;
    pick_up_instructions?: string;
    comments?: string;
    other_limitations?: string;
    temp_client_date?: string;
    referral_method?: string;
    driver_preference?: string;
    org_id?: number;
  };

  // All enum values must match your database exactly (case-sensitive!)
  const statusOptions = ['Active', 'Inactive', 'Temporary Thru'];
  const mobilityOptions = ['', 'cane', 'light walker', 'roll-leader'];
  const genderOptions = ['Male', 'Female', 'Other'];
  const residenceOptions = ['house', 'apartment', 'mobile home', 'townhouse', 'condo'];
  const carHeightOptions = ['low', 'medium', 'high', 'low/medium', 'medium/high', 'low/medium/high'];
  const serviceAnimalSizeOptions = ['', 'small', 'medium', 'large'];
  const contactPrefOptions = ['', 'Phone', 'Email', 'Text'];

  let form: Client = initializeForm();
  let saving = false;
  let errorMessage: string | null = null;
  let showMoreInfo = false;

  function initializeForm(): Client {
    if (!client || createMode) {
      return {
        first_name: '',
        last_name: '',
        email: '',
        primary_phone: '',
        secondary_phone: '',
        contact_pref: null,
        date_of_birth: '',
        gender: 'Other',
        street_address: '',
        address2: '',
        city: '',
        state: '',
        zip_code: '',
        lives_alone: false,
        primaryPhone_is_cell: true,
        primaryPhone_can_text: true,
        secondaryPhone_is_cell: false,
        secondaryPhone_can_text: false,
        service_animal: false,
        oxygen: false,
        client_status_enum: 'Active',
        mobility_assistance_enum: null,
        residence_enum: 'house',
        car_height_needed_enum: 'medium',
        service_animal_size_enum: null,
        date_enrolled: new Date().toISOString().split('T')[0],
        emergency_contact_name: '',
        emergency_contact_phone: '',
        emergency_contact_relationship: '',
        allergies: '',
        pick_up_instructions: '',
        comments: '',
        other_limitations: '',
        temp_client_date: '',
        referral_method: '',
        driver_preference: '',
        org_id: orgId
      };
    }
    
    return { ...client, org_id: client.org_id || orgId };
  }

  $: form = initializeForm();

  function validateForm(): string | null {
    if (!form.first_name.trim()) return 'First name is required.';
    if (!form.last_name.trim()) return 'Last name is required.';
    if (!form.primary_phone.trim()) return 'Primary phone is required.';
    if (!form.date_of_birth) return 'Date of birth is required.';
    if (!form.gender) return 'Gender is required.';
    if (!form.street_address.trim()) return 'Street address is required.';
    if (!form.city.trim()) return 'City is required.';
    if (!form.state.trim()) return 'State is required.';
    if (!form.zip_code.trim()) return 'Zip code is required.';
    return null;
  }

  async function saveClient() {
    errorMessage = validateForm();
    if (errorMessage) return;

    saving = true;
    
    try {
      const clientData = {
        ...form,
        contact_pref: form.contact_pref === '' ? null : form.contact_pref,
        mobility_assistance_enum: form.mobility_assistance_enum === '' ? null : form.mobility_assistance_enum,
        service_animal_size_enum: form.service_animal_size_enum === '' ? null : form.service_animal_size_enum,
        email: form.email?.trim() || null,
        secondary_phone: form.secondary_phone?.trim() || null,
        address2: form.address2?.trim() || null,
        emergency_contact_name: form.emergency_contact_name?.trim() || null,
        emergency_contact_phone: form.emergency_contact_phone?.trim() || null,
        emergency_contact_relationship: form.emergency_contact_relationship?.trim() || null,
        allergies: form.allergies?.trim() || null,
        pick_up_instructions: form.pick_up_instructions?.trim() || null,
        comments: form.comments?.trim() || null,
        other_limitations: form.other_limitations?.trim() || null,
        temp_client_date: form.temp_client_date?.trim() || null,
        referral_method: form.referral_method?.trim() || null,
        driver_preference: form.driver_preference?.trim() || null,
      };
      
      if (createMode) {
        const { org_id, client_id, ...createData } = clientData;
        
        const response = await fetch(`${API_BASE_URL}/clients`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(createData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create client');
        }

        toastStore.success('Client created successfully');
      } else if (client) {
        const { client_id, ...updateData } = clientData;
        
        const response = await fetch(`${API_BASE_URL}/clients/${client.client_id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(updateData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update client');
        }

        toastStore.success('Client updated successfully');
      }

      dispatch('updated');
      dispatch('close');
      
    } catch (err: any) {
      console.error('Save client error:', err);
      errorMessage = err.message || 'Failed to save client';
      toastStore.error(errorMessage);
    } finally {
      saving = false;
    }
  }
</script>

<div class="fixed top-0 right-0 w-96 h-full bg-white shadow-xl border-l border-gray-200 flex flex-col z-50">
  <!-- Header -->
  <div class="px-6 py-4 border-b flex items-center justify-between">
    <h2 class="text-lg font-semibold text-gray-900">
      {createMode ? 'Add New Client' : 'Edit Client'}
    </h2>
    <button on:click={() => dispatch('close')} class="text-gray-500 hover:text-gray-700">
      <X class="w-5 h-5" />
    </button>
  </div>

  <!-- Body -->
  <div class="flex-1 overflow-y-auto p-6 space-y-4">
    {#if errorMessage}
      <div class="rounded-md bg-red-50 p-4">
        <p class="text-sm text-red-600">{errorMessage}</p>
      </div>
    {/if}

    <!-- Basic Info -->
    <div class="space-y-4">
      <h3 class="text-sm font-semibold text-gray-900">Basic Information</h3>
      
      <div>
        <label class="block text-sm font-medium text-gray-700">First Name *</label>
        <input type="text" bind:value={form.first_name} class="mt-1 block w-full border rounded px-3 py-2 text-sm" />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">Last Name *</label>
        <input type="text" bind:value={form.last_name} class="mt-1 block w-full border rounded px-3 py-2 text-sm" />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">Date of Birth *</label>
        <input type="date" bind:value={form.date_of_birth} class="mt-1 block w-full border rounded px-3 py-2 text-sm" />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">Gender *</label>
        <select bind:value={form.gender} class="mt-1 block w-full border rounded px-3 py-2 text-sm">
          {#each genderOptions as gender}
            <option value={gender}>{gender}</option>
          {/each}
        </select>
      </div>
    </div>

    <!-- Contact Info -->
    <div class="space-y-4 pt-4 border-t">
      <h3 class="text-sm font-semibold text-gray-900">Contact Information</h3>

      <div>
        <label class="block text-sm font-medium text-gray-700">Email</label>
        <input type="email" bind:value={form.email} class="mt-1 block w-full border rounded px-3 py-2 text-sm" />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">Contact Preference</label>
        <select bind:value={form.contact_pref} class="mt-1 block w-full border rounded px-3 py-2 text-sm">
          <option value="">None</option>
          {#each contactPrefOptions.slice(1) as pref}
            <option value={pref}>{pref}</option>
          {/each}
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">Primary Phone *</label>
        <input type="tel" bind:value={form.primary_phone} class="mt-1 block w-full border rounded px-3 py-2 text-sm" />
        <div class="mt-2 space-y-1">
          <label class="flex items-center text-xs text-gray-600">
            <input type="checkbox" bind:checked={form.primaryPhone_is_cell} class="mr-2" />
            Is cell phone
          </label>
          <label class="flex items-center text-xs text-gray-600">
            <input type="checkbox" bind:checked={form.primaryPhone_can_text} class="mr-2" />
            Can receive texts
          </label>
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">Secondary Phone</label>
        <input type="tel" bind:value={form.secondary_phone} class="mt-1 block w-full border rounded px-3 py-2 text-sm" />
        {#if form.secondary_phone}
          <div class="mt-2 space-y-1">
            <label class="flex items-center text-xs text-gray-600">
              <input type="checkbox" bind:checked={form.secondaryPhone_is_cell} class="mr-2" />
              Is cell phone
            </label>
            <label class="flex items-center text-xs text-gray-600">
              <input type="checkbox" bind:checked={form.secondaryPhone_can_text} class="mr-2" />
              Can receive texts
            </label>
          </div>
        {/if}
      </div>
    </div>

    <!-- Address -->
    <div class="space-y-4 pt-4 border-t">
      <h3 class="text-sm font-semibold text-gray-900">Address</h3>

      <div>
        <label class="block text-sm font-medium text-gray-700">Street Address *</label>
        <input type="text" bind:value={form.street_address} class="mt-1 block w-full border rounded px-3 py-2 text-sm" />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">Address Line 2</label>
        <input type="text" bind:value={form.address2} class="mt-1 block w-full border rounded px-3 py-2 text-sm" placeholder="Apt, Suite, etc." />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium text-gray-700">City *</label>
          <input type="text" bind:value={form.city} class="mt-1 block w-full border rounded px-3 py-2 text-sm" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">State *</label>
          <input type="text" bind:value={form.state} maxlength="2" class="mt-1 block w-full border rounded px-3 py-2 text-sm uppercase" placeholder="NY" />
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">Zip Code *</label>
        <input type="text" bind:value={form.zip_code} maxlength="10" class="mt-1 block w-full border rounded px-3 py-2 text-sm" />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">Residence Type *</label>
        <select bind:value={form.residence_enum} class="mt-1 block w-full border rounded px-3 py-2 text-sm">
          {#each residenceOptions as residence}
            <option value={residence}>{residence.charAt(0).toUpperCase() + residence.slice(1)}</option>
          {/each}
        </select>
      </div>

      <div>
        <label class="flex items-center text-sm text-gray-700">
          <input type="checkbox" bind:checked={form.lives_alone} class="mr-2" />
          Lives alone
        </label>
      </div>
    </div>

    <!-- Transportation Needs -->
    <div class="space-y-4 pt-4 border-t">
      <h3 class="text-sm font-semibold text-gray-900">Transportation Needs</h3>

      <div>
        <label class="block text-sm font-medium text-gray-700">Mobility Assistance</label>
        <select bind:value={form.mobility_assistance_enum} class="mt-1 block w-full border rounded px-3 py-2 text-sm">
          <option value="">None</option>
          <option value="cane">Cane</option>
          <option value="light walker">Light Walker</option>
          <option value="roll-leader">Roll-Leader</option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">Car Height Needed *</label>
        <select bind:value={form.car_height_needed_enum} class="mt-1 block w-full border rounded px-3 py-2 text-sm">
          {#each carHeightOptions as height}
            <option value={height}>{height.charAt(0).toUpperCase() + height.slice(1)}</option>
          {/each}
        </select>
      </div>

      <div>
        <label class="flex items-center text-sm text-gray-700">
          <input type="checkbox" bind:checked={form.service_animal} class="mr-2" />
          Service animal
        </label>
      </div>

      {#if form.service_animal}
        <div>
          <label class="block text-sm font-medium text-gray-700">Service Animal Size</label>
          <select bind:value={form.service_animal_size_enum} class="mt-1 block w-full border rounded px-3 py-2 text-sm">
            <option value="">Select size</option>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </div>
      {/if}

      <div>
        <label class="flex items-center text-sm text-gray-700">
          <input type="checkbox" bind:checked={form.oxygen} class="mr-2" />
          Requires oxygen
        </label>
      </div>
    </div>

    <!-- Additional Information (Collapsible) -->
    <div class="pt-4 border-t">
      <button
        type="button"
        on:click={() => showMoreInfo = !showMoreInfo}
        class="text-sm font-semibold text-blue-600 hover:text-blue-700"
      >
        {showMoreInfo ? 'Hide' : 'Show'} Additional Information
      </button>

      {#if showMoreInfo}
        <div class="mt-4 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Emergency Contact Name</label>
            <input type="text" bind:value={form.emergency_contact_name} class="mt-1 block w-full border rounded px-3 py-2 text-sm" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Emergency Contact Phone</label>
            <input type="tel" bind:value={form.emergency_contact_phone} class="mt-1 block w-full border rounded px-3 py-2 text-sm" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Emergency Contact Relationship</label>
            <input type="text" bind:value={form.emergency_contact_relationship} class="mt-1 block w-full border rounded px-3 py-2 text-sm" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Allergies</label>
            <textarea bind:value={form.allergies} rows="2" class="mt-1 block w-full border rounded px-3 py-2 text-sm"></textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Other Limitations</label>
            <textarea bind:value={form.other_limitations} rows="2" class="mt-1 block w-full border rounded px-3 py-2 text-sm"></textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Pick Up Instructions</label>
            <textarea bind:value={form.pick_up_instructions} rows="2" class="mt-1 block w-full border rounded px-3 py-2 text-sm"></textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Comments</label>
            <textarea bind:value={form.comments} rows="3" class="mt-1 block w-full border rounded px-3 py-2 text-sm"></textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Referral Method</label>
            <input type="text" bind:value={form.referral_method} class="mt-1 block w-full border rounded px-3 py-2 text-sm" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Driver Preference</label>
            <input type="text" bind:value={form.driver_preference} class="mt-1 block w-full border rounded px-3 py-2 text-sm" />
          </div>
        </div>
      {/if}
    </div>

    <!-- Status & Enrollment -->
    <div class="space-y-4 pt-4 border-t">
      <div>
        <label class="block text-sm font-medium text-gray-700">Status *</label>
        <select bind:value={form.client_status_enum} class="mt-1 block w-full border rounded px-3 py-2 text-sm">
          {#each statusOptions as status}
            <option value={status}>{status}</option>
          {/each}
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">Date Enrolled *</label>
        <input type="date" bind:value={form.date_enrolled} class="mt-1 block w-full border rounded px-3 py-2 text-sm" />
      </div>

      {#if form.client_status_enum === 'Temporary Thru'}
        <div>
          <label class="block text-sm font-medium text-gray-700">Temporary Client Date</label>
          <input type="date" bind:value={form.temp_client_date} class="mt-1 block w-full border rounded px-3 py-2 text-sm" />
        </div>
      {/if}
    </div>
  </div>

  <!-- Footer -->
  <div class="px-6 py-4 border-t flex justify-end space-x-2">
    <button 
      on:click={() => dispatch('close')} 
      disabled={saving}
      class="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-50 disabled:opacity-50"
    >
      Cancel
    </button>
    <button 
      on:click={saveClient} 
      disabled={saving} 
      class="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
    >
      {saving ? 'Saving...' : (createMode ? 'Create Client' : 'Save Changes')}
    </button>
  </div>
</div>