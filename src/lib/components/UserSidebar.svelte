<script lang="ts">
  import { supabase } from '$lib/supabase';
  import { createEventDispatcher, onMount } from 'svelte';

  export let user: any = null;        
  export let createMode: boolean = false; 

  const dispatch = createEventDispatcher();

  let form = {
    first_name: '',
    last_name: '',
    email: '',
    primary_phone: '',
    role: [] as string[]
  };

  const defaultInsert = {
    org_id: 1,
    dob: '1970-01-01',
    training_completed: false,
    mileage_reimbursment: false,
    city: 'N/A',
    state: 'N/A'
  };

  let saving = false;
  let errorMessage: string | null = null;

  onMount(() => {
    if (user && !createMode) {
      form = {
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        primary_phone: user.primary_phone || '',
        role: user.role || []
      };
    }
  });

  function validateForm() {
    if (!form.first_name.trim()) {
      return 'First name is required.';
    }
    if (!form.last_name.trim()) {
      return 'Last name is required.';
    }
    if (!form.email.trim() && !form.primary_phone.trim()) {
      return 'Either email or phone is required.';
    }
    return null;
  }

  async function saveUser() {
    errorMessage = validateForm();
    if (errorMessage) return;

    saving = true;

    if (createMode) {
      const insertData = { ...defaultInsert, ...form };

      const { error } = await supabase.from('staff_profiles').insert([insertData]);
      if (error) {
        console.error(error);
        errorMessage = error.message;
      } else {
        dispatch('updated');
        dispatch('close');
      }
    } else {
      const { error } = await supabase
        .from('staff_profiles')
        .update(form)
        .eq('user_id', user.user_id);

      if (error) {
        console.error(error);
        errorMessage = error.message;
      } else {
        dispatch('updated');
        dispatch('close');
      }
    }

    saving = false;
  }
</script>

<div class="fixed top-0 right-0 w-96 h-full bg-white shadow-xl border-l border-gray-200 flex flex-col">
  <!-- Header -->
  <div class="px-6 py-4 border-b flex items-center justify-between">
    <h2 class="text-lg font-semibold text-gray-900">
      {createMode ? 'Add New User' : 'Edit User'}
    </h2>
    <button on:click={() => dispatch('close')} class="text-gray-500 hover:text-gray-700">✕</button>
  </div>

  <!-- Body -->
  <div class="flex-1 overflow-y-auto p-6 space-y-4">
    {#if errorMessage}
      <p class="text-sm text-red-600">{errorMessage}</p>
    {/if}

    <div>
      <label class="block text-sm font-medium text-gray-700">First Name *</label>
      <input
        type="text"
        bind:value={form.first_name}
        class="mt-1 block w-full border rounded px-3 py-2 text-sm"
      />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700">Last Name *</label>
      <input
        type="text"
        bind:value={form.last_name}
        class="mt-1 block w-full border rounded px-3 py-2 text-sm"
      />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700">Email</label>
      <input
        type="email"
        bind:value={form.email}
        class="mt-1 block w-full border rounded px-3 py-2 text-sm"
      />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700">Phone</label>
      <input
        type="tel"
        bind:value={form.primary_phone}
        class="mt-1 block w-full border rounded px-3 py-2 text-sm"
      />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700">Role(s)</label>
      <select multiple bind:value={form.role} class="mt-1 block w-full border rounded px-3 py-2 text-sm">
        <option value="Admin">Admin</option>
        <option value="Dispatcher">Dispatcher</option>
        <option value="Driver">Driver</option>
        <option value="Volunteer">Volunteer</option>
        <option value="Client">Client</option>
      </select>
      <p class="text-xs text-gray-500 mt-1">Hold Ctrl (Windows) or Cmd (Mac) to select multiple.</p>
    </div>

    <div class="border-t pt-4 text-sm text-gray-500">
      More information fields will go here (DOB, address, training, etc.) so admins can scroll down and edit as needed.
    </div>
  </div>

  <!-- Footer -->
  <div class="px-6 py-4 border-t flex justify-end space-x-2">
    <button
      on:click={() => dispatch('close')}
      class="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-50"
    >
      Cancel
    </button>
    <button
      on:click={saveUser}
      disabled={saving}
      class="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
    >
      {saving ? 'Saving...' : (createMode ? 'Create User' : 'Save Changes')}
    </button>
  </div>
</div>
