<script lang="ts">
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';
  import { invalidateAll } from '$app/navigation';
  import type { PageData, ActionData } from './$types';
  import { page } from '$app/stores';

  let { data }: { data: PageData } = $props();  // <-- Add this line

  let form = $derived($page.form as ActionData);
  let loading = $state(false);
  let showPassword = $state(false);
  let showConfirmPassword = $state(false);
  
  let status = $state<'loading' | 'ready' | 'error' | 'pkce-error'>('loading');
  let errorMessage = $state<string | null>(null);

  onMount(() => {
    console.log('=== Reset Password Page Mount ===');
    console.log('URL:', window.location.href);

    // Check if we already have a session from layout - this takes priority over PKCE errors
    if (data?.session?.user) {
      console.log('Found session from layout - ready for password reset');
      status = 'ready';
      // Clean up URL if there's a code in it
      if (window.location.search.includes('code=')) {
        window.history.replaceState(null, '', window.location.pathname);
      }
      return;
    }
    
    // Listen for auth state changes - this catches the recovery event
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event, 'Has session:', !!session);
      
      if (event === 'PASSWORD_RECOVERY') {
        console.log('PASSWORD_RECOVERY event - ready to reset');
        status = 'ready';
        // Clean URL
        window.history.replaceState(null, '', window.location.pathname);
        await invalidateAll();
      } else if (event === 'SIGNED_IN' && session) {
        // Check if this is from a recovery flow
        const hash = window.location.hash;
        if (hash.includes('type=recovery') || status === 'loading') {
          console.log('SIGNED_IN from recovery flow - ready to reset');
          status = 'ready';
          window.history.replaceState(null, '', window.location.pathname);
          await invalidateAll();
        }
      }
    });

    // Check for existing session first
    checkSession();
    
    return () => {
      subscription.unsubscribe();
    };
  });

  async function checkSession() {
    // First check if we already have a session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      console.log('Found existing session');
      status = 'ready';
      return;
    }

    // Check for hash tokens (implicit flow / magic link style)
    const hash = window.location.hash.substring(1);
    if (hash) {
      console.log('Found hash in URL, letting Supabase handle it...');
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const hashType = hashParams.get('type');
      const errorParam = hashParams.get('error');
      const errorDescription = hashParams.get('error_description');
      
      if (errorParam) {
        console.error('Error in hash:', errorParam, errorDescription);
        status = 'error';
        errorMessage = errorDescription || 'Invalid or expired reset link.';
        return;
      }
      
      if (accessToken && refreshToken && hashType === 'recovery') {
        try {
          const { data: { session: newSession }, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (newSession) {
            console.log('Session set from hash tokens');
            window.history.replaceState(null, '', window.location.pathname);
            await invalidateAll();
            status = 'ready';
            return;
          }
          
          if (sessionError) {
            console.error('Session error:', sessionError.message);
            if (sessionError.message?.includes('expired')) {
              status = 'error';
              errorMessage = 'This reset link has expired. Please request a new one.';
            } else {
              status = 'error';
              errorMessage = 'Failed to verify reset link. Please try again.';
            }
            return;
          }
        } catch (e) {
          console.error('Hash token error:', e);
          status = 'error';
          errorMessage = 'Failed to process reset link.';
          return;
        }
      }
    }

    // Check for code in URL (PKCE flow)
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const urlError = urlParams.get('error');
    const urlErrorDescription = urlParams.get('error_description');
    
    if (urlError) {
      console.error('Error in URL:', urlError, urlErrorDescription);
      status = 'error';
      errorMessage = urlErrorDescription || 'Invalid or expired reset link.';
      return;
    }
    
    if (code) {
      console.log('Found code in URL, attempting exchange...');
      
      try {
        const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        
        if (exchangeError) {
          console.error('Exchange error:', exchangeError.message, exchangeError.status);
          
          // PKCE verifier mismatch = different browser
          if (exchangeError.status === 400 || 
              exchangeError.message?.toLowerCase().includes('verifier') ||
              exchangeError.message?.toLowerCase().includes('non-empty') ||
              exchangeError.message?.toLowerCase().includes('code_verifier')) {
            status = 'pkce-error';
            return;
          }
          
          status = 'error';
          errorMessage = 'This reset link has expired or already been used.';
          return;
        }
        
        if (exchangeData?.session) {
          console.log('Exchange successful!');
          window.history.replaceState(null, '', window.location.pathname);
          await invalidateAll();
          status = 'ready';
          return;
        }
      } catch (e) {
        console.error('Exchange exception:', e);
        status = 'pkce-error';
        return;
      }
    }

    // No tokens in URL - check one more time for session (race condition with onAuthStateChange)
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const { data: { session: finalCheck } } = await supabase.auth.getSession();
    if (finalCheck) {
      console.log('Found session on final check');
      status = 'ready';
      return;
    }

    // Nothing worked
    console.log('No valid tokens or session found');
    status = 'error';
    errorMessage = 'Invalid or expired reset link. Please request a new password reset.';
  }
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

    {#if status === 'loading'}
      <div class="rounded-md bg-green-50 p-4">
        <div class="flex items-center">
          <svg class="animate-spin h-5 w-5 text-green-600 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span class="text-sm text-green-800">Verifying reset link...</span>
        </div>
      </div>
      
    {:else if status === 'pkce-error'}
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
              
                <a href="/forgot-password"
                class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-amber-700 bg-amber-100 hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
              >
                Request New Reset Link
              </a>
            </div>
          </div>
        </div>
      </div>
      
    {:else if status === 'error'}
      <div class="rounded-md bg-red-50 p-4">
        <div class="text-sm text-red-800">
          {errorMessage || 'An error occurred. Please try again.'}
        </div>
        <div class="mt-4">
          
            <a href="/forgot-password"
            class="text-sm text-green-600 hover:text-green-700 hover:underline"
          >
            Request a new reset link
          </a>
        </div>
      </div>
      
    {:else if status === 'ready'}
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