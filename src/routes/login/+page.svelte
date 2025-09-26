<script lang="ts">
  import { supabase } from '$lib/supabase';
  import { goto } from '$app/navigation';

  let email = '';
  let password = '';
  let loading = false;
  let error: string | null = null;

  async function handleLogin() {
    loading = true;
    error = null;

    const { data, error: err } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    loading = false;

    if (err) {
      error = err.message;
    } else if (data.session) {
      // Session automatically stored in localStorage
      goto('/users'); // redirect to user management or profile
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

      <div>
        <label class="block text-sm font-medium text-gray-700">Password</label>
        <input type="password" bind:value={password} required class="mt-1 block w-full px-3 py-2 border rounded-md" />
      </div>

      {#if error}
        <p class="text-red-600 text-sm">{error}</p>
      {/if}

      <button type="submit" disabled={loading} class="w-full py-2 px-4 bg-indigo-600 text-white rounded-md">
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  </div>
</div>
