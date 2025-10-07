<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData, form: ActionData } = $props();
  const session = data.session;
  let loading = $state(false);
  let testLoading = $state(false);

  // Mock user roles for demonstration
  let userRoles = $state<string[]>([]);

  onMount(() => {
    // Simulate loading user roles
    setTimeout(() => {
      userRoles = ["Admin", "Dispatcher"];
    }, 1000);
  });

  // Redirect to appropriate dashboard based on user role
  function redirectToDashboard() {
    if (userRoles.includes('Admin')) {
      goto('/admin/dash');
    } else if (userRoles.includes('Dispatcher')) {
      goto('/dispatcher/dashboard');
    } else if (userRoles.includes('Driver')) {
      goto('/driver/rides');
    } else {
      goto('/profile');
    }
  }
</script>

<svelte:head>
  <title>DriveKind - Welcome</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
  <div class="max-w-6xl mx-auto px-4 py-12">
    <!-- Header -->
    <div class="text-center mb-12">
      <div class="flex items-center justify-center mb-6">
        <div class="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mr-4">
          <span class="text-white font-bold text-2xl">DK</span>
        </div>
        <h1 class="text-5xl font-bold text-gray-900">DriveKind</h1>
      </div>
      <p class="text-xl text-gray-600 max-w-2xl mx-auto">
        Your trusted partner for accessible transportation services. We provide safe, reliable rides for everyone who needs them.
      </p>
    </div>

    {#if session}
      <!-- Welcome Back Section -->
      <div class="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <div class="text-center">
          <h2 class="text-3xl font-bold text-gray-900 mb-4">Welcome back!</h2>
          <p class="text-lg text-gray-600 mb-6">
            You're signed in as <span class="font-semibold text-blue-600">{session.user?.email}</span>
          </p>
          
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onclick={redirectToDashboard}
              class="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              Go to Dashboard
            </button>
            <button
              onclick={() => goto('/profile')}
              class="px-8 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
            >
              View Profile
            </button>
          </div>
        </div>
      </div>

      <!-- API Test Section -->
      <div class="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">API Test</h2>
        <div class="space-y-4">
          <form 
            method="POST" 
            action="?/testClients"
            use:enhance={() => {
              testLoading = true;
              return async ({ update }) => {
                testLoading = false;
                await update();
              };
            }}
          >
            <button
              type="submit"
              disabled={testLoading}
              class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 transition-colors"
            >
              {testLoading ? 'Testing...' : 'Test Clients Endpoint'}
            </button>
          </form>

          {#if form?.error}
            <div class="bg-red-50 border border-red-200 rounded-lg p-4">
              <p class="text-red-800 font-medium">Error:</p>
              <p class="text-red-700 text-sm mt-1">{form.error}</p>
            </div>
          {/if}

          {#if form?.success && form?.data}
            <div class="bg-green-50 border border-green-200 rounded-lg p-4">
              <p class="text-green-800 font-medium mb-2">Success! Client data:</p>
              <pre class="text-green-700 text-sm bg-green-100 p-3 rounded overflow-x-auto">{JSON.stringify(form.data, null, 2)}</pre>
            </div>
          {/if}
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="grid md:grid-cols-3 gap-6">
        <div class="bg-white rounded-xl shadow-lg p-6 text-center">
          <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span class="text-blue-600 text-xl">📊</span>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Dashboard</h3>
          <p class="text-gray-600 text-sm mb-4">View your personalized dashboard</p>
          <button
            onclick={redirectToDashboard}
            class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>

        <div class="bg-white rounded-xl shadow-lg p-6 text-center">
          <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span class="text-green-600 text-xl">👤</span>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Profile</h3>
          <p class="text-gray-600 text-sm mb-4">Manage your account settings</p>
          <button
            onclick={() => goto('/profile')}
            class="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            View Profile
          </button>
        </div>

        <div class="bg-white rounded-xl shadow-lg p-6 text-center">
          <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span class="text-purple-600 text-xl">❓</span>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Help</h3>
          <p class="text-gray-600 text-sm mb-4">Get support and documentation</p>
          <button
            onclick={() => goto('/help')}
            class="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Get Help
          </button>
        </div>
      </div>

    {:else}
      <!-- Not Logged In -->
      <div class="bg-white rounded-2xl shadow-xl p-8 text-center">
        <h2 class="text-3xl font-bold text-gray-900 mb-4">Get Started with DriveKind</h2>
        <p class="text-lg text-gray-600 mb-8">
          Sign in to access your dashboard and manage your transportation needs.
        </p>
        
        <div class="flex justify-center">
          <button
            onclick={() => goto('/login')}
            class="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>