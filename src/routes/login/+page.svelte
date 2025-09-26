<script lang="ts">
  import { supabase } from '$lib/supabase';
  import { authStore } from '$lib/stores/auth';
  import { writable } from 'svelte/store';

  let email = '';
  let password = '';
  let loading = false;
  let errorMessage = '';

  // Update authStore with token + userId
  function setAuth(token: string, userId: string) {
    authStore.set({ token, userId });
  }

  async function handleLogin(e: Event) {
    e.preventDefault();
    errorMessage = '';
    loading = true;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        errorMessage = error.message;
        return;
      }

      if (!data.session) {
        errorMessage = 'No session returned from Supabase';
        return;
      }

      setAuth(data.session.access_token, data.user.id);

    } catch (err: any) {
      console.error(err);
      errorMessage = err.message || 'Login failed';
    } finally {
      loading = false;
    }
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

    <form on:submit|preventDefault={handleLogin} class="mt-8 space-y-6">
      <div class="space-y-4">
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700">
            Email address
          </label>
          <input
            id="email"
            type="email"
            bind:value={email}
            required
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter your email"
          />
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            bind:value={password}
            required
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter your password"
          />
        </div>
      </div>

      {#if errorMessage}
        <div class="rounded-md bg-red-50 p-4 text-sm text-red-800">{errorMessage}</div>
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



