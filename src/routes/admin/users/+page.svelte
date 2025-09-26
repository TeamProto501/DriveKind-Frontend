<script lang="ts">
  import RoleGuard from '$lib/components/RoleGuard.svelte';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import { Users, Plus, Search, Filter } from '@lucide/svelte';
  import { supabase } from '$lib/supabase';
  import { onMount } from 'svelte';
  import UserSidebar from '$lib/components/UserSidebar.svelte';

  let staffProfiles: any[] = [];
  let filteredProfiles: any[] = [];
  let loading = true;

  let searchQuery = "";
  let roleFilter: string = "All";
  let roles = ["All", "Admin", "Dispatcher", "Driver", "Volunteer", "Client"];

  let selectedUser: any = null;
  let isCreateMode = false;

  async function loadUsers() {
    loading = true;
    const { data, error } = await supabase.from("staff_profiles").select("*");
    if (error) {
      console.error(error);
    } else {
      staffProfiles = data;
      applyFilters();
    }
    loading = false;
  }

  function applyFilters() {
    let results = staffProfiles;

    // search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(
        (u) =>
          `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) ||
          (u.email && u.email.toLowerCase().includes(q)) ||
          (u.primary_phone && u.primary_phone.includes(q))
      );
    }

    // role filter
    if (roleFilter !== "All") {
      results = results.filter((u) => u.role?.includes(roleFilter));
    }

    filteredProfiles = results;
  }

  function openSidebar(user: any = null) {
    selectedUser = user;
    isCreateMode = user === null;
  }

  function closeSidebar() {
    selectedUser = null;
    isCreateMode = false;
  }

  onMount(() => {
    loadUsers();
  });
</script>

<RoleGuard requiredRoles={['Admin']}>
  <div class="min-h-screen bg-gray-50">
    <Breadcrumbs />

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="mb-8 flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">User Management</h1>
          <p class="text-gray-600 mt-2">Manage user accounts, roles, and permissions.</p>
        </div>

        <!-- Add User Button -->
        <button
          class="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition"
          on:click={() => openSidebar(null)}
        >
          <Plus class="w-4 h-4" /> Add User
        </button>
      </div>

      <div class="bg-white rounded-lg shadow-sm border border-gray-200">
        <!-- Table Header with search + filters -->
        <div class="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div class="flex items-center gap-2 w-full sm:w-1/2">
            <Search class="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              bind:value={searchQuery}
              on:input={applyFilters}
              class="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div class="flex items-center gap-2">
            <Filter class="w-4 h-4 text-gray-400" />
            <select
              bind:value={roleFilter}
              on:change={applyFilters}
              class="border rounded-lg px-3 py-2 text-sm"
            >
              {#each roles as role}
                <option value={role}>{role}</option>
              {/each}
            </select>
          </div>
        </div>

        <!-- User Table -->
        <div class="p-6 overflow-x-auto">
          {#if loading}
            <p class="text-center text-gray-500 py-8">Loading users...</p>
          {:else if filteredProfiles.length === 0}
            <p class="text-center text-gray-500 py-8">No users found.</p>
          {:else}
            <table class="w-full border-collapse">
              <thead>
                <tr class="text-left text-sm text-gray-600 border-b">
                  <th class="px-4 py-2">Full Name</th>
                  <th class="px-4 py-2">Email / Phone</th>
                  <th class="px-4 py-2">Role(s)</th>
                  <th class="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {#each filteredProfiles as user}
                  <tr class="border-b hover:bg-gray-50 text-sm">
                    <td class="px-4 py-2">{user.first_name} {user.last_name}</td>
                    <td class="px-4 py-2">{user.email || user.primary_phone || '-'}</td>
                    <td class="px-4 py-2">{user.role ? user.role.join(', ') : '-'}</td>
                    <td class="px-4 py-2">
                      <button
                        class="text-blue-600 hover:underline text-sm"
                        on:click={() => openSidebar(user)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          {/if}
        </div>
      </div>
    </div>

    {#if selectedUser !== null || isCreateMode}
      <UserSidebar
        user={selectedUser}
        createMode={isCreateMode}
        on:close={closeSidebar}
        on:updated={loadUsers}
      />
    {/if}
  </div>
</RoleGuard>