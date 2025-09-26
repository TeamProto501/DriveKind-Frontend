<script lang="ts">
  import RoleGuard from '$lib/components/RoleGuard.svelte';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import { getStaffProfileById, updateStaffProfile } from '$lib/api';
  import type { AuthInfo } from '$lib/types';
  import { authStore } from '$lib/stores/auth';
  import { onDestroy } from 'svelte';

  type StaffProfile = {
    user_id: string;
    first_name: string;
    last_name: string;
    email?: string;
    primary_phone?: string;
    dob?: string;
    home_address?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    contact_type_pref?: string;
    role: string[] | string;
  };

  let profile: StaffProfile | null = null;
  let formData: StaffProfile = {} as StaffProfile;
  let editing = false;
  let loading = true;
  let isAdmin = false;
  let userId: string | null = null;
  let authInfo: AuthInfo | null = null;

  // --- Load profile ---
  async function loadProfile() {
    if (!userId || !authInfo?.token) return;

    loading = true;
    try {
      profile = await getStaffProfileById(userId, authInfo);
      formData = { ...profile };
      isAdmin = Array.isArray(profile.role)
        ? profile.role.includes('Admin')
        : profile.role === 'Admin';
    } catch (err: any) {
      console.error('Failed to load profile:', err);
      profile = null;
    } finally {
      loading = false;
    }
  }

  // --- Save profile ---
  async function saveProfile() {
    if (!userId || !authInfo || !profile) return;

    try {
      const updatedData: StaffProfile = {
        ...formData,
        role: isAdmin ? formData.role : profile.role
      };

      profile = await updateStaffProfile(userId, updatedData, authInfo);
      formData = { ...profile };
      editing = false;
    } catch (err: any) {
      console.error('Save failed:', err);
    }
  }

  function cancelEdit() {
    if (profile) formData = { ...profile };
    editing = false;
  }

  // --- Subscribe to authStore ---
  const unsubscribe = authStore.subscribe((value) => {
    authInfo = value;
    if (authInfo?.userId) {
      userId = authInfo.userId;
      loadProfile();
    } else {
      userId = null;
      profile = null;
      formData = {} as StaffProfile;
      loading = false;
    }
  });

  onDestroy(() => unsubscribe());
</script>

<RoleGuard requiredRoles={['Client', 'Admin', 'Driver', 'Dispatcher', 'Volunteer']}>
  <div class="min-h-screen bg-gray-50">
    <Breadcrumbs />

    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {#if loading}
        <p class="text-center text-gray-500 py-8">Loading profile...</p>
      {:else if !profile}
        <p class="text-center text-red-600 py-8">Profile not found.</p>
      {:else}
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 class="text-2xl font-semibold text-gray-900 mb-4">My Profile</h2>

          {#if editing}
            <div class="space-y-4">
              <input type="text" bind:value={formData.first_name} placeholder="First Name" class="w-full border rounded px-3 py-2 text-sm" />
              <input type="text" bind:value={formData.last_name} placeholder="Last Name" class="w-full border rounded px-3 py-2 text-sm" />
              <input type="email" bind:value={formData.email} placeholder="Email" class="w-full border rounded px-3 py-2 text-sm" />
              <input type="tel" bind:value={formData.primary_phone} placeholder="Phone" class="w-full border rounded px-3 py-2 text-sm" />
              <input type="date" bind:value={formData.dob} class="w-full border rounded px-3 py-2 text-sm" />
              <input type="text" bind:value={formData.city} placeholder="City" class="w-full border rounded px-3 py-2 text-sm" />
              <input type="text" bind:value={formData.state} placeholder="State" class="w-full border rounded px-3 py-2 text-sm" />
              <input type="text" bind:value={formData.zip_code} placeholder="Zip" class="w-full border rounded px-3 py-2 text-sm" />
            </div>

            <div class="mt-4 flex gap-2">
              <button on:click={saveProfile} class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
              <button on:click={cancelEdit} class="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50">Cancel</button>
            </div>
          {:else}
            <div class="space-y-2">
              <p><strong>Name:</strong> {profile.first_name} {profile.last_name}</p>
              <p><strong>Email:</strong> {profile.email || '-'}</p>
              <p><strong>Phone:</strong> {profile.primary_phone || '-'}</p>
              <p><strong>DOB:</strong> {profile.dob || '-'}</p>
              <p><strong>Address:</strong> {profile.city || '-'}, {profile.state || '-'} {profile.zip_code || '-'}</p>
              <p><strong>Role(s):</strong> {Array.isArray(profile.role) ? profile.role.join(', ') : profile.role}</p>
            </div>

            <div class="mt-4">
              <button on:click={() => (editing = true)} class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Edit Profile</button>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</RoleGuard>











