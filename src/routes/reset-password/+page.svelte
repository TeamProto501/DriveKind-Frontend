<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';
  import type { ActionData } from './$types';

  let form = $derived($page.form as ActionData);
  let loading = $state(false);
</script>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
  <div class="max-w-md w-full space-y-8 p-8 bg-white rounded-2xl shadow-xl">
    <div class="text-center">
      <div class="flex items-center justify-center mb-4">
        <div class="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
          <span class="text-white font-bold text-xl">DK</span>
        </div>
      </div>
      <h1 class="text-3xl font-bold text-gray-900">Forgot your password?</h1>
      <p class="mt-2 text-sm text-gray-600">
        Enter the email tied to your DriveKind account and we'll send reset instructions.
      </p>
    </div>

    <form
      method="POST"
      action="?/request"
      class="space-y-6"
      use:enhance={() => {
        loading = true;
        return async ({ update }) => {
          loading = false;
          await update();
        };
      }}
    >
      <div>
        <label for="email" class="block text-sm font-medium text-gray-700">
          Email address
        </label>
        <input
          type="email"
          name="email"
          id="email"
          required
          class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="you@example.com"
        />
      </div>

      {#if form?.error}
        <div class="rounded-md bg-red-50 p-4 text-sm text-red-800">
          {form.error}
        </div>
      {/if}

      {#if form?.success}
        <div class="rounded-md bg-green-50 p-4 text-sm text-green-800">
          Check your inbox for a secure link to finish resetting your password.
        </div>
      {/if}

      <button
        type="submit"
        class="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
        disabled={loading}
      >
        {loading ? 'Sending reset link...' : 'Send reset link'}
      </button>
    </form>

    <div class="text-center">
      <a href="/login" class="text-sm font-medium text-blue-600 hover:text-blue-700">
        Back to sign in
      </a>
    </div>
  </div>
</div>
