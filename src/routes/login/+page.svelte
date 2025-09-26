<script lang="ts">
  import { enhance } from '$app/forms';
  import { authStore } from '$lib/stores/auth';
  import type { PageData, ActionData } from './$types';

  export let data: PageData;
  export let form: ActionData;

  let loading = false;

  function setAuth(token: string, userId: string) {
    authStore.set({ token, userId });
  }
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50">
  <div class="max-w-md w-full space-y-8 p-8">
    <h2 class="text-3xl font-extrabold text-gray-900 text-center">
      Sign in to your account
    </h2>

    <form on:submit|preventDefault={handleLogin} class="space-y-6">
      <div>
        <label class="block text-sm font-medium text-gray-700">Email</label>
        <input type="email" bind:value={email} required class="mt-1 block w-full px-3 py-2 border rounded-md" />
      </div>

    <form
      method="POST"
      use:enhance={({ formElement, formData }) => {
        loading = true;
        return async ({ result, update }) => {
          loading = false;
          if (result.type === 'success') {
            if (result.data?.token && result.data?.userId) {
              setAuth(result.data.token.toString(), result.data.userId.toString());
            }
          } else {
            await update();
          }
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
            value={form?.email ?? ''}
            required
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter your email"
          />
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter your password"
          />
        </div>
      </div>

      {#if form?.error}
        <div class="rounded-md bg-red-50 p-4 text-sm text-red-800">{form.error}</div>
      {/if}

      <div>
        <button
          type="submit"
          disabled={loading}
          class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Signing In...' : 'Sign In'}
        </button>
      </div>
    </form>

    <div class="text-center">
      <a href="/" class="text-indigo-600 hover:text-indigo-500">← Back to home</a>
    </div>
  </div>
</div>






