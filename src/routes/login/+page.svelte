<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import type { PageData, ActionData } from './$types';

  let { data }: { data: PageData } = $props();

  let form = $derived($page.form as ActionData);

  let loading = $state(false);
  let showMagicLinkForm = $state(false);
</script>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
  <div class="max-w-md w-full space-y-8 p-8 bg-white rounded-2xl shadow-xl">
    <div>
      <div class="flex items-center justify-center mb-4">
        <div class="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
          <span class="text-white font-bold text-xl">DK</span>
        </div>
      </div>
      <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
        Sign in to DriveKind
      </h2>
      <p class="mt-2 text-center text-sm text-gray-600">
        Welcome back! Please enter your credentials
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
            required
            class="mt-1 relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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

      <div>
        <button
          type="submit"
          disabled={loading}
          class="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Signing In...' : 'Sign In'}
        </button>
      </div>
    </form>
    
    <div class="text-center space-y-2">
      <a
        href="/forgot-password"
        class="text-sm text-blue-600 hover:text-blue-500 hover:underline"
      >
        Forgot your Password?
      </a>
      <div class="text-sm text-gray-600">or</div>
      <button
        type="button"
        onclick={() => showMagicLinkForm = !showMagicLinkForm}
        class="text-sm text-blue-600 hover:text-blue-500 hover:underline"
      >
        Sign in with Magic Link
      </button>
    </div>

    {#if showMagicLinkForm}
      <form 
        method="POST"
        action="?/sendMagicLink"
        use:enhance={() => {
          loading = true;
          return async ({ update }) => {
            loading = false;
            await update();
          };
        }}
        class="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
      >
        <div class="mb-4">
          <label for="magicLinkEmail" class="block text-sm font-medium text-gray-700 mb-2">
            Email address
          </label>
          <input
            id="magicLinkEmail"
            name="email"
            type="email"
            required
            class="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your email"
          />
          <p class="mt-2 text-xs text-gray-600">
            We'll send you a link to sign in without a password
          </p>
        </div>

        {#if form?.magicLinkSuccess}
          <div class="rounded-md bg-green-50 p-3 mb-4">
            <div class="text-sm text-green-800">
              Magic link sent! Check your email and click the link to sign in.
            </div>
          </div>
        {/if}

        {#if form?.magicLinkError}
          <div class="rounded-md bg-red-50 p-3 mb-4">
            <div class="text-sm text-red-800">
              {form.magicLinkError}
            </div>
          </div>
        {/if}

        <div class="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            class="flex-1 px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Sending...' : 'Send Magic Link'}
          </button>
          <button
            type="button"
            onclick={() => showMagicLinkForm = false}
            class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    {/if}

    {#if data.passwordResetSuccess}
      <div class="rounded-md bg-green-50 p-4">
        <div class="text-sm text-green-800">
          Password reset successfully! You can now log in with your new password.
        </div>
      </div>
    {/if}
  </div>
</div>