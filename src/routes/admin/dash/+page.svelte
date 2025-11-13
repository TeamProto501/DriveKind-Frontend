<script lang="ts">
  import Table from "./table.svelte";
  import RoleGuard from "$lib/components/RoleGuard.svelte";
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte";
  import { page } from "$app/stores";
  import {
    Users,
    Car,
    UserCheck,
    Search,
    Filter,
    Plus,
    BarChart3,
    Settings,
    Database,
    Shield,
    User,
    Clock,
    CheckCircle,
    TrendingUp,
    Truck,
    AlertCircle,
    Calendar,
    Building2
  } from "@lucide/svelte";
  import { goto } from "$app/navigation";
  import { navigating } from "$app/stores";
  
  export let data: any;

  // Metric cards with real data and links - UPDATED
  const metricCards = [
    {
      label: "User Management",
      value: data.metrics?.totalUsers || 0,
      subtitle: "Total staff members",
      href: "/admin/users",
      icon: Users,
      color: "bg-blue-500",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600"
    },
    {
      label: "Active Clients",
      value: data.metrics?.activeClients || 0,
      subtitle: "Registered clients",
      href: "/admin/users?tab=clients",
      icon: UserCheck,
      color: "bg-green-500",
      iconBg: "bg-green-100",
      iconColor: "text-green-600"
    },
    {
      label: "Active Drivers",
      value: data.metrics?.activeDrivers || 0,
      subtitle: "Available drivers",
      href: "/admin/users?tab=drivers",
      icon: Car,
      color: "bg-purple-500",
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600"
    },
    {
      label: "Pending Rides",
      value: data.metrics?.pendingRides || 0,
      subtitle: "Awaiting assignment",
      href: "/dispatcher/rides?tab=requested",
      icon: Clock,
      color: "bg-orange-500",
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600"
    },
    {
      label: "Database",
      value: "Manage",
      subtitle: "Database operations",
      href: "/admin/database",
      icon: Database,
      color: "bg-cyan-500",
      iconBg: "bg-cyan-100",
      iconColor: "text-cyan-600"
    },
    {
      label: "Completed This Month",
      value: data.metrics?.completedRidesThisMonth || 0,
      subtitle: "Rides completed",
      href: "/dispatcher/rides?tab=completed",
      icon: CheckCircle,
      color: "bg-emerald-500",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600"
    },
    {
      label: "Vehicles",
      value: data.metrics?.totalVehicles || 0,
      subtitle: "Fleet vehicles",
      href: "/admin/vehicle_management",
      icon: Truck,
      color: "bg-indigo-500",
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600"
    },
    {
      label: "Configuration",
      value: "Settings",
      subtitle: "Organization settings",
      href: "/admin/config",
      icon: Settings,
      color: "bg-slate-500",
      iconBg: "bg-slate-100",
      iconColor: "text-slate-600"
    }
  ];

  // Tab configuration - UPDATED
  const tabs = [
    {
      id: "riderequests",
      label: "Ride Requests",
      icon: AlertCircle,
      description: "Current ride requests and assignments"
    },
    {
      id: "clients",
      label: "Clients",
      icon: UserCheck,
      description: "Quick view of registered clients"
    },
    {
      id: "drivers",
      label: "Drivers",
      icon: Car,
      description: "Active driver roster"
    },
    {
      id: "volunteer",
      label: "Volunteers",
      icon: User,
      description: "Volunteer staff members"
    },
    {
      id: "dispatcher",
      label: "Dispatchers",
      icon: User,
      description: "Dispatch team members"
    }
  ];

  $: rows = Array.isArray(data) ? data : (data?.data ?? []);
  $: selectedTab = data?.tab ?? "clients";
  $: isNavigating = $navigating;

  function selectTab(tabId: string) {
    if (selectedTab !== tabId) {
      goto(`?tab=${tabId}`, {
        replaceState: false,
        noScroll: true,
        keepFocus: true
      });
    }
  }
</script>

<RoleGuard requiredRoles={["Admin"]}>
  <div class="min-h-screen bg-gray-50">
    <!-- Breadcrumbs -->
    <Breadcrumbs />

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header Section -->
      <div class="mb-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p class="text-gray-600 mt-2">
              System overview and quick access to administrative functions
            </p>
          </div>

          <!-- Admin Badge -->
          <div class="flex items-center space-x-2 px-4 py-2 bg-blue-100 rounded-full">
            <Shield class="w-5 h-5 text-blue-600" />
            <span class="text-sm font-medium text-blue-800">Administrator</span>
          </div>
        </div>
      </div>

      <!-- Metrics Grid - Clickable Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {#each metricCards as card}
          
            <a href={card.href}
            class="group relative bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-200 p-6 overflow-hidden"
          >
            <!-- Gradient Background Effect -->
            <div class="absolute inset-0 bg-gradient-to-br from-transparent to-gray-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
            
            <div class="relative">
              <div class="flex items-start justify-between mb-4">
                <div class="p-3 rounded-lg {card.iconBg}">
                  <svelte:component this={card.icon} class="w-6 h-6 {card.iconColor}" />
                </div>
                <TrendingUp class="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </div>
              
              <div>
                <p class="text-2xl font-bold text-gray-900 mb-1">
                  {card.value}
                </p>
                <p class="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors duration-200 mb-1">
                  {card.label}
                </p>
                <p class="text-xs text-gray-500">
                  {card.subtitle}
                </p>
              </div>
            </div>
          </a>
        {/each}
      </div>

      <!-- Quick View Table Section -->
      <div class="bg-white rounded-lg border border-gray-200 shadow-sm">
        <!-- Tab Navigation -->
        <div class="border-b border-gray-200">
          <div class="flex items-center justify-between px-6 py-4">
            <div>
              <h2 class="text-lg font-semibold text-gray-900 mb-1">Quick View</h2>
              <p class="text-sm text-gray-500">Browse data by category</p>
            </div>
            
            <nav class="flex space-x-4">
              {#each tabs as t}
                <button
                  type="button"
                  on:click={() => selectTab(t.id)}
                  class="flex items-center space-x-2 py-2 px-3 rounded-lg font-medium text-sm transition-all duration-200 {selectedTab === t.id
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}"
                >
                  <svelte:component this={t.icon} class="w-4 h-4" />
                  <span>{t.label}</span>
                </button>
              {/each}
            </nav>
          </div>
        </div>

        <!-- Tab Content -->
        <div class="p-6">
          <!-- Tab Description -->
          {#each tabs as t}
            {#if selectedTab === t.id}
              <div class="mb-4 flex items-center justify-between">
                <div class="flex items-center space-x-2 text-gray-600">
                  <svelte:component this={t.icon} class="w-5 h-5" />
                  <p class="text-sm">{t.description}</p>
                </div>
                
                <!-- Link to full page -->
                {#if t.id === 'clients'}
                  <a href="/admin/users?tab=clients" class="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    View all →
                  </a>
                {:else if t.id === 'drivers'}
                  <a href="/admin/users?tab=drivers" class="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    View all →
                  </a>
                {:else if t.id === 'volunteer'}
                  <a href="/admin/users?tab=volunteer" class="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    View all →
                  </a>
                {:else if t.id === 'dispatcher'}
                  <a href="/admin/users?tab=dispatcher" class="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    View all →
                  </a>
                {:else if t.id === 'riderequests'}
                  <a href="/dispatcher/rides" class="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    View all →
                  </a>
                {/if}
              </div>
            {/if}
          {/each}

          <!-- Table Component -->
          <Table data={rows} />
        </div>
      </div>
    </div>
  </div>
</RoleGuard>