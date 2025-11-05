<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';
  import type { PageData, ActionData } from './$types';

  let { data }: { data: PageData } = $props();
  let form = $derived($page.form as ActionData);
  let loading = $state(false);
</script>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
  <div class="max-w-md w-full space-y-8 p-8 bg-white rounded-2xl shadow-xl">
    <div class="text-center space-y-2">
      <div class="flex items-center justify-center">
        <div class="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
          <span class="text-white font-bold text-xl">DK</span>
        </div>
      </div>
      <h1 class="text-3xl font-bold text-gray-900">Set a new password</h1>
      <p class="text-sm text-gray-600">
        {#if data.status === 'ready'}
          Enter a strong password to secure your DriveKind account.
        {:else if data.status === 'needs_code'}
          {#if data.email}
            We sent a reset link to {data.email}. Open that email and click the link to continue.
          {:else}
            Check your email for the reset link before completing this step.
          {/if}
        {:else if data.status === 'error'}
          {data.message}
        {/if}
      </p>
    </div>

    <form
      method="POST"
      action="?/update"
      class="space-y-6"
      use:enhance={() => {
        loading = true;
        return async ({ update }) => {
          loading = false;
          await update();
        };
      }}
    >
      <div class="space-y-4">
        <div>
          <label for="password" class="block text-sm font-medium text-gray-700">
            New password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            minlength="8"
            required
            class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="At least 8 characters"
          />
        </div>
        <div>
          <label for="confirmPassword" class="block text-sm font-medium text-gray-700">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            minlength="8"
            required
            class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Re-enter password"
          />
        </div>
      </div>

      {#if form?.error}
        <div class="rounded-md bg-red-50 p-4 text-sm text-red-800">
          {form.error}
        </div>
      {/if}

      {#if form?.success}
        <div class="rounded-md bg-green-50 p-4 text-sm text-green-800">
          Password updated! You can now sign in with your new password.
        </div>
      {/if}

      <button
        type="submit"
        class="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
        disabled={loading || data.status !== 'ready'}
      >
        {loading ? 'Updating password...' : 'Update password'}
      </button>
    </form>

    <div class="text-center">
      <a href="/login" class="text-sm font-medium text-blue-600 hover:text-blue-700">
        Return to sign in
      </a>
    </div>
  </div>
</div>
