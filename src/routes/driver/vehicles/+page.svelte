<script lang="ts">
	import { supabase } from '$lib/supabase';
	import { getContext, onMount } from 'svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import RoleGuard from '$lib/components/RoleGuard.svelte';
	import { Car, CheckCircle2, AlertTriangle } from '@lucide/svelte';

	const session = getContext<any>('session');

	type Vehicle = {
		vehicle_id: number;
		user_id: string;
		nondriver_seats: number | null;
		vehicle_color: string | null;
		type_of_vehicle_enum: 'SUV' | 'Sedan' | 'Van' | 'Motorcycle' | 'Truck' | 'Coupe' | null;
		org_id: number | null;
		active: boolean | null;
	};

	let uid: string | null = $state(null);
	let isLoading = $state(true);
	let loadError = $state('');
	let vehicles = $state<Vehicle[]>([]);
	let toast = $state('');
	let toastOk = $state(true);

	function setToast(msg: string, ok = true) {
		toast = msg;
		toastOk = ok;
		setTimeout(() => (toast = ''), 3000);
	}

	function labelPill(active: boolean | null | undefined) {
		return active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
	}

	// --- Normalize active vehicle ---
	async function normalizeActives() {
		if (!uid) return;
		const { data, error } = await supabase
			.from('vehicles')
			.select('vehicle_id, active')
			.eq('user_id', uid)
			.order('vehicle_id', { ascending: true });

		if (error || !data || data.length === 0) return;
		const list = data as { vehicle_id: number; active: boolean | null }[];

		if (list.length === 1) {
			if (!list[0].active)
				await supabase.from('vehicles').update({ active: true }).eq('vehicle_id', list[0].vehicle_id);
			return;
		}

		const actives = list.filter(v => !!v.active).map(v => v.vehicle_id).sort((a, b) => a - b);
		if (actives.length === 0) {
			await supabase.from('vehicles').update({ active: true }).eq('vehicle_id', list[0].vehicle_id);
			return;
		}
		if (actives.length > 1) {
			const keep = actives[0];
			await supabase.from('vehicles').update({ active: false }).eq('user_id', uid).neq('vehicle_id', keep);
			await supabase.from('vehicles').update({ active: true }).eq('vehicle_id', keep);
		}
	}

	async function loadUser() {
		uid = session?.user?.id ?? null;
		if (!uid) {
			const { data, error } = await supabase.auth.getUser();
			if (error) throw error;
			uid = data?.user?.id ?? null;
		}
		if (!uid) throw new Error('No user session');
	}

	async function loadVehicles() {
		try {
			isLoading = true;
			loadError = '';

			await loadUser();
			await normalizeActives();

			const { data, error } = await supabase
				.from('vehicles')
				.select('*')
				.eq('user_id', uid)
				.order('vehicle_id', { ascending: true });

			if (error) throw error;

			// Active vehicles first
			vehicles = (data ?? []).sort((a, b) => {
				if (a.active && !b.active) return -1;
				if (!a.active && b.active) return 1;
				return a.vehicle_id - b.vehicle_id;
			});
		} catch (e: any) {
			loadError = e?.message ?? 'Failed to load vehicles';
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		void loadVehicles();
	});

	async function setActive(vehicle_id: number) {
		if (!uid) return;
		try {
			const off = await supabase
				.from('vehicles')
				.update({ active: false })
				.eq('user_id', uid)
				.neq('vehicle_id', vehicle_id);
			if (off.error) throw off.error;

			const on = await supabase
				.from('vehicles')
				.update({ active: true })
				.eq('vehicle_id', vehicle_id);
			if (on.error) throw on.error;

			setToast('Active vehicle updated.', true);
			await loadVehicles();
		} catch (e: any) {
			setToast(e?.message ?? 'Failed to set active vehicle.', false);
		}
	}
</script>

<RoleGuard requiredRoles={['Driver', 'Admin', 'Super Admin']}>
	<div class="min-h-screen bg-gray-50">
		<Breadcrumbs />

		<!-- Header -->
		<div class="bg-white shadow-sm border-b border-gray-200">
			<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
				<div class="flex items-center gap-3">
					<div class="p-2 bg-blue-100 rounded-lg">
						<Car class="w-6 h-6 text-blue-600" />
					</div>
					<div>
						<h1 class="text-2xl font-bold text-gray-900">My Vehicles</h1>
						<p class="text-sm text-gray-600">View your vehicles and choose the active one.</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Toast -->
		{#if toast}
			<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
				<div
					class={toastOk
						? 'rounded-md p-3 bg-green-50 border border-green-200'
						: 'rounded-md p-3 bg-red-50 border border-red-200'}>
					<p class={toastOk ? 'text-sm text-green-800' : 'text-sm text-red-800'}>{toast}</p>
				</div>
			</div>
		{/if}

		<!-- Main -->
		<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
			{#if isLoading}
				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
					<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
					<p class="mt-2 text-gray-500">Loading vehicles...</p>
				</div>
			{:else if loadError}
				<div class="bg-red-50 border border-red-200 rounded-lg p-6">
					<div class="flex">
						<AlertTriangle class="w-5 h-5 text-red-400 mr-3 mt-0.5" />
						<div>
							<h3 class="text-sm font-medium text-red-800">Error Loading Vehicles</h3>
							<p class="mt-1 text-sm text-red-700">{loadError}</p>
						</div>
					</div>
				</div>
			{:else}
				{#if vehicles.length === 0}
					<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
						<Car class="w-16 h-16 text-gray-300 mx-auto mb-4" />
						<h3 class="text-lg font-medium text-gray-900 mb-2">No vehicles found</h3>
						<p class="text-gray-500">Your account doesn’t have any vehicles yet.</p>
					</div>
				{:else}
					<div class="space-y-6">
						{#each vehicles as v (v.vehicle_id)}
							<div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
								<div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
									<div class="flex items-center gap-3">
										<div class="p-2 bg-blue-100 rounded-lg">
											<Car class="w-5 h-5 text-blue-600" />
										</div>
										<div>
											<h2 class="text-lg font-semibold text-gray-900">
												Vehicle #{v.vehicle_id} • {v.type_of_vehicle_enum ?? '—'}
											</h2>
										</div>
									</div>
									<div class="flex items-center gap-2">
										<span class={"px-2.5 py-0.5 rounded-full text-xs font-medium " + labelPill(v.active)}>
											{v.active ? 'Active' : 'Inactive'}
										</span>
										{#if !v.active}
											<button
												class="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
												on:click={() => setActive(v.vehicle_id)}>
												<CheckCircle2 class="w-4 h-4" />
												<span>Set Active</span>
											</button>
										{/if}
									</div>
								</div>

								<div class="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
									<div>
										<label class="block text-sm font-medium text-gray-700">Color</label>
										<p class="mt-1 text-gray-900">{v.vehicle_color ?? '—'}</p>
									</div>
									<div>
										<label class="block text-sm font-medium text-gray-700">Non-driver Seats</label>
										<p class="mt-1 text-gray-900">{v.nondriver_seats ?? '—'}</p>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			{/if}
		</div>
	</div>
</RoleGuard>