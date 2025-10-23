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
    date_of_birth: string;
    city: string;
    state: string;
    client_status_enum: string;
    mobility_assistance_enum?: string | null;
    date_enrolled: string;
    org_id?: number;
  };

  const statusOptions = ['Active', 'Inactive', 'Pending'];
  // Updated to match your database enum - adjust these based on your actual enum values
  const mobilityOptions = ['', 'cane', 'light walker', 'roll-leader'];

  let form: Client = initializeForm();
  let saving = false;
  let errorMessage: string | null = null;

  function initializeForm(): Client {
    if (!client || createMode) {
      return {
        first_name: '',
        last_name: '',
        email: '',
        primary_phone: '',
        secondary_phone: '',
        date_of_birth: '',
        city: '',
        state: '',
        client_status_enum: 'Active',
        mobility_assistance_enum: null,
        date_enrolled: new Date().toISOString().split('T')[0],
        org_id: orgId
      };
    }
    
    return {
      client_id: client.client_id,
      first_name: client.first_name || '',
      last_name: client.last_name || '',
      email: client.email || '',
      primary_phone: client.primary_phone || '',
      secondary_phone: client.secondary_phone || '',
      date_of_birth: client.date_of_birth || '',
      city: client.city || '',
      state: client.state || '',
      client_status_enum: client.client_status_enum || 'Active',
      mobility_assistance_enum: client.mobility_assistance_enum || null,
      date_enrolled: client.date_enrolled || new Date().toISOString().split('T')[0],
      org_id: client.org_id || orgId
    };
  }

  $: form = initializeForm();

  function validateForm(): string | null {
    if (!form.first_name.trim()) return 'First name is required.';
    if (!form.last_name.trim()) return 'Last name is required.';
    if (!form.primary_phone.trim()) return 'Primary phone is required.';
    if (!form.date_of_birth) return 'Date of birth is required.';
    if (!form.city.trim()) return 'City is required.';
    if (!form.state.trim()) return 'State is required.';
    return null;
  }

  async function saveClient() {
    errorMessage = validateForm();
    if (errorMessage) return;

    saving = true;
    
    try {
      // Clean up the data before sending
      const clientData = {
        ...form,
        // Convert empty string to null for mobility assistance
        mobility_assistance_enum: form.mobility_assistance_enum === '' ? null : form.mobility_assistance_enum,
        // Remove empty strings
        email: form.email?.trim() || null,
        secondary_phone: form.secondary_phone?.trim() || null
      };
      
      // Remove org_id from create request - it will be added by middleware
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
        // Update existing client
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
    <div>
      <label class="block text-sm font-medium text-gray-700">First Name *</label>
      <input type="text" bind:value={form.first_name} class="mt-1 block w-full border rounded px-3 py-2 text-sm" />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700">Last Name *</label>
      <input type="text" bind:value={form.last_name} class="mt-1 block w-full border rounded px-3 py-2 text-sm" />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700">Email</label>
      <input type="email" bind:value={form.email} class="mt-1 block w-full border rounded px-3 py-2 text-sm" />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700">Primary Phone *</label>
      <input type="tel" bind:value={form.primary_phone} class="mt-1 block w-full border rounded px-3 py-2 text-sm" />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700">Secondary Phone</label>
      <input type="tel" bind:value={form.secondary_phone} class="mt-1 block w-full border rounded px-3 py-2 text-sm" />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700">Date of Birth *</label>
      <input type="date" bind:value={form.date_of_birth} class="mt-1 block w-full border rounded px-3 py-2 text-sm" />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700">City *</label>
      <input type="text" bind:value={form.city} class="mt-1 block w-full border rounded px-3 py-2 text-sm" />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700">State *</label>
      <input type="text" bind:value={form.state} maxlength="2" class="mt-1 block w-full border rounded px-3 py-2 text-sm uppercase" placeholder="NY" />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700">Status *</label>
      <select bind:value={form.client_status_enum} class="mt-1 block w-full border rounded px-3 py-2 text-sm">
        {#each statusOptions as status}
          <option value={status}>{status}</option>
        {/each}
      </select>
    </div>

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
      <label class="block text-sm font-medium text-gray-700">Date Enrolled *</label>
      <input type="date" bind:value={form.date_enrolled} class="mt-1 block w-full border rounded px-3 py-2 text-sm" />
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