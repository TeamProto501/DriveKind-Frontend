<!-- src/lib/components/RoleGuard.svelte -->
<script lang="ts">
	import { getContext } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Shield, AlertTriangle, Loader2 } from '@lucide/svelte';
	import type { RoleEnum } from '$lib/types';
	import { getDefaultRoute } from '$lib/navigation';
	
	let { requiredRoles, children, fallback } = $props<{
		requiredRoles: RoleEnum[];
		children: any;
		fallback?: any;
	}>();
	
	// Get session from context
	const session = getContext('session');
	
	// Mock user roles - replace with actual data from your database
	let userRoles = $state<RoleEnum[]>([]);
	let isLoading = $state(true);
	
	// Check if user has required roles using runes
	const hasAccess = $derived(requiredRoles.some(role => userRoles.includes(role)));
	
	// Load user roles on mount using $effect
	$effect(() => {
		if (session?.user) {
			loadUserRoles();
		} else {
			isLoading = false;
		}
	});
	
	async function loadUserRoles() {
		try {
			// TODO: Replace with actual API call to get user roles
			// For now, using mock data
			userRoles = ['Admin', 'Dispatcher'];
		} catch (error) {
			console.error('Error loading user roles:', error);
		} finally {
			isLoading = false;
		}
	}
	
	// Redirect unauthorized users using $effect
	$effect(() => {
		if (!isLoading && !hasAccess && session?.user) {
			const defaultRoute = getDefaultRoute(userRoles);
			goto(defaultRoute);
		}
	});
</script>

{#if isLoading}
	<div class="min-h-screen flex items-center justify-center">
		<div class="text-center">
			<Loader2 class="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
			<p class="text-gray-600">Checking permissions...</p>
		</div>
	</div>
{:else if !session}
	<!-- Not authenticated -->
	<div class="min-h-screen flex items-center justify-center">
		<div class="text-center">
			<Shield class="w-16 h-16 text-gray-400 mx-auto mb-4" />
			<h2 class="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
			<p class="text-gray-600 mb-4">Please sign in to access this page.</p>
			<a
				href="/login"
				class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
			>
				Sign In
			</a>
		</div>
	</div>
{:else if !hasAccess}
	<!-- Not authorized -->
	<div class="min-h-screen flex items-center justify-center">
		<div class="text-center">
			<AlertTriangle class="w-16 h-16 text-red-400 mx-auto mb-4" />
			<h2 class="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
			<p class="text-gray-600 mb-4">
				You don't have permission to access this page. Required roles: {requiredRoles.join(', ')}
			</p>
			<p class="text-sm text-gray-500 mb-4">
				Your current roles: {userRoles.join(', ')}
			</p>
			<a
				href="/"
				class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
			>
				Go Home
			</a>
		</div>
	</div>
{:else}
	<!-- Authorized - render children -->
	{@render children()}
{/if}
