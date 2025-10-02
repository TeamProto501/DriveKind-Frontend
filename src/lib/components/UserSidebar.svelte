<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { updateStaffProfile } from '$lib/api';
  import type { AuthInfo } from '$lib/types';
  import { browser } from '$app/environment';
  import { supabase } from '$lib/supabase';

  export let user: StaffProfile | null = null;
  export let createMode: boolean = false;
  export let session: any = undefined;

  const dispatch = createEventDispatcher();

  type StaffForm = {
    first_name: string;
    last_name: string;
    email?: string;
    primary_phone?: string;
    role: string[];
    dob: string;
    city: string;
    state: string;
    training_completed: boolean;
    mileage_reimbursement: boolean;
  };

  type StaffProfile = StaffForm & { user_id: string };

  const roles = ['Admin', 'Dispatcher', 'Driver', 'Volunteer', 'Client'];
  const defaultInsert = { org_id: 1 };

  let form: StaffForm = initializeForm();
  let saving = false;
  let errorMessage: string | null = null;
  let showMoreInfo = false;
  let expanded = { personal: false, training: false, preferences: false };
  let tempPassword = '';

  function initializeForm(): StaffForm {
    if (user && !createMode) {
      return {
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        primary_phone: user.primary_phone || '',
        role: Array.isArray(user.role) ? user.role : [user.role],
        dob: user.dob || '1970-01-01',
        city: user.city || 'N/A',
        state: user.state || 'N/A',
        training_completed: user.training_completed ?? false,
        mileage_reimbursement: user.mileage_reimbursement ?? false
      };
    } 
    return {
      first_name: '',
      last_name: '',
      email: '',
      primary_phone: '',
      role: [],
      dob: '1970-01-01',
      city: 'N/A',
      state: 'N/A',
      training_completed: false,
      mileage_reimbursement: false
    };
  }

  $: form = initializeForm();

  function validateForm(): string | null {
    if (!form.first_name.trim()) return 'First name is required.';
    if (!form.last_name.trim()) return 'Last name is required.';
    if (!form.email?.trim() && !form.primary_phone?.trim())
      return 'Either email or phone is required.';
    if (createMode && !form.email?.trim()) 
      return 'Email is required when creating a new user.';
    if (createMode && !tempPassword) 
      return 'Temporary password is required for new users.';
    if (createMode && tempPassword.length < 6)
      return 'Password must be at least 6 characters.';
    return null;
  }

  function toggleRole(role: string) {
    form.role = form.role.includes(role)
      ? form.role.filter(r => r !== role)
      : [...form.role, role];
  }

  async function saveUser() {
    console.log('=== SAVE USER DEBUG ===');
    
    errorMessage = validateForm();
    if (errorMessage) return;

    saving = true;
    
    try {
      if (createMode) {
        console.log('Creating new user via server action...');
        
        // Use FormData to call server action
        const formData = new FormData();
        formData.append('email', form.email!);
        formData.append('password', tempPassword);
        formData.append('first_name', form.first_name);
        formData.append('last_name', form.last_name);
        formData.append('profileData', JSON.stringify({
          ...defaultInsert,
          ...form
        }));

        const response = await fetch('?/createUser', {
          method: 'POST',
          body: formData
        });

        const result = await response.json();
        
        if (result.type === 'error') {
          errorMessage = result.error?.message || 'Failed to create user';
          saving = false;
          return;
        }

        if (!result.data?.success) {
          errorMessage = result.data?.error || 'Failed to create user';
          saving = false;
          return;
        }

        console.log('User created successfully');
        
      } else if (user) {
        console.log('Updating staff profile for user:', user.user_id);
        
        let authInfo: AuthInfo;
        if (session) {
          authInfo = {
            token: session.access_token,
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            user: session.user,
            userId: session.user?.id
          };
        } else if (browser) {
          const { data: { session: freshSession } } = await supabase.auth.getSession();
          if (!freshSession) {
            errorMessage = 'No session found';
            saving = false;
            return;
          }
          authInfo = {
            token: freshSession.access_token,
            access_token: freshSession.access_token,
            refresh_token: freshSession.refresh_token,
            user: freshSession.user,
            userId: freshSession.user?.id
          };
        } else {
          errorMessage = 'No session found';
          saving = false;
          return;
        }
        
        await updateStaffProfile(user.user_id, form, authInfo);
      }

      dispatch('updated');
      dispatch('close');
      
    } catch (err: any) {
      console.error('Save user error:', err);
      errorMessage = err.message || 'Failed to save user';
    } finally {
      saving = false;
    }
  }
</script>

<div class="fixed top-0 right-0 w-96 h-full bg-white shadow-xl border-l border-gray-200 flex flex-col z-50">
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
      <label class="block text-sm font-medium text-gray-700">Email {createMode ? '*' : ''}</label>
      <input 
        type="email" 
        bind:value={form.email} 
        disabled={!createMode && !!user}
        class="mt-1 block w-full border rounded px-3 py-2 text-sm disabled:bg-gray-100" 
      />
      {#if !createMode && user}
        <p class="mt-1 text-xs text-gray-500">Email cannot be changed after creation</p>
      {/if}
    </div>

    {#if createMode}
      <div>
        <label class="block text-sm font-medium text-gray-700">Temporary Password *</label>
        <input 
          type="password" 
          bind:value={tempPassword} 
          placeholder="User will be able to change this"
          class="mt-1 block w-full border rounded px-3 py-2 text-sm" 
        />
        <p class="mt-1 text-xs text-gray-500">Minimum 6 characters. User can change this after first login.</p>
      </div>
    {/if}

    <div>
      <label class="block text-sm font-medium text-gray-700">Phone</label>
      <input type="tel" bind:value={form.primary_phone} class="mt-1 block w-full border rounded px-3 py-2 text-sm" />
    </div>

    <!-- Roles -->
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
              <input type="date" bind:value={form.dob} class="mt-1 w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">City</label>
              <input type="text" bind:value={form.city} class="mt-1 w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">State</label>
              <input type="text" bind:value={form.state} class="mt-1 w-full border rounded px-3 py-2 text-sm" />
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
              <input type="checkbox" bind:checked={form.mileage_reimbursement} />
              <span>Mileage Reimbursement</span>
            </label>
          </div>
        {/if}
      </div>
    {/if}
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
      on:click={saveUser} 
      disabled={saving} 
      class="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
    >
      {saving ? 'Saving...' : (createMode ? 'Create User' : 'Save Changes')}
    </button>
  </div>
</div>