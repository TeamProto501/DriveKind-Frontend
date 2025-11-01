<script lang="ts">
	import { Car, Search, Trash2 } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';

	// shadcn/ui
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';

	// ---- Page data from load() (roles, etc.) ----
	interface PageData {
		session?: { user: any } | null;
		profile?: any | null;
		roles?: string[] | null;
	}
	let { data }: { data?: PageData } = $props();

	// ---- Role handling (runes) ----
	let userRoles = $state<string[]>([]);
	function hasRole(required: string[]): boolean {
		return required.some((r) => userRoles.includes(r));
	}
	$effect(() => {
		userRoles = Array.isArray(data?.roles) ? (data!.roles as string[]) : [];
	});
	let canManage = $derived(hasRole(['Admin', 'Super Admin']));

	// ---- Types / State ----
	type VehicleType = 'SUV' | 'Sedan' | 'Van' | 'Motorcycle' | 'Truck' | 'Coupe';
	interface VehicleRow {
		vehicle_id: number;
		type_of_vehicle_enum: VehicleType | null;
		vehicle_color: string | null;
		nondriver_seats: number | null; // int2
		active: boolean | null;
		org_id: number | null; // used only for filtering
	}

	let viewerUid: string | null = $state(null);
	let viewerOrgId: number | null = $state(null);

	let vehicles = $state<VehicleRow[]>([]);
	let isLoading = $state(true);
	let loadError = $state('');
	let searchTerm = $state('');

	// toast
	let toast = $state('');
	let toastOk = $state(true);
	let tostOk = $state(true);
	function setToast(message: string, ok = true) {
		toast = message;
		tostOk = ok;
		toastOk = ok;
		setTimeout(() => (toast = ''), 3500);
	}

	// DELETE modal
	let showDeleteModal = $state(false);
	let isDeleting = $state(false);
	let toDelete = $state<VehicleRow | null>(null);

	onMount(async () => {
		try {
			await loadViewerIdentity();
			if (!viewerOrgId) {
				loadError = 'Your staff profile is not linked to an organization.';
				isLoading = false;
				return;
			}
			await loadVehicles();
		} catch (e: any) {
			loadError = e?.message ?? 'Failed to initialize.';
			isLoading = false;
		}
	});

	// ---- Viewer org lookup ----
	async function loadViewerIdentity() {
		viewerUid = data?.session?.user?.id ?? null;
		if (!viewerUid) {
			const { data: auth, error } = await supabase.auth.getUser();
			if (error) throw error;
			viewerUid = auth?.user?.id ?? null;
		}
		if (!viewerUid) throw new Error('No user session.');

		const { data: sp, error: spErr } = await supabase
			.from('staff_profiles')
			.select('org_id')
			.eq('user_id', viewerUid)
			.single();

		if (spErr) throw spErr;
		viewerOrgId = (sp?.org_id ?? null) as number | null;
	}

	// ---- Load vehicles for viewer's org ONLY ----
	async function loadVehicles() {
		if (!viewerOrgId) return;
		try {
			isLoading = true;
			loadError = '';

			const { data: rows, error } = await supabase
				.from('vehicles')
				.select('vehicle_id, type_of_vehicle_enum, vehicle_color, nondriver_seats, active, org_id')
				.eq('org_id', viewerOrgId)
				.order('vehicle_id', { ascending: true });

			if (error) throw error;

			vehicles = (rows ?? []) as VehicleRow[];
		} catch (e: any) {
			console.error('Load error:', e?.message ?? e);
			loadError = e?.message ?? 'Failed to load vehicles.';
			vehicles = [];
		} finally {
			isLoading = false;
		}
	}

	// ------- Delete -------
	function openDeleteModal(row: VehicleRow) {
		if (!canManage) return;
		toDelete = row;
		showDeleteModal = true;
	}

	async function confirmDelete() {
		if (!canManage) {
			setToast('You do not have permission to delete vehicles.', false);
			return;
		}
		if (!toDelete || !viewerOrgId) return;

		isDeleting = true;
		try {
			const { error } = await supabase
				.from('vehicles')
				.delete()
				.eq('vehicle_id', toDelete.vehicle_id)
				.eq('org_id', viewerOrgId);

			if (error) throw error;

			setToast('Vehicle deleted.', true);
			showDeleteModal = false;
			toDelete = null;
			await loadVehicles();
		} catch (err: any) {
			console.error('Delete error:', err?.message ?? err);
			setToast(err?.message ?? 'Failed to delete vehicle.', false);
		} finally {
			isDeleting = false;
		}
	}

	// ------- FILTER (client-side) -------
	let filteredVehicles = $derived(
		!vehicles?.length
			? []
			: !searchTerm.trim()
				? vehicles
				: vehicles.filter((v) => {
						const q = searchTerm.toLowerCase();
						return (
							String(v.vehicle_id ?? '').toLowerCase().includes(q) ||
							String(v.type_of_vehicle_enum ?? '').toLowerCase().includes(q) ||
							String(v.vehicle_color ?? '').toLowerCase().includes(q) ||
							String(v.nondriver_seats ?? '').toLowerCase().includes(q) ||
							String(v.active ? 'active' : 'inactive').includes(q)
						);
				  })
	);
