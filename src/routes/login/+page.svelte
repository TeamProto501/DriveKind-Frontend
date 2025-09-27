<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';

  let email = '';
  let password = '';
  let loading = false;

  // Fix: Access form results from $page.form, not $page.data.form
  $: errorMessage = $page.form?.error;
</script>

<div class="flex items-center justify-center min-h-screen bg-gray-100">
  <div class="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
    <h1 class="text-2xl font-bold text-center mb-6">Login</h1>

    <form
      method="POST"
      use:enhance={() => {
        loading = true;
        return ({ update }) => {
          loading = false;
          update(); // sync errors from server
        };
      }}
      class="space-y-4"
    >
      <div>
        <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          bind:value={email}
          required
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          bind:value={password}
          required
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      {#if errorMessage}
        <p class="text-red-600 text-sm">{errorMessage}</p>
      {/if}

      <button
        type="submit"
        disabled={loading}
        class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
      >
        {loading ? 'Signing In...' : 'Sign In'}
      </button>
    </form>
  </div>
</div>















