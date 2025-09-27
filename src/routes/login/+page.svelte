<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';

  let email = '';
  let password = '';
  let loading = false;

  // Access server error messages via $page.data.form?.error
  $: errorMessage = $page.data?.form?.error;
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50">
  <div class="max-w-md w-full space-y-8 p-8">
    <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
      Sign in to your account
    </h2>

    <form
      method="POST"
      use:enhance={() => {
        loading = true;
        return ({ update }) => {
          loading = false;
          update(); // let SvelteKit update form data (errors etc.)
        };
      }}
      class="mt-8 space-y-6"
    >
      <div class="space-y-4">
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700">Email address</label>
          <input
            id="email"
            name="email"
            type="email"
            bind:value={email}
            required
            class="mt-1 block w-full px-3 py-2 border rounded-md"
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
            class="mt-1 block w-full px-3 py-2 border rounded-md"
          />
        </div>
      </div>

      {#if errorMessage}
        <div class="rounded-md bg-red-50 p-4 text-sm text-red-800">{errorMessage}</div>
      {/if}

      <button
        type="submit"
        disabled={loading}
        class="w-full py-2 px-4 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? 'Signing In...' : 'Sign In'}
      </button>
    </form>
  </div>
</div>














