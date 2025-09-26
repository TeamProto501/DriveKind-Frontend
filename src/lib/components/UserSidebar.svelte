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
    role: [] as string[],
    dob: '1970-01-01',
    city: 'N/A',
    state: 'N/A',
    training_completed: false,
    mileage_reimbursment: false
  };

  const defaultInsert = {
    org_id: 1
  };

  let saving = false;
  let errorMessage: string | null = null;
  let showMoreInfo = false;

  // Track collapsed/expanded state for each group
  let expanded = {
    personal: false,
    training: false,
    preferences: false
  };

  const roles = ['Admin', 'Dispatcher', 'Driver', 'Volunteer', 'Client'];
  let userToken: string | null = null;

  onMount(async () => {
    // Get auth token
    const { data: { session } } = await supabase.auth.getSession();
    userToken = session?.access_token;

    if (user && !createMode) {
      form = {
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        primary_phone: user.primary_phone || '',
        role: user.role || [],
        dob: user.dob || '1970-01-01',
        city: user.city || 'N/A',
        state: user.state || 'N/A',
        training_completed: user.training_completed ?? false,
        mileage_reimbursment: user.mileage_reimbursment ?? false
      };
    }
  });

  function validateForm() {
    if (!form.first_name.trim()) return 'First name is required.';
    if (!form.last_name.trim()) return 'Last name is required.';
    if (!form.email.trim() && !form.primary_phone.trim()) return 'Either email or phone is required.';
    return null;
  }

  function toggleRole(role: string) {
    if (form.role.includes(role)) {
      form.role = form.role.filter(r => r !== role);
    } else {
      form.role = [...form.role, role];
    }
  }

  async function saveUser() {
    errorMessage = validateForm();
    if (errorMessage) return;

    saving = true;

    try {
      const url = createMode
        ? 'https://your-api-url.com/profiles'
        : `https://your-api-url.com/profiles/${user.user_id}`;

      const method = createMode ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...defaultInsert, ...form })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Request failed with status ${res.status}`);
      }

      dispatch('updated');
      dispatch('close');
    } catch (err: any) {
      console.error(err);
      errorMessage = err.message || 'Failed to save user';
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

    <!-- Core Info -->
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
      <label class="block text-sm font-medium text-gray-700">Phone</label>
      <input type="tel" bind:value={form.primary_phone} class="mt-1 block w-full border rounded px-3 py-2 text-sm" />
    </div>

    <!-- Roles with Checkboxes -->
    <div>
      <label class="block text-sm font-medium text-gray-700">Roles</label>
      <div class="mt-2 space-y-2">
        {#each roles as role}
          <label class="flex items-center space-x-2 text-sm">
            <input type="checkbox" checked={form.role.includes(role)} on:change={() => toggleRole(role)} />
            <span>{role}</span>
          </label>
        {/each}
      </div>
    </div>

    <!-- More Info Toggle -->
    <div class="mt-4 border-t pt-4">
      <button on:click={() => (showMoreInfo = !showMoreInfo)} class="text-blue-600 hover:underline text-sm">
        {showMoreInfo ? 'Hide additional fields' : 'Show more information'}
      </button>
    </div>

    <!-- Additional Fields (Accordion) -->
    {#if showMoreInfo}
      <!-- Personal Info -->
      <div class="mt-4 border rounded">
        <button
          class="w-full text-left px-4 py-2 bg-gray-100 flex justify-between items-center"
          on:click={() => (expanded.personal = !expanded.personal)}
        >
          <span class="text-sm font-semibold">Personal Information</span>
          <span>{expanded.personal ? '−' : '+'}</span>
        </button>
        {#if expanded.personal}
          <div class="p-4 space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Date of Birth</label>
              <input type="date" bind:value={form.dob} class="mt-1 block w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">City</label>
              <input type="text" bind:value={form.city} class="mt-1 block w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">State</label>
              <input type="text" bind:value={form.state} class="mt-1 block w-full border rounded px-3 py-2 text-sm" />
            </div>
          </div>
        {/if}
      </div>

      <!-- Training -->
      <div class="mt-4 border rounded">
        <button
          class="w-full text-left px-4 py-2 bg-gray-100 flex justify-between items-center"
          on:click={() => (expanded.training = !expanded.training)}
        >
          <span class="text-sm font-semibold">Training</span>
          <span>{expanded.training ? '−' : '+'}</span>
        </button>
        {#if expanded.training}
          <div class="p-4 space-y-2">
            <label class="flex items-center space-x-2 text-sm">
              <input type="checkbox" bind:checked={form.training_completed} />
              <span>Training Completed</span>
            </label>
          </div>
        {/if}
      </div>

      <!-- Preferences -->
      <div class="mt-4 border rounded">
        <button
          class="w-full text-left px-4 py-2 bg-gray-100 flex justify-between items-center"
          on:click={() => (expanded.preferences = !expanded.preferences)}
        >
          <span class="text-sm font-semibold">Preferences</span>
          <span>{expanded.preferences ? '−' : '+'}</span>
        </button>
        {#if expanded.preferences}
          <div class="p-4 space-y-2">
            <label class="flex items-center space-x-2 text-sm">
              <input type="checkbox" bind:checked={form.mileage_reimbursment} />
              <span>Mileage Reimbursement</span>
            </label>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Footer -->
  <div class="px-6 py-4 border-t flex justify-end space-x-2">
    <button on:click={() => dispatch('close')} class="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-50">
      Cancel
    </button>
    <button on:click={saveUser} disabled={saving} class="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
      {saving ? 'Saving...' : (createMode ? 'Create User' : 'Save Changes')}
    </button>
  </div>
</div>


