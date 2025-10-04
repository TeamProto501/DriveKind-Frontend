<script lang="ts">
  import RoleGuard from '$lib/components/RoleGuard.svelte';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import { Users, Plus, Search, Filter } from '@lucide/svelte';
  import UserSidebar from './UserSidebar.svelte';
  import { getAllStaffProfiles } from '$lib/api';
  import { toastStore } from '$lib/toast';
  import type { PageData } from './$types';

  export let data: PageData;

  type StaffProfile = {
    user_id: string;
    first_name: string;
    last_name: string;
    email?: string;
    primary_phone?: string;
    role: string[] | string;
    city?: string;
    state?: string;
  };

  let staffProfiles: StaffProfile[] = data.staffProfiles;
  let filteredProfiles: StaffProfile[] = [...staffProfiles];
  let isRefreshing = false;

  let searchQuery = '';
  let roleFilter: string = 'All';
  const roles = ['All', 'Admin', 'Dispatcher', 'Driver', 'Volunteer', 'Client'];

  let selectedUser: StaffProfile | null = null;
  let isCreateMode = false;
  let showSidebar = false;

  // Pagination
  let currentPage = 1;
  let pageSize = 20;
  $: totalPages = Math.max(Math.ceil(filteredProfiles.length / pageSize), 1);
  $: paginatedProfiles = filteredProfiles.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  function applyFilters() {
    let results = [...staffProfiles];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(
        u =>
          `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) ||
          (u.email && u.email.toLowerCase().includes(q)) ||
          (u.primary_phone && u.primary_phone.includes(q))
      );
    }

    if (roleFilter !== 'All') {
      results = results.filter(
        u => Array.isArray(u.role) ? u.role.includes(roleFilter) : u.role === roleFilter
      );
    }

    filteredProfiles = results;
    currentPage = 1;
  }

  // Refresh data from API
  async function refreshData() {
    if (isRefreshing) return;
    
    try {
      isRefreshing = true;
      
      // Use session from page data instead of authStore
      if (!data.session) {
        toastStore.error('No session available');
        isRefreshing = false;
        return;
      }
      
      const authInfo = {
        token: data.session.access_token,
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        user: data.session.user,
        userId: data.session.user?.id
      };
      
      const updatedProfiles = await getAllStaffProfiles(authInfo);
      staffProfiles = updatedProfiles;
      applyFilters();
      toastStore.success('User list refreshed');
    } catch (error) {
      console.error('Failed to refresh data:', error);
      toastStore.error('Failed to refresh user list');
    } finally {
      isRefreshing = false;
    }
  }

  // Sidebar
  function openSidebar(user: StaffProfile | null = null) {
    selectedUser = user;
    isCreateMode = !user;
    showSidebar = true;
  }

  function closeSidebar() {
    selectedUser = null;
    isCreateMode = false;
    showSidebar = false;
  }

  // Handle updates from sidebar
  async function handleUserUpdated() {
    await refreshData();
    closeSidebar();
  }

  // Pagination controls
  function nextPage() { if (currentPage < totalPages) currentPage++; }
  function prevPage() { if (currentPage > 1) currentPage--; }
  function changePageSize(size: number) {
    pageSize = size;
    currentPage = 1;
  }

  // Apply filters when component loads
  applyFilters();
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

        <div class="flex items-center gap-3">
          <button
            class="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg shadow hover:bg-gray-200 transition"
            on:click={refreshData}
            disabled={isRefreshing}
          >
            <Users class="w-4 h-4" />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          
          <button
            class="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition"
            on:click={() => openSidebar(null)}
          >
            <Plus class="w-4 h-4" /> Add User
          </button>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-sm border border-gray-200">
        <!-- Filters -->
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
          {#if isRefreshing}
            <div class="text-center text-gray-500 py-8">
              <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mb-2"></div>
              <p>Loading users...</p>
            </div>
          {:else if filteredProfiles.length === 0}
            <div class="text-center text-gray-500 py-8">
              <Users class="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No users found.</p>
              {#if searchQuery || roleFilter !== 'All'}
                <button
                  class="text-blue-600 hover:underline text-sm mt-2"
                  on:click={() => { searchQuery = ''; roleFilter = 'All'; applyFilters(); }}
                >
                  Clear filters
                </button>
              {/if}
            </div>
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
                {#each paginatedProfiles as user}
                  <tr class="border-b hover:bg-gray-50 text-sm">
                    <td class="px-4 py-2 font-medium">{user.first_name} {user.last_name}</td>
                    <td class="px-4 py-2 text-gray-600">{user.email || user.primary_phone || '-'}</td>
                    <td class="px-4 py-2">
                      <span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                        {Array.isArray(user.role) ? user.role.join(', ') : user.role || '-'}
                      </span>
                    </td>
                    <td class="px-4 py-2">
                      <button
                        class="text-blue-600 hover:underline text-sm font-medium"
                        on:click={() => openSidebar(user)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>

            <!-- Pagination Controls -->
            <div class="flex flex-col sm:flex-row items-center justify-between mt-6 pt-4 border-t gap-3">
              <div class="flex items-center gap-2 text-sm text-gray-600">
                <span>Show</span>
                <select
                  bind:value={pageSize}
                  on:change={(e) => changePageSize(parseInt(e.target.value))}
                  class="border rounded px-2 py-1 text-sm"
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
                <span>entries</span>
                <span class="ml-2 text-gray-500">
                  ({filteredProfiles.length} total)
                </span>
              </div>

              <div class="flex items-center gap-4">
                <button
                  class="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  on:click={prevPage}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>

                <span class="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  class="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  on:click={nextPage}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>

    <!-- Sidebar for Add/Edit -->
    {#if showSidebar}
      <UserSidebar
        user={selectedUser}
        createMode={isCreateMode}
        session={data.session}
        on:close={closeSidebar}
        on:updated={handleUserUpdated}
      />
    {/if}
  </div>
</RoleGuard>
