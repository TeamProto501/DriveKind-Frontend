<script lang="ts">
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';
  import { invalidateAll } from '$app/navigation';
  import type { PageData, ActionData } from './$types';
  import { page } from '$app/stores';

  let { data }: { data: PageData } = $props();

  let form = $derived($page.form as ActionData);
  let loading = $state(false);
  let showPassword = $state(false);
  let showConfirmPassword = $state(false);
  let hasValidToken = $state(data.hasValidToken || false);
  let error = $state(data.error || null);
  let isProcessing = $state(false);
  
  // If server already validated the token, we're good
  if (data.hasValidToken) {
    hasValidToken = true;
  }

  // Handle hash fragments and code query params on client side
  onMount(async () => {
    console.log('Reset password page loaded');
    console.log('Current URL:', window.location.href);
    console.log('Hash:', window.location.hash);
    console.log('Search params:', window.location.search);
    
    // Check for code in query parameters (PKCE flow)
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const type = urlParams.get('type');
    
    // If we have a code parameter and server-side exchange failed, try client-side
    // Note: We check for code even without type='recovery' since we're on the reset-password page
    if (code && !data.hasValidToken) {
      isProcessing = true;
      console.log('Attempting client-side code exchange...', { code, type });
      try {
        const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        
        if (exchangeError) {
          console.error('Client-side code exchange error:', exchangeError);
          error = `Invalid or expired reset token: ${exchangeError.message}. Please request a new password reset link.`;
          isProcessing = false;
          return;
        }
        
        if (exchangeData?.session) {
          console.log('Client-side code exchange successful, session created');
          hasValidToken = true;
          error = null;
          isProcessing = false;
          // Remove code from URL
          urlParams.delete('code');
          urlParams.delete('type');
          const newSearch = urlParams.toString();
          window.history.replaceState(null, '', window.location.pathname + (newSearch ? `?${newSearch}` : ''));
          await invalidateAll();
          return;
        } else {
          console.log('Code exchanged but no session returned');
          isProcessing = false;
        }
      } catch (e) {
        console.error('Error in client-side code exchange:', e);
        error = 'Invalid or expired reset token. Please request a new password reset link.';
        isProcessing = false;
        return;
      }
    }
    
    // Check if there are hash fragments in the URL
    const hash = window.location.hash.substring(1);
    
    if (hash) {
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');
      const refreshToken = hashParams.get('refresh_token');

      console.log('Token params found:', { 
        hasAccessToken: !!accessToken, 
        type, 
        hasRefreshToken: !!refreshToken 
      });

      if (accessToken && type === 'recovery' && refreshToken) {
        // Exchange the tokens for a session
        isProcessing = true;
        try {
          console.log('Attempting to set session with recovery tokens...');
          const { data: { session }, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error('Session error:', sessionError);
            error = `Invalid or expired reset token: ${sessionError.message}. Please request a new password reset link.`;
            isProcessing = false;
            return;
          }

          if (session) {
            console.log('Session created successfully, user:', session.user?.email);
            hasValidToken = true;
            error = null;
            isProcessing = false;
            // Remove hash from URL
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
            await invalidateAll();
          } else {
            console.error('No session returned after setSession');
            error = 'Invalid or expired reset token. Please request a new password reset link.';
            isProcessing = false;
          }
        } catch (e) {
          console.error('Error setting session:', e);
          error = 'Invalid or expired reset token. Please request a new password reset link.';
          isProcessing = false;
        }
      } else {
        console.error('Missing required token parameters:', { accessToken: !!accessToken, type, refreshToken: !!refreshToken });
        error = 'Invalid reset link format. Please request a new password reset link.';
      }
    } else {
      // No hash fragments - check if we already have a valid session (might have been set by server-side code exchange)
      console.log('No hash fragments, checking existing session...');
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('Found existing session');
        hasValidToken = true;
        isProcessing = false;
      } else if (!data.hasValidToken && !code) {
        // Only show error if server didn't already validate and we don't have a code to process
        console.error('No session found and no hash fragments');
        error = data.error || 'Invalid or expired reset token. Please click the link from your email or request a new password reset link.';
        isProcessing = false;
      } else if (code) {
        // We have a code, processing will happen above
        isProcessing = true;
      } else {
        isProcessing = false;
      }
    }
  });
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
        Set New Password
      </h2>
      <p class="mt-2 text-center text-sm text-gray-600">
        Enter your new password below
      </p>
    </div>

    {#if error}
      <div class="rounded-md bg-red-50 p-4">
        <div class="text-sm text-red-800">
          {error}
        </div>
        <div class="mt-4">
          <a
            href="/forgot-password"
            class="text-sm text-blue-600 hover:text-blue-500 hover:underline"
          >
            Request a new reset link
          </a>
        </div>
      </div>
    {:else if isProcessing || (!hasValidToken && !error)}
      <div class="rounded-md bg-yellow-50 p-4">
        <div class="text-sm text-yellow-800">
          Verifying reset token...
        </div>
      </div>
    {:else}
      <form
        method="POST"
        action="?/updatePassword"
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
            <label for="password" class="block text-sm font-medium text-gray-700">
              New Password
            </label>
            <div class="mt-1 relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                autocomplete="new-password"
                minlength="6"
                class="relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your new password"
              />
              <button
                type="button"
                onclick={() => (showPassword = !showPassword)}
                class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <p class="mt-1 text-xs text-gray-500">Must be at least 6 characters</p>
          </div>

          <div>
            <label for="confirmPassword" class="block text-sm font-medium text-gray-700">
              Confirm New Password
            </label>
            <div class="mt-1 relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                autocomplete="new-password"
                minlength="6"
                class="relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Confirm your new password"
              />
              <button
                type="button"
                onclick={() => (showConfirmPassword = !showConfirmPassword)}
                class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? 'Hide' : 'Show'}
              </button>
            </div>
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
            {loading ? 'Updating Password...' : 'Update Password'}
          </button>
        </div>
      </form>
    {/if}
  </div>
</div>

