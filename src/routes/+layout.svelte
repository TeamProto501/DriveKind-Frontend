<script lang="ts">
	let { children, data } = $props();
 	import { setContext, onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { supabase } from '$lib/supabase';
	import Navbar from '$lib/components/Navbar.svelte';
	
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

<Navbar />

{@render children()}