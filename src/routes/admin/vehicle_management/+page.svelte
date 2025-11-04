<script lang="ts">
	import { Car, Search, Trash2, Pencil, Plus } from '@lucide/svelte';
	import { invalidateAll } from '$app/navigation';
	import { supabase } from '$lib/supabase';

	// shadcn/ui
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';

	let { data }: { data?: PageData } = $props();

	// Use server-loaded data instead of client queries
	let vehicles = $state<VehicleRow[]>(data?.vehicles || []);
	let driverOptions = $state<StaffLite[]>(data?.driverOptions || []);
	let viewerUid = $state(data?.session?.user?.id || null);
	let viewerOrgId = $state(data?.profile?.org_id || null);

	let isLoading = $state(false);
	let loadError = $state(data?.error || '');
	let driversLoading = $state(false);
	let driversError = $state('');

	// ---- Page data from load() (roles, etc.) ----
	interface PageData {
		session?: { user: any } | null;
		profile?: any | null;
		roles?: string[] | null;
	}

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
	const VEHICLE_TYPES: VehicleType[] = ['SUV', 'Sedan', 'Van', 'Motorcycle', 'Truck', 'Coupe'];

	interface StaffLite {
		user_id: string;
		first_name: string | null;
		last_name: string | null;
	}

	interface VehicleRow {
		vehicle_id: number;
		user_id: string | null;
		type_of_vehicle_enum: VehicleType | null;
		vehicle_color: string | null;
		nondriver_seats: number | null; // int2
		active: boolean | null;
		org_id: number | null; // used only for filtering
		staff_profile?: { first_name: string | null; last_name: string | null } | null;
	}

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

	// ------- ADD / EDIT MODALS -------
	let showAddModal = $state(false);
	let showEditModal = $state(false);
	let isSaving = $state(false);

	type SeatsField = number | '';

	let addForm = $state<{
		user_id: string | '';
		type_of_vehicle_enum: VehicleType | '';
		vehicle_color: string;
		nondriver_seats: SeatsField;
		active: boolean;
	}>({
		user_id: '',
		type_of_vehicle_enum: '',
		vehicle_color: '',
		nondriver_seats: '',
		active: false
	});
	let addErrors = $state<{ user?: string; type?: string; color?: string; seats?: string }>({});

	let editForm = $state<{
		vehicle_id: number;
		type_of_vehicle_enum: VehicleType | '';
		vehicle_color: string;
		nondriver_seats: SeatsField;
		active: boolean;
	}>({
		vehicle_id: 0,
		type_of_vehicle_enum: '',
		vehicle_color: '',
		nondriver_seats: '',
		active: false
	});
	let editErrors = $state<{ type?: string; color?: string; seats?: string }>({});

	// we keep the vehicle’s current owner for “one-active-per-user” logic
	let editOwnerUserId = $state<string | null>(null);

	// DELETE modal
	let showDeleteModal = $state(false);
	let isDeleting = $state(false);
	let toDelete = $state<VehicleRow | null>(null);

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

	async function loadVehicles() {
		await invalidateAll();
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
						const fullName = `${v.staff_profile?.first_name ?? ''} ${v.staff_profile?.last_name ?? ''}`.trim().toLowerCase();
						return (
							String(v.vehicle_id ?? '').toLowerCase().includes(q) ||
							String(v.type_of_vehicle_enum ?? '').toLowerCase().includes(q) ||
							String(v.vehicle_color ?? '').toLowerCase().includes(q) ||
							String(v.nondriver_seats ?? '').toLowerCase().includes(q) ||
							String(v.active ? 'active' : 'inactive').includes(q) ||
							fullName.includes(q)
						);
				  })
	);

	// ------- Helpers for seats coercion ------
	function seatsValueToInt(v: unknown): number | null {
		if (v === null || v === undefined) return null;
		if (v === '') return null;
		if (typeof v === 'number') {
			if (!Number.isFinite(v)) return null;
			return Math.trunc(v);
		}
		const s = String(v).trim();
		if (s === '') return null;
		const n = Number(s);
		return Number.isFinite(n) ? Math.trunc(n) : null;
	}

	// ------- OPEN / CLOSE modals -------
	function openAdd() {
		if (!canManage) return;
		addForm = { user_id: '', type_of_vehicle_enum: '', vehicle_color: '', nondriver_seats: '', active: false };
		addErrors = {};
		showAddModal = true;
	}

	function openEdit(row: VehicleRow) {
		if (!canManage) return;
		editOwnerUserId = row.user_id ?? null; // keep owner for one-active-per-user logic
		editForm = {
			vehicle_id: row.vehicle_id,
			type_of_vehicle_enum: (row.type_of_vehicle_enum ?? '') as VehicleType | '',
			vehicle_color: row.vehicle_color ?? '',
			nondriver_seats: row.nondriver_seats ?? '',
			active: !!row.active
		};
		editErrors = {};
		showEditModal = true;
	}

	function closeAdd() { showAddModal = false; }
	function closeEdit() { showEditModal = false; }

	// ------- CREATE -------
	function onAddSubmit(e: Event) {
		e.preventDefault();
		void createVehicle();
	}

	async function createVehicle() {
		if (!canManage || !viewerOrgId) return;

		addErrors = {};
		let hasErr = false;

		if (!addForm.user_id) { addErrors.user = 'Required'; hasErr = true; }
		if (!addForm.type_of_vehicle_enum) { addErrors.type = 'Required'; hasErr = true; }
		if (!addForm.vehicle_color || addForm.vehicle_color.trim() === '') { addErrors.color = 'Required'; hasErr = true; }

		const seats = seatsValueToInt(addForm.nondriver_seats);
		if (seats === null) { addErrors.seats = 'Required'; hasErr = true; }
		else if (seats < 0) { addErrors.seats = 'Must be a non-negative integer'; hasErr = true; }

		if (hasErr) return;

		isSaving = true;
		try {
			// If creating as Active, first deactivate all other vehicles for this user in this org
			if (addForm.active) {
				const { error: offErr } = await supabase
					.from('vehicles')
					.update({ active: false })
					.eq('org_id', viewerOrgId)
					.eq('user_id', addForm.user_id as string);
				if (offErr) throw offErr;
			}

			const payload = {
				org_id: viewerOrgId,
				user_id: addForm.user_id as string,
				type_of_vehicle_enum: addForm.type_of_vehicle_enum as VehicleType,
				vehicle_color: addForm.vehicle_color.trim(),
				nondriver_seats: seats,
				active: !!addForm.active
			};

			const { error } = await supabase.from('vehicles').insert(payload);
			if (error) throw error;

			setToast('Vehicle created.', true);
			showAddModal = false;
			await loadVehicles();
		} catch (err: any) {
			console.error('Create error:', err?.message ?? err);
			setToast(err?.message ?? 'Failed to add vehicle.', false);
		} finally {
			isSaving = false;
		}
	}

	// ------- UPDATE (owner not changed here) -------
	function onEditSubmit(e: Event) {
		e.preventDefault();
		void saveEdits();
	}

	async function saveEdits() {
		if (!canManage || !viewerOrgId || !editForm.vehicle_id) return;

		editErrors = {};
		let hasErr = false;

		if (!editForm.type_of_vehicle_enum) { editErrors.type = 'Required'; hasErr = true; }
		if (!editForm.vehicle_color || editForm.vehicle_color.trim() === '') { editErrors.color = 'Required'; hasErr = true; }

		const seats = seatsValueToInt(editForm.nondriver_seats);
		if (seats === null) { editErrors.seats = 'Required'; hasErr = true; }
		else if (seats < 0) { editErrors.seats = 'Must be a non-negative integer'; hasErr = true; }

		if (hasErr) return;

		isSaving = true;
		try {
			// If setting this vehicle to Active, first deactivate other vehicles for same user in this org
			if (editForm.active && editOwnerUserId) {
				const { error: offErr } = await supabase
					.from('vehicles')
					.update({ active: false })
					.eq('org_id', viewerOrgId)
					.eq('user_id', editOwnerUserId)
					.neq('vehicle_id', editForm.vehicle_id);
				if (offErr) throw offErr;
			}

			const payload = {
				type_of_vehicle_enum: editForm.type_of_vehicle_enum as VehicleType,
				vehicle_color: editForm.vehicle_color.trim(),
				nondriver_seats: seats,
				active: !!editForm.active
			};

			const { error } = await supabase
				.from('vehicles')
				.update(payload)
				.eq('vehicle_id', editForm.vehicle_id)
				.eq('org_id', viewerOrgId);

			if (error) throw error;

			setToast('Vehicle updated.', true);
			showEditModal = false;
			await loadVehicles();
		} catch (err: any) {
			console.error('Update error:', err?.message ?? err);
			setToast(err?.message ?? 'Failed to update vehicle.', false);
		} finally {
			isSaving = false;
		}
	}
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

				{#if canManage}
					<Button class="flex items-center gap-2" onclick={openAdd}>
						<Plus class="w-4 h-4" />
						<span>Add Vehicle</span>
					</Button>
				{/if}
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
								placeholder="Search vehicles (id, driver, type, color, seats, status)…"
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
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
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
										<div class="text-sm text-gray-900">
											{#if v.staff_profile}
												{`${v.staff_profile.first_name ?? ''} ${v.staff_profile.last_name ?? ''}`.trim() || '—'}
											{:else}
												—
											{/if}
										</div>
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
											<div class="flex items-center gap-2">
												<Button variant="outline" size="sm" class="flex items-center gap-1" onclick={() => openEdit(v)}>
													<Pencil class="w-4 h-4" />
													<span>Edit</span>
												</Button>
												<Button variant="destructive" size="sm" class="flex items-center gap-1" onclick={() => openDeleteModal(v)}>
													<Trash2 class="w-4 h-4" />
													<span>Delete</span>
												</Button>
											</div>
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

	<!-- Add Modal -->
	{#if canManage}
		<Dialog.Root bind:open={showAddModal}>
			<Dialog.Content class="sm:max-w-md bg-white">
				<Dialog.Header>
					<Dialog.Title>Add Vehicle</Dialog.Title>
					<Dialog.Description>Create a new vehicle in your organization.</Dialog.Description>
				</Dialog.Header>

				<form class="space-y-4" onsubmit={onAddSubmit}>
					<div>
						<label class="block text-sm font-medium text-gray-700">Driver <span class="text-red-600">*</span></label>
						<select
							class={"mt-1 block w-full border rounded-md px-3 py-2 " + (addErrors.user ? 'border-red-300 bg-red-50' : 'border-gray-300')}
							bind:value={addForm.user_id}
							disabled={driversLoading}>
							<option value="">{driversLoading ? 'Loading…' : '— Select Driver —'}</option>
							{#if driversError}
								<option value="" disabled>{driversError}</option>
							{/if}
							{#each driverOptions as d (d.user_id)}
								<option value={d.user_id}>{`${d.first_name ?? ''} ${d.last_name ?? ''}`.trim() || d.user_id}</option>
							{/each}
						</select>
						{#if addErrors.user}<p class="text-xs text-red-600 mt-1">{addErrors.user}</p>{/if}
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700">Vehicle Type <span class="text-red-600">*</span></label>
						<select
							class={"mt-1 block w-full border rounded-md px-3 py-2 " + (addErrors.type ? 'border-red-300 bg-red-50' : 'border-gray-300')}
							bind:value={addForm.type_of_vehicle_enum}>
							<option value="">—</option>
							{#each VEHICLE_TYPES as t}<option value={t}>{t}</option>{/each}
						</select>
						{#if addErrors.type}<p class="text-xs text-red-600 mt-1">{addErrors.type}</p>{/if}
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700">Color <span class="text-red-600">*</span></label>
						<input
							type="text"
							class={"mt-1 block w-full border rounded-md px-3 py-2 " + (addErrors.color ? 'border-red-300 bg-red-50' : 'border-gray-300')}
							bind:value={addForm.vehicle_color} />
						{#if addErrors.color}<p class="text-xs text-red-600 mt-1">{addErrors.color}</p>{/if}
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700">Non-driver Seats <span class="text-red-600">*</span></label>
						<input
							type="number"
							min="0"
							step="1"
							class={"mt-1 block w-full border rounded-md px-3 py-2 " + (addErrors.seats ? 'border-red-300 bg-red-50' : 'border-gray-300')}
							bind:value={addForm.nondriver_seats} />
						{#if addErrors.seats}<p class="text-xs text-red-600 mt-1">{addErrors.seats}</p>{/if}
					</div>

					<div class="flex items-center gap-2">
						<input id="add-active" type="checkbox" bind:checked={addForm.active} class="h-4 w-4 border-gray-300 rounded" />
						<label for="add-active" class="text-sm text-gray-700">Active</label>
					</div>

					<Dialog.Footer class="mt-6">
						<Button variant="outline" onclick={closeAdd} type="button" disabled={isSaving}>Cancel</Button>
						<Button type="submit" disabled={isSaving}>{isSaving ? 'Saving…' : 'Add Vehicle'}</Button>
					</Dialog.Footer>
				</form>
			</Dialog.Content>
		</Dialog.Root>
	{/if}

	<!-- Edit Modal -->
	{#if canManage}
		<Dialog.Root bind:open={showEditModal}>
			<Dialog.Content class="sm:max-w-md bg-white">
				<Dialog.Header>
					<Dialog.Title>Edit Vehicle #{editForm.vehicle_id}</Dialog.Title>
					<Dialog.Description>Update vehicle details.</Dialog.Description>
				</Dialog.Header>

				<form class="space-y-4" onsubmit={onEditSubmit}>
					<div>
						<label class="block text-sm font-medium text-gray-700">Vehicle Type <span class="text-red-600">*</span></label>
						<select
							class={"mt-1 block w-full border rounded-md px-3 py-2 " + (editErrors.type ? 'border-red-300 bg-red-50' : 'border-gray-300')}
							bind:value={editForm.type_of_vehicle_enum}>
							<option value="">—</option>
							{#each VEHICLE_TYPES as t}<option value={t}>{t}</option>{/each}
						</select>
						{#if editErrors.type}<p class="text-xs text-red-600 mt-1">{editErrors.type}</p>{/if}
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700">Color <span class="text-red-600">*</span></label>
						<input
							type="text"
							class={"mt-1 block w-full border rounded-md px-3 py-2 " + (editErrors.color ? 'border-red-300 bg-red-50' : 'border-gray-300')}
							bind:value={editForm.vehicle_color} />
						{#if editErrors.color}<p class="text-xs text-red-600 mt-1">{editErrors.color}</p>{/if}
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700">Non-driver Seats <span class="text-red-600">*</span></label>
						<input
							type="number"
							min="0"
							step="1"
							class={"mt-1 block w-full border rounded-md px-3 py-2 " + (editErrors.seats ? 'border-red-300 bg-red-50' : 'border-gray-300')}
							bind:value={editForm.nondriver_seats} />
						{#if editErrors.seats}<p class="text-xs text-red-600 mt-1">{editErrors.seats}</p>{/if}
					</div>

					<div class="flex items-center gap-2">
						<input id="edit-active" type="checkbox" bind:checked={editForm.active} class="h-4 w-4 border-gray-300 rounded" />
						<label for="edit-active" class="text-sm text-gray-700">Active</label>
					</div>

					<Dialog.Footer class="mt-6">
						<Button variant="outline" onclick={closeEdit} type="button" disabled={isSaving}>Cancel</Button>
						<Button type="submit" disabled={isSaving}>{isSaving ? 'Saving…' : 'Save Changes'}</Button>
					</Dialog.Footer>
				</form>
			</Dialog.Content>
		</Dialog.Root>
	{/if}

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