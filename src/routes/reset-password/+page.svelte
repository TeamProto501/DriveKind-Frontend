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
  let showSameBrowserWarning = $state(false);
  
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
    if (code && !data.hasValidToken) {
      isProcessing = true;
      console.log('Attempting client-side code exchange...', { code, type });
      
      try {
        const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        
        if (exchangeError) {
          console.error('Client-side code exchange error:', exchangeError);
          
          // Check if it's a PKCE verifier error (different browser issue)
          if (exchangeError.message?.includes('code verifier') || 
              exchangeError.message?.includes('code_verifier') ||
              exchangeError.message?.includes('non-empty')) {
            showSameBrowserWarning = true;
            isProcessing = false;
            return;
          }
          
          error = 'This reset link has expired or already been used. Please request a new one.';
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
          error = 'This reset link has expired or already been used. Please request a new one.';
          isProcessing = false;
          return;
        }
      } catch (e) {
        console.error('Error in client-side code exchange:', e);
        // Check for PKCE error in caught exception
        if (e instanceof Error && (e.message?.includes('verifier') || e.message?.includes('non-empty'))) {
          showSameBrowserWarning = true;
        } else {
          error = 'Invalid or expired reset token. Please request a new password reset link.';
        }
        isProcessing = false;
        return;
      }
    }
    
    // Check if there are hash fragments in the URL (implicit flow)
    const hash = window.location.hash.substring(1);
    
    if (hash) {
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get('access_token');
      const hashType = hashParams.get('type');
      const refreshToken = hashParams.get('refresh_token');

      console.log('Token params found:', { 
        hasAccessToken: !!accessToken, 
        type: hashType, 
        hasRefreshToken: !!refreshToken 
      });

      if (accessToken && hashType === 'recovery' && refreshToken) {
        // Exchange the tokens for a session (implicit flow)
        isProcessing = true;
        try {
          console.log('Attempting to set session with recovery tokens...');
          const { data: { session }, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error('Session error:', sessionError);
            error = 'Invalid or expired reset token. Please request a new password reset link.';
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
      } else if (accessToken || refreshToken) {
        console.error('Incomplete token parameters');
        error = 'Invalid reset link format. Please request a new password reset link.';
        isProcessing = false;
      }
    } else if (!code) {
      // No hash fragments and no code - check existing session
      console.log('No hash fragments or code, checking existing session...');
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('Found existing session');
        hasValidToken = true;
        isProcessing = false;
      } else if (!data.hasValidToken) {
        console.error('No session found and no tokens in URL');
        error = data.error || 'Invalid or expired reset token. Please click the link from your email or request a new password reset link.';
        isProcessing = false;
      }
    }
  });
</script>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
  <div class="max-w-md w-full space-y-8 p-8 bg-white rounded-2xl shadow-xl">
    <div>
      <div class="flex items-center justify-center mb-4">
        <div class="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
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

    {#if showSameBrowserWarning}
      <!-- PKCE same-browser warning -->
      <div class="rounded-md bg-amber-50 border border-amber-200 p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-amber-800">
              Different Browser Detected
            </h3>
            <div class="mt-2 text-sm text-amber-700">
              <p>
                For security, you must open this link in the <strong>same browser</strong> where you requested the password reset.
              </p>
              <p class="mt-2">
                Please try one of these options:
              </p>
              <ul class="list-disc list-inside mt-1 space-y-1">
                <li>Copy this link and paste it in your original browser</li>
                <li>Request a new password reset from this browser</li>
              </ul>
            </div>
            <div class="mt-4">
              <a
                href="/forgot-password"
                class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-amber-700 bg-amber-100 hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
              >
                Request New Reset Link
              </a>
            </div>
          </div>
        </div>
      </div>
    {:else if error}
      <div class="rounded-md bg-red-50 p-4">
        <div class="text-sm text-red-800">
          {error}
        </div>
        <div class="mt-4">
          <a
            href="/forgot-password"
            class="text-sm text-green-600 hover:text-green-700 hover:underline"
          >
            Request a new reset link
          </a>
        </div>
      </div>
    {:else if isProcessing || (!hasValidToken && !error && !showSameBrowserWarning)}
      <div class="rounded-md bg-green-50 p-4">
        <div class="flex items-center">
          <svg class="animate-spin h-5 w-5 text-green-600 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span class="text-sm text-green-800">Verifying reset token...</span>
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
                class="relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-green-500 focus:border-green-500"
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
                class="relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-green-500 focus:border-green-500"
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
            class="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Updating Password...' : 'Update Password'}
          </button>
        </div>
      </form>
    {/if}
  </div>
</div>