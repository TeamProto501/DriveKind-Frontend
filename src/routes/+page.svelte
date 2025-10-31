<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import type { PageData } from './$types';
  import { Calendar, Car, Users, TrendingUp, Clock, CheckCircle } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();
  
  // User is guaranteed to be authenticated here (thanks to hooks)
  const session = data.session;
  const profile = data.profile;
  const userRoles = data.roles || [];

  // Get user's primary role for dashboard customization
  const primaryRole = userRoles[0] || 'User';

  // Dashboard stats (mock data - replace with real API calls)
  let stats = $state({
    totalRides: 0,
    upcomingRides: 0,
    completedRides: 0,
    activeDrivers: 0
  });

  onMount(async () => {
    // Load dashboard statistics based on user role
    // This is mock data - replace with actual API calls
    if (primaryRole === 'Dispatcher' || primaryRole === 'Admin' || primaryRole === 'Super Admin') {
      stats = {
        totalRides: 156,
        upcomingRides: 23,
        completedRides: 133,
        activeDrivers: 12
      };
    } else if (primaryRole === 'Driver') {
      stats = {
        totalRides: 45,
        upcomingRides: 8,
        completedRides: 37,
        activeDrivers: 1
      };
    }
  });
</script>

<svelte:head>
  <title>Dashboard - DriveKind</title>
</svelte:head>

<div class="p-6">
  <!-- Welcome Header -->
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-gray-900 mb-2">
      Welcome back, {profile?.first_name || session?.user?.email?.split('@')[0] || 'User'}!
    </h1>
    <p class="text-gray-600">
      Here's what's happening with your transportation services today.
    </p>
  </div>

  <!-- Quick Stats -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    <div class="bg-white rounded-lg shadow p-6 border border-gray-200">
      <div class="flex items-center justify-between mb-4">
        <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
          <Car class="w-6 h-6 text-blue-600" />
        </div>
        <span class="text-2xl font-bold text-gray-900">{stats.totalRides}</span>
      </div>
      <h3 class="text-sm font-medium text-gray-600">Total Rides</h3>
    </div>

    <div class="bg-white rounded-lg shadow p-6 border border-gray-200">
      <div class="flex items-center justify-between mb-4">
        <div class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
          <Clock class="w-6 h-6 text-yellow-600" />
        </div>
        <span class="text-2xl font-bold text-gray-900">{stats.upcomingRides}</span>
      </div>
      <h3 class="text-sm font-medium text-gray-600">Upcoming Rides</h3>
    </div>

    <div class="bg-white rounded-lg shadow p-6 border border-gray-200">
      <div class="flex items-center justify-between mb-4">
        <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
          <CheckCircle class="w-6 h-6 text-green-600" />
        </div>
        <span class="text-2xl font-bold text-gray-900">{stats.completedRides}</span>
      </div>
      <h3 class="text-sm font-medium text-gray-600">Completed Rides</h3>
    </div>

    {#if primaryRole === 'Dispatcher' || primaryRole === 'Admin' || primaryRole === 'Super Admin'}
      <div class="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div class="flex items-center justify-between mb-4">
          <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <Users class="w-6 h-6 text-purple-600" />
          </div>
          <span class="text-2xl font-bold text-gray-900">{stats.activeDrivers}</span>
        </div>
        <h3 class="text-sm font-medium text-gray-600">Active Drivers</h3>
      </div>
    {:else}
      <div class="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div class="flex items-center justify-between mb-4">
          <div class="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
            <TrendingUp class="w-6 h-6 text-indigo-600" />
          </div>
          <span class="text-2xl font-bold text-gray-900">98%</span>
        </div>
        <h3 class="text-sm font-medium text-gray-600">Completion Rate</h3>
      </div>
    {/if}
  </div>

  <!-- Quick Actions -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
    <!-- Recent Activity -->
    <div class="bg-white rounded-lg shadow border border-gray-200 p-6">
      <h2 class="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
      <div class="space-y-4">
        <div class="flex items-start gap-3 pb-4 border-b border-gray-200">
          <div class="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
          <div class="flex-1">
            <p class="text-sm font-medium text-gray-900">Ride completed</p>
            <p class="text-xs text-gray-600">John Doe - Medical Appointment</p>
            <p class="text-xs text-gray-400">2 hours ago</p>
          </div>
        </div>
        <div class="flex items-start gap-3 pb-4 border-b border-gray-200">
          <div class="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
          <div class="flex-1">
            <p class="text-sm font-medium text-gray-900">New ride scheduled</p>
            <p class="text-xs text-gray-600">Jane Smith - Grocery Shopping</p>
            <p class="text-xs text-gray-400">5 hours ago</p>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <div class="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
          <div class="flex-1">
            <p class="text-sm font-medium text-gray-900">Driver checked in</p>
            <p class="text-xs text-gray-600">Mike Johnson</p>
            <p class="text-xs text-gray-400">1 day ago</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions Card -->
    <div class="bg-white rounded-lg shadow border border-gray-200 p-6">
      <h2 class="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
      <div class="space-y-3">
        {#if primaryRole === 'Dispatcher' || primaryRole === 'Admin' || primaryRole === 'Super Admin'}
          <button
            onclick={() => goto('/dispatcher/rides')}
            class="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors"
          >
            <Car class="w-5 h-5" />
            <span class="font-medium">Create New Ride</span>
          </button>
          <button
            onclick={() => goto('/dispatcher/drivers')}
            class="w-full flex items-center gap-3 px-4 py-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition-colors"
          >
            <Users class="w-5 h-5" />
            <span class="font-medium">Manage Drivers</span>
          </button>
        {/if}
        
        <button
          onclick={() => goto('/calendar')}
          class="w-full flex items-center gap-3 px-4 py-3 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors"
        >
          <Calendar class="w-5 h-5" />
          <span class="font-medium">View Schedule</span>
        </button>
        
        {#if primaryRole === 'Driver'}
          <button
            onclick={() => goto('/driver/rides')}
            class="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors"
          >
            <Car class="w-5 h-5" />
            <span class="font-medium">View My Rides</span>
          </button>
        {/if}
      </div>
    </div>
  </div>
</div>
