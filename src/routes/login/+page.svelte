<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';
  import type { PageData, ActionData } from './$types';

  // Match the main branch props structure
  let { data }: { data: PageData } = $props();
  
  // Access form data from $page.form (this is the correct way for your setup)
  let form = $derived($page.form as ActionData);

  let loading = $state(false);
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50">
  <div class="max-w-md w-full space-y-8 p-8">
    <div>
      <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
        Sign in to your account
      </h2>
      <p class="mt-2 text-center text-sm text-gray-600">
        Or
        <a href="/signup" class="font-medium text-indigo-600 hover:text-indigo-500">
          create a new account
        </a>
      </p>
    </div>
    
    <form 
      method="POST"
      action="?/login"
      use:enhance={() => {
        loading = true;
        return async ({ update }) => {
          loading = false;
          await update();
        };
      }}
      class="mt-8 space-y-6"
    >
      <div class="space-y-4">
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={form?.email ?? ''}
            required
            class="mt-1 relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter your email"
          />
        </div>
        <div>
          <label for="password" class="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            class="mt-1 relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter your password"
          />
        </div>
      </div>

      {#if form?.error}
        <div class="rounded-md bg-red-50 p-4">
          <div class="text-sm text-red-800">
            {form.error}
          </div>
        </div>
      {/if}

      {#if form?.message}
        <div class="rounded-md bg-green-50 p-4">
          <div class="text-sm text-green-800">
            {form.message}
          </div>
        </div>
      {/if}

      <div>
        <button
          type="submit"
          disabled={loading}
          class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? 'Signing In...' : 'Sign In'}
        </button>
      </div>
    </form>
    
    <div class="text-center">
      <a href="/" class="text-indigo-600 hover:text-indigo-500">
        ← Back to home
      </a>
    </div>
  </div>
</div>