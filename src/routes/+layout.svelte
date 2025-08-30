<script lang="ts">
	let { children, data } = $props();
 	import { setContext, onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { supabase } from '$lib/supabase';
	
	setContext('session', data.session);

	onMount(() => {
		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange(() => {
			console.log('Auth state change detected');
			invalidateAll();
		});

		return () => {
			subscription.unsubscribe();
		};
	});
</script>

<nav class="flex flex-row justify-between items-center gap-4 m-4 p-4 bg-white rounded-lg shadow">
	<div class="flex flex-row gap-4">
		<a href="/" class="text-indigo-600 hover:text-indigo-500 font-medium">Home</a>
		{#if data.session}
			<a href="/admin/dash" class="text-indigo-600 hover:text-indigo-500 font-medium">Dashboard</a>
		{/if}
	</div>
	
	<div class="flex flex-row gap-4 items-center">
		{#if data.session}
			<span class="text-sm text-gray-600">Welcome, {data.session.user.email}</span>
		{:else}
			<a href="/login" class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
				Sign In
			</a>
		{/if}
	</div>
</nav>

{@render children()}