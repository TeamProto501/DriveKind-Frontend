<script lang="ts">
  import RoleGuard from '$lib/components/RoleGuard.svelte';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';
  import type { PageData, ActionData } from './$types';

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

  let { data }: { data: PageData } = $props();
  let form = $derived($page.form as ActionData);

  let profile = $state<StaffProfile | null>(data.profile);
  let editing = $state(false);
  let loading = $state(false);

  // Initialize form data from the loaded profile
  let formData = $state(profile ? { ...profile } : {} as StaffProfile);

  // Update formData when profile changes (after form submission) using $effect
  $effect(() => {
    if (form?.success && form?.profile) {
      profile = form.profile;
      formData = { ...form.profile };
      editing = false;
    }
  });

  function cancelEdit() {
    if (profile) formData = { ...profile };
    editing = false;
  }

  // Check if user is admin
  let isAdmin = $derived(profile && (Array.isArray(profile.role)
    ? profile.role.includes('Admin')
    : profile.role === 'Admin'));
</script>

<RoleGuard requiredRoles={['Client', 'Admin', 'Driver', 'Dispatcher', 'Volunteer']}>
  <div class="min-h-screen bg-gray-50">
    <Breadcrumbs />

    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {#if !profile}
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 class="text-2xl font-semibold text-gray-900 mb-4">My Profile</h2>
          <p class="text-center text-red-600 py-8">
            Profile not found. Please contact an administrator to set up your profile.
          </p>
        </div>
      {:else}
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 class="text-2xl font-semibold text-gray-900 mb-4">My Profile</h2>

          {#if form?.error}
            <div class="mb-4 rounded-md bg-red-50 p-4">
              <div class="text-sm text-red-800">
                {form.error}
              </div>
            </div>
          {/if}

          {#if form?.success}
            <div class="mb-4 rounded-md bg-green-50 p-4">
              <div class="text-sm text-green-800">
                Profile updated successfully!
              </div>
            </div>
          {/if}

          {#if editing}
            <form
              method="POST"
              action="?/updateProfile"
              use:enhance={() => {
                loading = true;
                return async ({ update }) => {
                  loading = false;
                  await update();
                };
              }}
            >
              <div class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label for="first_name" class="block text-sm font-medium text-gray-700">First Name</label>
                    <input
                      id="first_name"
                      name="first_name"
                      type="text"
                      bind:value={formData.first_name}
                      required
                      class="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  
                  <div>
                    <label for="last_name" class="block text-sm font-medium text-gray-700">Last Name</label>
                    <input
                      id="last_name"
                      name="last_name"
                      type="text"
                      bind:value={formData.last_name}
                      required
                      class="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    bind:value={formData.email}
                    class="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label for="primary_phone" class="block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    id="primary_phone"
                    name="primary_phone"
                    type="tel"
                    bind:value={formData.primary_phone}
                    class="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label for="dob" class="block text-sm font-medium text-gray-700">Date of Birth</label>
                  <input
                    id="dob"
                    name="dob"
                    type="date"
                    bind:value={formData.dob}
                    class="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label for="home_address" class="block text-sm font-medium text-gray-700">Home Address</label>
                  <input
                    id="home_address"
                    name="home_address"
                    type="text"
                    bind:value={formData.home_address}
                    class="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label for="city" class="block text-sm font-medium text-gray-700">City</label>
                    <input
                      id="city"
                      name="city"
                      type="text"
                      bind:value={formData.city}
                      class="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  
                  <div>
                    <label for="state" class="block text-sm font-medium text-gray-700">State</label>
                    <input
                      id="state"
                      name="state"
                      type="text"
                      bind:value={formData.state}
                      class="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  
                  <div>
                    <label for="zip_code" class="block text-sm font-medium text-gray-700">Zip Code</label>
                    <input
                      id="zip_code"
                      name="zip_code"
                      type="text"
                      bind:value={formData.zip_code}
                      class="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label for="contact_type_pref" class="block text-sm font-medium text-gray-700">Contact Preference</label>
                  <select
                    id="contact_type_pref"
                    name="contact_type_pref"
                    bind:value={formData.contact_type_pref}
                    class="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select preference</option>
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="text">Text</option>
                  </select>
                </div>
              </div>

              <div class="mt-6 flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  on:click={cancelEdit}
                  disabled={loading}
                  class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          {:else}
            <div class="space-y-3">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p class="text-sm font-medium text-gray-500">Name</p>
                  <p class="mt-1 text-sm text-gray-900">{profile.first_name} {profile.last_name}</p>
                </div>
                <div>
                  <p class="text-sm font-medium text-gray-500">Email</p>
                  <p class="mt-1 text-sm text-gray-900">{profile.email || '-'}</p>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p class="text-sm font-medium text-gray-500">Phone</p>
                  <p class="mt-1 text-sm text-gray-900">{profile.primary_phone || '-'}</p>
                </div>
                <div>
                  <p class="text-sm font-medium text-gray-500">Date of Birth</p>
                  <p class="mt-1 text-sm text-gray-900">{profile.dob || '-'}</p>
                </div>
              </div>

              <div>
                <p class="text-sm font-medium text-gray-500">Address</p>
                <p class="mt-1 text-sm text-gray-900">
                  {#if profile.home_address || profile.city || profile.state || profile.zip_code}
                    {[profile.home_address, profile.city, profile.state, profile.zip_code].filter(Boolean).join(', ')}
                  {:else}
                    -
                  {/if}
                </p>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p class="text-sm font-medium text-gray-500">Role(s)</p>
                  <p class="mt-1 text-sm text-gray-900">{Array.isArray(profile.role) ? profile.role.join(', ') : profile.role}</p>
                </div>
                <div>
                  <p class="text-sm font-medium text-gray-500">Contact Preference</p>
                  <p class="mt-1 text-sm text-gray-900">{profile.contact_type_pref || '-'}</p>
                </div>
              </div>
            </div>

            <div class="mt-6">
              <button
                on:click={() => (editing = true)}
                class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Edit Profile
              </button>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</RoleGuard>











