<script lang="ts">
	import { supabase } from '$lib/supabase';
	import { getContext, onMount } from 'svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import RoleGuard from '$lib/components/RoleGuard.svelte';
	import { Car, CheckCircle2, AlertTriangle, Pencil, Trash2, X, Plus } from '@lucide/svelte';

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

	const VEHICLE_TYPES = ['SUV', 'Sedan', 'Van', 'Motorcycle', 'Truck', 'Coupe'] as const;

	let uid: string | null = $state(null);
	let userOrgId: number | null = $state(null);

	let isLoading = $state(true);
	let loadError = $state('');
	let vehicles = $state<Vehicle[]>([]);
	let toast = $state('');
	let toastOk = $state(true);

	function setToast(msg: string, ok = true) {
		toast = msg;
		toastOk = ok;
		setTimeout(() => (toast = ''), 3500);
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

		const actives = list.filter((v) => !!v.active).map((v) => v.vehicle_id).sort((a, b) => a - b);
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

	async function loadUserOrg() {
		if (!uid) return;
		const { data, error } = await supabase
			.from('staff_profiles')
			.select('org_id')
			.eq('user_id', uid)
			.single();
		if (error) { userOrgId = null; return; }
		userOrgId = (data?.org_id ?? null) as number | null;
	}

	async function loadVehicles() {
		try {
			isLoading = true;
			loadError = '';

			await loadUser();
			await loadUserOrg();
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

	// ---------- Add / Edit / Delete ----------
	let showAddModal = $state(false);
	let showEditModal = $state(false);
	let showDeleteModal = $state(false);

	let isSaving = $state(false);
	let isDeleting = $state(false);

	let addForm = $state({
		type_of_vehicle_enum: '' as '' | Vehicle['type_of_vehicle_enum'],
		vehicle_color: '',
		nondriver_seats: ''
	});
	let addErrors = $state<{ type?: string; color?: string; seats?: string }>({});

	let editForm = $state({
		vehicle_id: 0,
		type_of_vehicle_enum: '' as '' | Vehicle['type_of_vehicle_enum'],
		vehicle_color: '',
		nondriver_seats: ''
	});
	let editErrors = $state<{ type?: string; color?: string; seats?: string }>({});

	let toDelete: Vehicle | null = $state(null);

	function openAdd() {
		addForm = { type_of_vehicle_enum: '', vehicle_color: '', nondriver_seats: '' };
		addErrors = {};
		showAddModal = true;
	}

	function openEdit(v: Vehicle) {
		editForm = {
			vehicle_id: v.vehicle_id,
			type_of_vehicle_enum: (v.type_of_vehicle_enum ?? '') as any,
			vehicle_color: v.vehicle_color ?? '',
			nondriver_seats: v.nondriver_seats == null ? '' : String(v.nondriver_seats)
		};
		editErrors = {};
		showEditModal = true;
	}

	function closeEdit() { showEditModal = false; }
	function openDelete(v: Vehicle) { toDelete = v; showDeleteModal = true; }
	function closeDelete() { showDeleteModal = false; toDelete = null; }

	function parseIntOrNull(x: string) {
		if (x == null || String(x).trim() === '') return null;
		const n = Number(x);
		return Number.isFinite(n) ? Math.trunc(n) : null;
	}

	function onAddSubmit(e: Event) { e.preventDefault(); void createVehicle(); }
	function onEditSubmit(e: Event) { e.preventDefault(); void saveEdits(); }

	// ---- CREATE ----
	async function createVehicle() {
		if (!uid) { setToast('No user session.', false); return; }

		addErrors = {};
		let hasErr = false;
		if (!addForm.type_of_vehicle_enum) { addErrors.type = 'Required'; hasErr = true; }
		if (!addForm.vehicle_color?.trim()) { addErrors.color = 'Required'; hasErr = true; }
		if (addForm.nondriver_seats.trim() === '') { addErrors.seats = 'Required'; hasErr = true; }

		const seats = parseIntOrNull(addForm.nondriver_seats);
		if (!hasErr && (seats == null || seats < 0)) { addErrors.seats = 'Must be a non-negative integer'; hasErr = true; }
		if (hasErr) return;

		isSaving = true;
		try {
			const payload = {
				user_id: uid,
				org_id: userOrgId,
				type_of_vehicle_enum: addForm.type_of_vehicle_enum,
				vehicle_color: addForm.vehicle_color.trim(),
				nondriver_seats: seats,
				active: false
			};

			const { error } = await supabase.from('vehicles').insert(payload);
			if (error) throw error;

			setToast('Vehicle added.', true);
			showAddModal = false;
			await normalizeActives();
			await loadVehicles();
		} catch (err: any) {
			setToast(err?.message ?? 'Failed to add vehicle.', false);
		} finally {
			isSaving = false;
		}
	}

	// ---- UPDATE ----
	async function saveEdits() {
		if (!editForm.vehicle_id) return;

		editErrors = {};
		let hasErr = false;
		if (!editForm.type_of_vehicle_enum) { editErrors.type = 'Required'; hasErr = true; }
		if (!editForm.vehicle_color?.trim()) { editErrors.color = 'Required'; hasErr = true; }
		if (editForm.nondriver_seats.trim() === '') { editErrors.seats = 'Required'; hasErr = true; }

		const seats = parseIntOrNull(editForm.nondriver_seats);
		if (!hasErr && (seats == null || seats < 0)) { editErrors.seats = 'Must be a non-negative integer'; hasErr = true; }
		if (hasErr) return;

		isSaving = true;
		try {
			const payload = {
				type_of_vehicle_enum: editForm.type_of_vehicle_enum,
				vehicle_color: editForm.vehicle_color.trim(),
				nondriver_seats: seats
			};

			const { error } = await supabase.from('vehicles').update(payload).eq('vehicle_id', editForm.vehicle_id);
			if (error) throw error;

			setToast('Vehicle updated.', true);
			showEditModal = false;
			await loadVehicles();
		} catch (err: any) {
			setToast(err?.message ?? 'Failed to update vehicle.', false);
		} finally {
			isSaving = false;
		}
	}

	// ---- DELETE ----
	async function confirmDelete() {
		if (!toDelete) return;
		isDeleting = true;
		try {
			const { error } = await supabase.from('vehicles').delete().eq('vehicle_id', toDelete.vehicle_id);
			if (error) throw error;

			setToast('Vehicle deleted.', true);
			showDeleteModal = false;
			toDelete = null;
			await normalizeActives();
			await loadVehicles();
		} catch (err: any) {
			setToast(err?.message ?? 'Failed to delete vehicle.', false);
		} finally {
			isDeleting = false;
		}
	}
</script>

<RoleGuard requiredRoles={['Driver', 'Admin', 'Super Admin']}>
	<div class="min-h-screen bg-gray-50">
		<Breadcrumbs />

		<!-- Header -->
		<div class="bg-white shadow-sm border-b border-gray-200">
			<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<div class="p-2 bg-blue-100 rounded-lg">
							<Car class="w-6 h-6 text-blue-600" />
						</div>
						<div>
							<h1 class="text-2xl font-bold text-gray-900">My Vehicles</h1>
							<p class="text-sm text-gray-600">View your vehicles and choose the active one.</p>
						</div>
					</div>
					<button
						class="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
						onclick={openAdd}>
						<Plus class="w-4 h-4" />
						<span>Add Vehicle</span>
					</button>
				</div>
			</div>
		</div>

		<!-- Toast -->
		{#if toast}
			<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
				<div class={toastOk ? 'rounded-md p-3 bg-green-50 border border-green-200' : 'rounded-md p-3 bg-red-50 border border-red-200'}>
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
												onclick={() => setActive(v.vehicle_id)}>
												<CheckCircle2 class="w-4 h-4" />
												<span>Set Active</span>
											</button>
										{/if}
										<button
											class="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
											onclick={() => openEdit(v)}>
											<Pencil class="w-4 h-4" />
											<span>Edit</span>
										</button>
										<button
											class="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-red-300 text-red-700 hover:bg-red-50"
											onclick={() => openDelete(v)}>
											<Trash2 class="w-4 h-4" />
											<span>Delete</span>
										</button>
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

	<!-- Add Modal -->
	{#if showAddModal}
		<div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
			<div class="relative top-12 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
				<div class="flex items-center justify-between mb-4">
					<h3 class="text-lg font-semibold text-gray-900">Add Vehicle</h3>
					<button class="text-gray-400 hover:text-gray-600" onclick={() => (showAddModal = false)}><X class="w-5 h-5" /></button>
				</div>

				<form onsubmit={onAddSubmit} class="space-y-4">
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

					<div class="flex justify-end gap-3 pt-2">
						<button type="button" onclick={() => (showAddModal = false)} class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
						<button type="submit" disabled={isSaving} class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60">
							{isSaving ? 'Saving…' : 'Add Vehicle'}
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<!-- Edit Modal -->
	{#if showEditModal}
		<div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
			<div class="relative top-12 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
				<div class="flex items-center justify-between mb-4">
					<h3 class="text-lg font-semibold text-gray-900">Edit Vehicle #{editForm.vehicle_id}</h3>
					<button class="text-gray-400 hover:text-gray-600" onclick={closeEdit}><X class="w-5 h-5" /></button>
				</div>

				<form onsubmit={onEditSubmit} class="space-y-4">
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

					<div class="flex justify-end gap-3 pt-2">
						<button type="button" onclick={closeEdit} class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
						<button type="submit" disabled={isSaving} class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60">
							{isSaving ? 'Saving…' : 'Save Changes'}
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<!-- Delete Modal -->
	{#if showDeleteModal}
		<div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
			<div class="relative top-12 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
				<div class="flex items-center justify-between mb-4">
					<h3 class="text-lg font-semibold text-gray-900">Delete Vehicle</h3>
					<button class="text-gray-400 hover:text-gray-600" onclick={closeDelete}><X class="w-5 h-5" /></button>
				</div>

				<div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 mb-4">
					Delete vehicle #{toDelete?.vehicle_id} ({toDelete?.type_of_vehicle_enum ?? '—'})? This action cannot be undone.
				</div>

				<div class="flex justify-end gap-3">
					<button type="button" onclick={closeDelete} class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
					<button
						type="button"
						disabled={isDeleting}
						onclick={confirmDelete}
						class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-60">
						{isDeleting ? 'Deleting…' : 'Delete'}
					</button>
				</div>
			</div>
		</div>
	{/if}
</RoleGuard>