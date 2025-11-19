<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';
  import type { PageData, ActionData } from './$types';

  let { data }: { data: PageData } = $props();

  let form = $derived($page.form as ActionData);
  let loading = $state(false);
  let showSuccess = $state(false);
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
        Forgot Your Password?
      </h2>
      <p class="mt-2 text-center text-sm text-gray-600">
        Enter your email address and we'll send you a magic link to sign in. You can change your password after logging in.
      </p>
    </div>

    {#if showSuccess || form?.success}
      <div class="rounded-md bg-green-50 p-4">
        <div class="text-sm text-green-800">
          {form?.message || 'If an account with that email exists, a magic link has been sent to your email. Click the link to sign in.'}
        </div>
        <div class="mt-4">
          <a
            href="/login"
            class="text-sm text-blue-600 hover:text-blue-500 hover:underline"
          >
            ← Back to Login
          </a>
        </div>
      </div>
    {:else}
      <form
        method="POST"
        action="?/sendMagicLink"
        use:enhance={() => {
          loading = true;
          return async ({ update, result }) => {
            loading = false;
            await update();
            if (result.type === 'success') {
              showSuccess = true;
            }
          };
        }}
        class="mt-8 space-y-6"
      >
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autocomplete="email"
            class="mt-1 relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your email"
          />
        </div>

        {#if form?.error}
          <div class="rounded-md bg-red-50 p-4">
            <div class="text-sm text-red-800">
              {form.error}
            </div>
          </div>
        {/if}

        <div class="flex flex-col space-y-3">
          <button
            type="submit"
            disabled={loading}
            class="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Sending...' : 'Send Magic Link'}
          </button>

          <a
            href="/login"
            class="text-center text-sm text-blue-600 hover:text-blue-500 hover:underline"
          >
            ← Back to Login
          </a>
        </div>
      </form>
    {/if}
  </div>
</div>