</script>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<div class="bg-white shadow-sm border-b border-gray-200">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
			<div class="flex items-center justify-between">
				<div class="flex items-center space-x-3">
					<div class="p-2 bg-blue-100 rounded-lg">
						<Car class="w-6 h-6 text-blue-600" />
					</div>
					<div>
						<h1 class="text-2xl font-bold text-gray-900">Vehicles</h1>
						<p class="text-sm text-gray-600">Vehicles in your organization</p>
					</div>
				</div>
				<!-- No add/edit actions -->
			</div>
		</div>
	</div>

	<!-- Toast -->
	{#if toast}
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
			<div class={toastOk ? 'rounded-md p-3 bg-green-50 border border-green-200' : 'rounded-md p-3 bg-red-50 border border-red-200'}>
				<p class={toastOk ? 'text-sm text-green-800' : 'text-sm text-red-800'}>{toast}</p>
			</div>
		</div>
	{/if}

	<!-- Main -->
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
		<!-- Search -->
		<div class="mb-6">
		  	<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
				<div class="flex items-center space-x-4">
					<div class="flex-1 max-w-md">
						<div class="relative">
							<Search class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
							<input
								type="text"
								placeholder="Search vehicles (id, type, color, seats, status)…"
								bind:value={searchTerm}
								class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
						</div>
					</div>
					<div class="text-sm text-gray-500">
						{filteredVehicles.length} vehicle{filteredVehicles.length !== 1 ? 's' : ''} found
					</div>
				</div>
		  	</div>
		</div>

		<!-- Content -->
		<div class="bg-white rounded-lg shadow-sm border border-gray-200">
			{#if isLoading}
				<div class="p-8 text-center">
					<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
					<p class="mt-2 text-gray-500">Loading vehicles...</p>
				</div>
			{:else if loadError}
				<div class="p-8">
					<p class="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">{loadError}</p>
				</div>
			{:else if filteredVehicles.length === 0}
				<div class="p-8 text-center">
					<Car class="w-16 h-16 text-gray-400 mx-auto mb-4" />
					<h3 class="text-lg font-medium text-gray-900 mb-2">
						{searchTerm ? 'No vehicles found' : 'No vehicles yet'}
					</h3>
					<p class="text-gray-500 mb-4">
						{searchTerm ? 'Try adjusting your search terms.' : 'No vehicles available for your organization.'}
					</p>
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-gray-200">
						<thead class="bg-gray-50">
							<tr>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Color</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seats</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
								{#if canManage}
									<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
								{/if}
							</tr>
						</thead>
						<tbody class="bg-white divide-y divide-gray-200">
							{#each filteredVehicles as v (v.vehicle_id)}
								<tr class="hover:bg-gray-50">
									<td class="px-6 py-4 whitespace-nowrap">
										<div class="text-sm font-medium text-gray-900">#{v.vehicle_id}</div>
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<div class="text-sm text-gray-900">{v.type_of_vehicle_enum ?? '—'}</div>
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<div class="text-sm text-gray-900">{v.vehicle_color ?? '—'}</div>
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<div class="text-sm text-gray-900">{v.nondriver_seats ?? '—'}</div>
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<span class={v.active ? 'text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-800' : 'text-xs font-medium px-2 py-1 rounded bg-gray-100 text-gray-800'}>
											{v.active ? 'Active' : 'Inactive'}
										</span>
									</td>
									{#if canManage}
										<td class="px-6 py-4 whitespace-nowrap">
											<Button variant="destructive" size="sm" class="flex items-center gap-1" onclick={() => openDeleteModal(v)}>
												<Trash2 class="w-4 h-4" />
												<span>Delete</span>
											</Button>
										</td>
									{/if}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	</div>

	<!-- Delete Modal -->
	{#if canManage}
		<Dialog.Root bind:open={showDeleteModal}>
			<Dialog.Content class="sm:max-w-md bg-white">
				<Dialog.Header>
					<Dialog.Title>Delete Vehicle</Dialog.Title>
					<Dialog.Description>This action cannot be undone.</Dialog.Description>
				</Dialog.Header>

				<div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
					Delete vehicle <span class="font-medium">#{toDelete?.vehicle_id}</span> ({toDelete?.type_of_vehicle_enum ?? '—'})?
				</div>

				<Dialog.Footer class="mt-6">
					<Button variant="outline" onclick={() => (showDeleteModal = false)} disabled={isDeleting}>Cancel</Button>
					<Button class="bg-red-600 text-white" onclick={confirmDelete} disabled={isDeleting}>
						{isDeleting ? 'Deleting…' : 'Delete'}
					</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog.Root>
	{/if}
</div>