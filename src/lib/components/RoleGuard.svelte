<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Shield, AlertTriangle, Loader2 } from '@lucide/svelte';
	import type { RoleEnum } from '$lib/types';

	export let requiredRoles: RoleEnum[] = [];
	export let children: any;
	export let fallback?: any;

	// Get session from context
	const session = getContext('session');

	// User roles and loading state
	let userRoles: RoleEnum[] = [];
	let isLoading = true;

	// Check if user has any of the required roles
	$: hasAccess = requiredRoles.some(role => userRoles.includes(role));

	// Default route based on user roles
	function getDefaultRoute(roles: RoleEnum[]): string {
		if (roles.includes('Admin')) return '/admin/dash';
		if (roles.includes('Dispatcher')) return '/dispatcher/dashboard';
		if (roles.includes('Driver')) return '/driver/rides';
		return '/';
	}

	// Load user roles on mount
	onMount(async () => {
		if (session?.user) {
			await loadUserRoles();
		} else {
			isLoading = false;
		}
	});

	async function loadUserRoles() {
		try {
			// ✅ Force Admin role for your account here if needed
			if (session.user.email === 'your-email@example.com') {
				userRoles = ['Admin'];
			} else {
				// TODO: replace with actual API call to fetch roles from staff_profiles
				userRoles = ['Admin', 'Dispatcher']; 
			}
		} catch (err) {
			console.error('Error loading user roles:', err);
		} finally {
			isLoading = false;
		}
	}

	// Redirect unauthorized users
	$: if (!isLoading && session?.user && !hasAccess) {
		const defaultRoute = getDefaultRoute(userRoles);
		goto(defaultRoute);
	}
</script>

{#if isLoading}
	<div class="min-h-screen flex items-center justify-center">
		<div class="text-center">
			<Loader2 class="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
			<p class="text-gray-600">Checking permissions...</p>
		</div>
	</div>
{:else if !session}
	<div class="min-h-screen flex items-center justify-center">
		<div class="text-center">
			<Shield class="w-16 h-16 text-gray-400 mx-auto mb-4" />
			<h2 class="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
			<p class="text-gray-600 mb-4">Please sign in to access this page.</p>
			<a href="/login" class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200">
				Sign In
			</a>
		</div>
	</div>
{:else if !hasAccess}
	<div class="min-h-screen flex items-center justify-center">
		<div class="text-center">
			<AlertTriangle class="w-16 h-16 text-red-400 mx-auto mb-4" />
			<h2 class="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
			<p class="text-gray-600 mb-4">
				You don't have permission to access this page. Required roles: {requiredRoles.join(', ')}
			</p>
			<p class="text-sm text-gray-500 mb-4">Your current roles: {userRoles.join(', ')}</p>
			<a href="/" class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200">
				Go Home
			</a>
		</div>
	</div>
{:else}
	{@render children()}
{/if}

