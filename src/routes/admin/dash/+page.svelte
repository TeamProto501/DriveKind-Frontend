<script lang="ts">
  import Table from "./table.svelte";
  import RoleGuard from "$lib/components/RoleGuard.svelte";
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte";
  import {
    Users,
    Car,
    UserCheck,
    Search,
    Filter,
    Plus,
    Download,
    BarChart3,
    Settings,
    Database,
    FileText,
    Shield,
    User,
  } from "@lucide/svelte";

  let selectedTab = "que";

  // Quick action items for admin
  const quickActions = [
    {
      label: "Add User",
      href: "/admin/users",
      icon: Plus,
      color: "bg-blue-500",
    },
    {
      label: "Generate Report",
      href: "/admin/reports",
      icon: BarChart3,
      color: "bg-green-500",
    },
    {
      label: "System Settings",
      href: "/admin/config",
      icon: Settings,
      color: "bg-purple-500",
    },
    {
      label: "Database Backup",
      href: "/admin/database",
      icon: Database,
      color: "bg-orange-500",
    },
  ];

  // Tab configuration
  const tabs = [
    {
      id: "que",
      label: "Queue",
      icon: Users,
      description: "Manage ride requests and assignments",
    },
    {
      id: "clients",
      label: "Clients",
      icon: UserCheck,
      description: "View and manage client accounts",
    },
    {
      id: "drivers",
      label: "Drivers",
      icon: Car,
      description: "Manage driver accounts and schedules",
    },
    {
      id: "volunteers",
      label: "Volunteers",
      icon: User,
      description: "Manage volunteerers",
    },
  ];
</script>

<RoleGuard requiredRoles={["Admin"]}>
  <div class="min-h-screen bg-gray-50">
    <!-- Breadcrumbs -->
    <Breadcrumbs />

    <div class=" mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header Section -->
      <div class="mb-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p class="text-gray-600 mt-2">
              Welcome to your admin dashboard. Manage users, view reports, and
              configure system settings.
            </p>
          </div>

          <!-- Admin Badge -->
          <div
            class="flex items-center space-x-2 px-4 py-2 bg-blue-100 rounded-full"
          >
            <Shield class="w-5 h-5 text-blue-600" />
            <span class="text-sm font-medium text-blue-800">Administrator</span>
          </div>
        </div>
      </div>

      <!-- Quick Actions Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {#each quickActions as action}
          <a
            href={action.href}
            class="group p-6 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
          >
            <div class="flex items-center space-x-3">
              <div class="p-2 rounded-lg {action.color} text-white">
                <action.icon class="w-6 h-6" />
              </div>
              <div>
                <h3
                  class="font-medium text-gray-900 group-hover:text-blue-600 transition-colors duration-200"
                >
                  {action.label}
                </h3>
                <p class="text-sm text-gray-500">Quick access</p>
              </div>
            </div>
          </a>
        {/each}
      </div>

      <!-- Main Content Area -->
      <div class="bg-white rounded-lg border border-gray-200 shadow-sm">
        <!-- Tab Navigation -->
        <div class="border-b border-gray-200">
          <div class="flex items-center justify-between px-6 py-4">
            <nav class="flex space-x-8">
              {#each tabs as tab}
                <button
                  type="button"
                  on:click={() => (selectedTab = tab.id)}
                  class="flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 {selectedTab ===
                  tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
                >
                  <tab.icon class="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              {/each}
            </nav>

            <!-- Action Buttons -->
            <div class="flex items-center space-x-2">
              <button
                class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors duration-200"
                title="Search"
              >
                <Search class="w-4 h-4" />
              </button>
              <button
                class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors duration-200"
                title="Filters"
              >
                <Filter class="w-4 h-4" />
              </button>
              <button
                class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors duration-200"
                title="Add New"
              >
                <Plus class="w-4 h-4" />
              </button>
              <button
                class="px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2"
              >
                <Download class="w-4 h-4" />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Tab Content -->
        <div class="p-6">
          <!-- Tab Description -->
          {#each tabs as tab}
            {#if selectedTab === tab.id}
              <div class="mb-6">
                <div class="flex items-center space-x-2 text-gray-600 mb-2">
                  <tab.icon class="w-5 h-5" />
                  <h2 class="text-lg font-medium">{tab.label}</h2>
                </div>
                <p class="text-gray-500">{tab.description}</p>
              </div>
            {/if}
          {/each}

          <!-- Table Component -->
          <Table type={selectedTab} />
        </div>
      </div>

      <!-- Stats Overview -->
      <div class="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div class="flex items-center">
            <div class="p-2 bg-blue-100 rounded-lg">
              <Users class="w-6 h-6 text-blue-600" />
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-500">Total Users</p>
              <p class="text-2xl font-semibold text-gray-900">1,234</p>
            </div>
          </div>
        </div>

        <div class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div class="flex items-center">
            <div class="p-2 bg-green-100 rounded-lg">
              <Car class="w-6 h-6 text-green-600" />
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-500">Active Drivers</p>
              <p class="text-2xl font-semibold text-gray-900">89</p>
            </div>
          </div>
        </div>

        <div class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div class="flex items-center">
            <div class="p-2 bg-purple-100 rounded-lg">
              <FileText class="w-6 h-6 text-purple-600" />
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-500">Pending Requests</p>
              <p class="text-2xl font-semibold text-gray-900">23</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</RoleGuard>
