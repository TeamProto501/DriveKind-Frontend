<script lang="ts">
  import RoleGuard from '$lib/components/RoleGuard.svelte';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import { Users, Plus, Search, Filter, Trash2, ChevronUp, ChevronDown, ChevronsUpDown, X, UserX } from '@lucide/svelte';
  import UserSidebar from './UserSidebar.svelte';
  import ClientSidebar from './ClientSidebar.svelte';
  import { getAllStaffProfiles, API_BASE_URL } from '$lib/api';
  import { toastStore } from '$lib/toast';
  import { goto } from '$app/navigation';
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

  type Client = {
    client_id: number;
    first_name: string;
    last_name: string;
    email?: string;
    primary_phone: string;
    secondary_phone?: string;
    date_of_birth: string;
    city: string;
    state: string;
    client_status_enum: string;
    mobility_assistance_enum?: string;
    date_enrolled: string;
  };

  let activeTab: 'users' | 'clients' = data.tab === 'clients' ? 'clients' : 'users';
  let staffProfiles: StaffProfile[] = data.staffProfiles;
  let clients: Client[] = data.clients;
  let filteredProfiles: StaffProfile[] = [...staffProfiles];
  let filteredClients: Client[] = [...clients];
  let isRefreshing = false;

  let searchQuery = '';
  let roleFilter: string = 'All';
  const roles = ['All', 'Admin', 'Dispatcher', 'Driver', 'Volunteer'];

  let selectedUser: StaffProfile | null = null;
  let isCreateMode = false;
  let showSidebar = false;
  let showDeleteModal = false;
  let showDeleteSearch = false;
  let showDeactivateModal = false;
  let deleteSearchQuery = '';
  let deleteSearchResults: (StaffProfile | Client)[] = [];
  let userToDelete: (StaffProfile | Client) | null = null;
  let clientToDeactivate: Client | null = null;
  let deleteConfirmEmail = '';
  let isDeleting = false;
  let isDeactivating = false;
  let selectedClient: Client | null = null;
  let isClientCreateMode = false;
  let showClientSidebar = false;

  // Sorting
  type SortField = 'name' | 'email' | 'role' | 'status' | 'phone' | 'city' | 'enrolled';
  type SortDirection = 'asc' | 'desc' | null;
  let sortField: SortField | null = null;
  let sortDirection: SortDirection = null;

  // Pagination
  let currentPage = 1;
  let pageSize = 20;
  $: totalPages = Math.max(Math.ceil((activeTab === 'users' ? filteredProfiles : filteredClients).length / pageSize), 1);
  $: paginatedData = (activeTab === 'users' ? filteredProfiles : filteredClients).slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  function getStatusColor(status: string): string {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Inactive':
        return 'bg-red-100 text-red-800';
      case 'Temporary Thru':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  function switchTab(tab: 'users' | 'clients') {
    activeTab = tab;
    searchQuery = '';
    roleFilter = 'All';
    sortField = null;
    sortDirection = null;
    currentPage = 1;
    goto(`?tab=${tab}`, { replaceState: true });
    applyFilters();
  }

  function applyFilters() {
    if (activeTab === 'users') {
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
    } else {
      let results = [...clients];

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        results = results.filter(
          c =>
            `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
            (c.email && c.email.toLowerCase().includes(q)) ||
            c.primary_phone.includes(q) ||
            c.city.toLowerCase().includes(q)
        );
      }

      filteredClients = results;
    }
    
    applySorting();
    currentPage = 1;
  }

  function toggleSort(field: SortField) {
    if (sortField === field) {
      if (sortDirection === null) sortDirection = 'asc';
      else if (sortDirection === 'asc') sortDirection = 'desc';
      else { sortDirection = null; sortField = null; }
    } else {
      sortField = field;
      sortDirection = 'asc';
    }
    applySorting();
  }

  function applySorting() {
    if (!sortField || !sortDirection) return;

    if (activeTab === 'users') {
      filteredProfiles = [...filteredProfiles].sort((a, b) => {
        let aVal: any, bVal: any;

        switch (sortField) {
          case 'name':
            aVal = `${a.first_name} ${a.last_name}`.toLowerCase();
            bVal = `${b.first_name} ${b.last_name}`.toLowerCase();
            break;
          case 'email':
            aVal = (a.email || '').toLowerCase();
            bVal = (b.email || '').toLowerCase();
            break;
          case 'role':
            aVal = Array.isArray(a.role) ? a.role.join(', ') : a.role || '';
            bVal = Array.isArray(b.role) ? b.role.join(', ') : b.role || '';
            break;
          default:
            return 0;
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      filteredClients = [...filteredClients].sort((a, b) => {
        let aVal: any, bVal: any;

        switch (sortField) {
          case 'name':
            aVal = `${a.first_name} ${a.last_name}`.toLowerCase();
            bVal = `${b.first_name} ${b.last_name}`.toLowerCase();
            break;
          case 'phone':
            aVal = a.primary_phone;
            bVal = b.primary_phone;
            break;
          case 'city':
            aVal = a.city.toLowerCase();
            bVal = b.city.toLowerCase();
            break;
          case 'status':
            aVal = a.client_status_enum;
            bVal = b.client_status_enum;
            break;
          case 'enrolled':
            aVal = new Date(a.date_enrolled).getTime();
            bVal = new Date(b.date_enrolled).getTime();
            break;
          default:
            return 0;
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
  }

  function getSortIcon(field: SortField) {
    if (sortField !== field) return ChevronsUpDown;
    if (sortDirection === 'asc') return ChevronUp;
    if (sortDirection === 'desc') return ChevronDown;
    return ChevronsUpDown;
  }

  async function refreshData() {
    if (isRefreshing) return;
    
    try {
      isRefreshing = true;
      window.location.reload();
    } catch (error) {
      console.error('Failed to refresh data:', error);
      toastStore.error('Failed to refresh data');
    } finally {
      isRefreshing = false;
    }
  }

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

  function openClientSidebar(client: Client | null = null) {
    selectedClient = client;
    isClientCreateMode = !client;
    showClientSidebar = true;
  }

  function closeClientSidebar() {
    selectedClient = null;
    isClientCreateMode = false;
    showClientSidebar = false;
  }

  async function handleClientUpdated() {
    await refreshData();
    closeClientSidebar();
  }

  async function handleUserUpdated() {
    await refreshData();
    closeSidebar();
  }

  function openDeleteSearch() {
    showDeleteSearch = true;
    deleteSearchQuery = '';
    deleteSearchResults = [];
  }

  function closeDeleteSearch() {
    showDeleteSearch = false;
    deleteSearchQuery = '';
    deleteSearchResults = [];
  }

  function searchUsersForDelete() {
    if (!deleteSearchQuery.trim()) {
      deleteSearchResults = [];
      return;
    }

    const q = deleteSearchQuery.toLowerCase();
    const allUsers = staffProfiles;

    deleteSearchResults = allUsers.filter((u: any) =>
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.primary_phone && u.primary_phone.includes(q))
    ).slice(0, 10);
  }

  function selectUserForDeletion(user: StaffProfile) {
    userToDelete = user;
    deleteConfirmEmail = '';
    showDeleteModal = true;
    closeDeleteSearch();
  }

  function openDeleteModal(user: StaffProfile) {
    userToDelete = user;
    deleteConfirmEmail = '';
    showDeleteModal = true;
  }

  function closeDeleteModal() {
    showDeleteModal = false;
    userToDelete = null;
    deleteConfirmEmail = '';
  }

  function openDeactivateModal(client: Client) {
    clientToDeactivate = client;
    showDeactivateModal = true;
  }

  function closeDeactivateModal() {
    showDeactivateModal = false;
    clientToDeactivate = null;
  }

  async function confirmDeactivate() {
    if (!clientToDeactivate) return;

    try {
      isDeactivating = true;

      const response = await fetch(`${API_BASE_URL}/clients/${clientToDeactivate.client_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${data.session.access_token}`
        },
        body: JSON.stringify({
          client_status_enum: 'Inactive'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to deactivate client');
      }

      toastStore.success('Client deactivated successfully');
      closeDeactivateModal();
      await refreshData();
    } catch (error) {
      console.error('Deactivate error:', error);
      toastStore.error(`Failed to deactivate client: ${error.message}`);
    } finally {
      isDeactivating = false;
    }
  }

  async function confirmDelete() {
    if (!userToDelete) return;

    const userEmail = 'email' in userToDelete ? userToDelete.email : '';
    
    if (deleteConfirmEmail !== userEmail) {
      toastStore.error('Email does not match');
      return;
    }

    try {
      isDeleting = true;

      const userId = (userToDelete as StaffProfile).user_id;
      const response = await fetch(`${API_BASE_URL}/staff-profiles/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${data.session.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }

      toastStore.success('User deleted successfully');
      closeDeleteModal();
      await refreshData();
    } catch (error) {
      console.error('Delete error:', error);
      toastStore.error(`Failed to delete user: ${error.message}`);
    } finally {
      isDeleting = false;
    }
  }

  function nextPage() { if (currentPage < totalPages) currentPage++; }
  function prevPage() { if (currentPage > 1) currentPage--; }
  function changePageSize(size: number) {
    pageSize = size;
    currentPage = 1;
  }

  applyFilters();
</script>

<RoleGuard requiredRoles={['Admin']}>
  <div class="min-h-screen bg-gray-50">
    <Breadcrumbs />

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="mb-8 flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">User Management</h1>
          <p class="text-gray-600 mt-2">Manage user accounts, roles, and client records.</p>
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

          {#if activeTab === 'users'}
            <button
              class="inline-flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-lg shadow hover:bg-red-200 transition"
              on:click={openDeleteSearch}
            >
              <Trash2 class="w-4 h-4" /> Delete User
            </button>
          {/if}

          <button
            class="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition"
            on:click={() => activeTab === 'users' ? openSidebar(null) : openClientSidebar(null)}
          >
            <Plus class="w-4 h-4" /> Add {activeTab === 'users' ? 'User' : 'Client'}
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div class="border-b border-gray-200">
          <nav class="flex -mb-px">
            <button
              on:click={() => switchTab('users')}
              class="px-6 py-3 text-sm font-medium border-b-2 transition-colors {activeTab === 'users' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
            >
              Users ({staffProfiles.length})
            </button>
            <button
              on:click={() => switchTab('clients')}
              class="px-6 py-3 text-sm font-medium border-b-2 transition-colors {activeTab === 'clients' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
            >
              Clients ({clients.length})
            </button>
          </nav>
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

          {#if activeTab === 'users'}
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
          {/if}
        </div>

        <!-- Table -->
        <div class="p-6 overflow-x-auto">
          {#if isRefreshing}
            <div class="text-center text-gray-500 py-8">
              <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mb-2"></div>
              <p>Loading...</p>
            </div>
          {:else if activeTab === 'users'}
            {#if filteredProfiles.length === 0}
              <div class="text-center text-gray-500 py-8">
                <Users class="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No users found.</p>
              </div>
            {:else}
              <table class="w-full border-collapse">
                <thead>
                  <tr class="text-left text-sm text-gray-600 border-b">
                    <th class="px-4 py-2">
                      <button class="flex items-center gap-1 hover:text-gray-900" on:click={() => toggleSort('name')}>
                        Full Name
                        <svelte:component this={getSortIcon('name')} class="w-4 h-4" />
                      </button>
                    </th>
                    <th class="px-4 py-2">
                      <button class="flex items-center gap-1 hover:text-gray-900" on:click={() => toggleSort('email')}>
                        Email / Phone
                        <svelte:component this={getSortIcon('email')} class="w-4 h-4" />
                      </button>
                    </th>
                    <th class="px-4 py-2">
                      <button class="flex items-center gap-1 hover:text-gray-900" on:click={() => toggleSort('role')}>
                        Role(s)
                        <svelte:component this={getSortIcon('role')} class="w-4 h-4" />
                      </button>
                    </th>
                    <th class="px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {#each paginatedData as user}
                    <tr class="border-b hover:bg-gray-50 text-sm">
                      <td class="px-4 py-2 font-medium">{user.first_name} {user.last_name}</td>
                      <td class="px-4 py-2 text-gray-600">{user.email || user.primary_phone || '-'}</td>
                      <td class="px-4 py-2">
                        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                          {Array.isArray(user.role) ? user.role.join(', ') : user.role || '-'}
                        </span>
                      </td>
                      <td class="px-4 py-2">
                        <div class="flex items-center gap-2">
                          <button
                            class="text-blue-600 hover:underline text-sm font-medium"
                            on:click={() => openSidebar(user)}
                          >
                            Edit
                          </button>
                          <button
                            class="text-red-600 hover:underline text-sm font-medium"
                            on:click={() => openDeleteModal(user)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            {/if}
          {:else}
            {#if filteredClients.length === 0}
              <div class="text-center text-gray-500 py-8">
                <Users class="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No clients found.</p>
              </div>
            {:else}
              <table class="w-full border-collapse">
                <thead>
                  <tr class="text-left text-sm text-gray-600 border-b">
                    <th class="px-4 py-2">
                      <button class="flex items-center gap-1 hover:text-gray-900" on:click={() => toggleSort('name')}>
                        Full Name
                        <svelte:component this={getSortIcon('name')} class="w-4 h-4" />
                      </button>
                    </th>
                    <th class="px-4 py-2">
                      <button class="flex items-center gap-1 hover:text-gray-900" on:click={() => toggleSort('phone')}>
                        Phone
                        <svelte:component this={getSortIcon('phone')} class="w-4 h-4" />
                      </button>
                    </th>
                    <th class="px-4 py-2">
                      <button class="flex items-center gap-1 hover:text-gray-900" on:click={() => toggleSort('city')}>
                        City/State
                        <svelte:component this={getSortIcon('city')} class="w-4 h-4" />
                      </button>
                    </th>
                    <th class="px-4 py-2">
                      <button class="flex items-center gap-1 hover:text-gray-900" on:click={() => toggleSort('status')}>
                        Status
                        <svelte:component this={getSortIcon('status')} class="w-4 h-4" />
                      </button>
                    </th>
                    <th class="px-4 py-2">
                      <button class="flex items-center gap-1 hover:text-gray-900" on:click={() => toggleSort('enrolled')}>
                        Enrolled
                        <svelte:component this={getSortIcon('enrolled')} class="w-4 h-4" />
                      </button>
                    </th>
                    <th class="px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {#each paginatedData as client}
                    <tr class="border-b hover:bg-gray-50 text-sm">
                      <td class="px-4 py-2 font-medium">{client.first_name} {client.last_name}</td>
                      <td class="px-4 py-2 text-gray-600">{client.primary_phone}</td>
                      <td class="px-4 py-2 text-gray-600">{client.city}, {client.state}</td>
                      <td class="px-4 py-2">
                        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs {getStatusColor(client.client_status_enum)}">
                          {client.client_status_enum}
                        </span>
                      </td>
                      <td class="px-4 py-2 text-gray-600">{new Date(client.date_enrolled).toLocaleDateString()}</td>
                      <td class="px-4 py-2">
                        <div class="flex items-center gap-2">
                          <button
                            class="text-blue-600 hover:underline text-sm font-medium"
                            on:click={() => openClientSidebar(client)}
                          >
                            Edit
                          </button>
                          {#if client.client_status_enum !== 'Inactive'}
                            <button
                              class="text-orange-600 hover:underline text-sm font-medium"
                              on:click={() => openDeactivateModal(client)}
                            >
                              Deactivate
                            </button>
                          {/if}
                        </div>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            {/if}
          {/if}

          <!-- Pagination -->
          {#if (activeTab === 'users' ? filteredProfiles : filteredClients).length > 0}
            <div class="flex flex-col sm:flex-row items-center justify-between mt-6 pt-4 border-t gap-3">
              <div class="flex items-center gap-2 text-sm text-gray-600">
                <span>Show</span>
                <select
                  bind:value={pageSize}
                  on:change={(e) => changePageSize(parseInt(e.currentTarget.value))}
                  class="border rounded px-2 py-1 text-sm"
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
                <span>entries</span>
                <span class="ml-2 text-gray-500">
                  ({(activeTab === 'users' ? filteredProfiles : filteredClients).length} total)
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

    <!-- User Sidebar -->
    {#if showSidebar}
      <UserSidebar
        user={selectedUser}
        createMode={isCreateMode}
        session={data.session}
        on:close={closeSidebar}
        on:updated={handleUserUpdated}
      />
    {/if}

    <!-- Client Sidebar -->
    {#if showClientSidebar}
      <ClientSidebar
        client={selectedClient}
        createMode={isClientCreateMode}
        session={data.session}
        orgId={data.userProfile?.org_id || 1}
        on:close={closeClientSidebar}
        on:updated={handleClientUpdated}
      />
    {/if}

    <!-- Delete Search Modal (Users Only) -->
    {#if showDeleteSearch}
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
          <div class="px-6 py-4 border-b flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900">Delete User</h3>
            <button on:click={closeDeleteSearch} class="text-gray-500 hover:text-gray-700">
              <X class="w-5 h-5" />
            </button>
          </div>

          <div class="p-6">
            <p class="text-sm text-gray-600 mb-4">Search for a user to delete:</p>
            
            <div class="flex items-center gap-2 mb-4">
              <Search class="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                bind:value={deleteSearchQuery}
                on:input={searchUsersForDelete}
                class="flex-1 border rounded-lg px-3 py-2 text-sm"
                autofocus
              />
            </div>

            {#if deleteSearchResults.length > 0}
              <div class="space-y-2 max-h-64 overflow-y-auto">
                {#each deleteSearchResults as result}
                  <button
                    on:click={() => selectUserForDeletion(result)}
                    class="w-full text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div class="font-medium text-gray-900">
                      {result.first_name} {result.last_name}
                    </div>
                    <div class="text-xs text-gray-500">
                      {result.email || result.primary_phone}
                    </div>
                  </button>
                {/each}
              </div>
            {:else if deleteSearchQuery.trim()}
              <p class="text-sm text-gray-500 text-center py-4">No users found</p>
            {/if}
          </div>

          <div class="px-6 py-4 border-t flex justify-end">
            <button
              on:click={closeDeleteSearch}
              class="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    {/if}

    <!-- Delete Confirmation Modal (Users Only) -->
    {#if showDeleteModal && userToDelete}
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
          <div class="px-6 py-4 border-b">
            <h3 class="text-lg font-semibold text-red-600">Confirm Deletion</h3>
          </div>

          <div class="p-6">
            <div class="mb-4">
              <p class="text-sm text-gray-900 font-medium mb-2">
                You are about to delete:
              </p>
              <div class="p-3 bg-gray-50 rounded-lg">
                <div class="font-medium text-gray-900">
                  {userToDelete.first_name} {userToDelete.last_name}
                </div>
                <div class="text-xs text-gray-500">
                  {userToDelete.email || userToDelete.primary_phone}
                </div>
              </div>
            </div>

            <div class="mb-4">
              <p class="text-sm text-red-600 font-medium mb-2">
                ⚠️ This action cannot be undone!
              </p>
              <p class="text-sm text-gray-600 mb-4">
                To confirm, please type the email address below:
              </p>
              
              <div class="mb-2">
                <code class="text-xs bg-gray-100 px-2 py-1 rounded">
                  {userToDelete.email || ''}
                </code>
              </div>

              <input
                type="text"
                bind:value={deleteConfirmEmail}
                placeholder="Type email to confirm"
                class="w-full border rounded-lg px-3 py-2 text-sm"
                autofocus
              />
            </div>
          </div>

          <div class="px-6 py-4 border-t flex justify-end gap-2">
            <button
              on:click={closeDeleteModal}
              disabled={isDeleting}
              class="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              on:click={confirmDelete}
              disabled={isDeleting || !deleteConfirmEmail}
              class="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Delete User'}
            </button>
          </div>
        </div>
      </div>
    {/if}

    <!-- Deactivate Confirmation Modal (Clients Only) -->
    {#if showDeactivateModal && clientToDeactivate}
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
          <div class="px-6 py-4 border-b">
            <h3 class="text-lg font-semibold text-orange-600">Confirm Deactivation</h3>
          </div>

          <div class="p-6">
            <div class="mb-4">
              <p class="text-sm text-gray-900 font-medium mb-2">
                You are about to deactivate:
              </p>
              <div class="p-3 bg-gray-50 rounded-lg">
                <div class="font-medium text-gray-900">
                  {clientToDeactivate.first_name} {clientToDeactivate.last_name}
                </div>
                <div class="text-xs text-gray-500">
                  {clientToDeactivate.primary_phone}
                </div>
              </div>
            </div>

            <div class="mb-4">
              <p class="text-sm text-gray-600">
                This will set the client's status to <strong>Inactive</strong>. The client record will be preserved and can be reactivated later by editing the client.
              </p>
            </div>
          </div>

          <div class="px-6 py-4 border-t flex justify-end gap-2">
            <button
              on:click={closeDeactivateModal}
              disabled={isDeactivating}
              class="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              on:click={confirmDeactivate}
              disabled={isDeactivating}
              class="px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50"
            >
              {isDeactivating ? 'Deactivating...' : 'Deactivate Client'}
            </button>
          </div>
        </div>
      </div>
    {/if}
  </div>
</RoleGuard>
