<script lang="ts">
	import { Building2, Search, MapPin, Plus, Pencil, Trash2 } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';

	// shadcn/ui
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Input } from '$lib/components/ui/input/index.js';

	// ---- Page data from load() (roles, etc.) ----
	interface PageData {
		session?: { user: any } | null;
		profile?: any | null;
		roles?: string[] | null;
	}
	// Runes: use $props()
	let { data }: { data?: PageData } = $props();

	// ---- Role handling (runes) ----
	let userRoles = $state<string[]>([]);
	function hasRole(required: string[]): boolean {
		return required.some((r) => userRoles.includes(r));
	}
	// keep roles in sync with incoming data
	$effect(() => {
		userRoles = Array.isArray(data?.roles) ? (data!.roles as string[]) : [];
	});
	let canManage = $derived(hasRole(['Admin', 'Super Admin']));

	// ---- Table shape (no created_by, no staff_profiles) ----
	interface Destination {
		destination_id: number;
		created_at: string | null;
		address: string | null;
		address2: string | null;
		city: string | null;
		state: string | null;
		zipcode: string | null;
		location_name: string | null;
	}

	let destinations = $state<Destination[]>([]);
	let isLoading = $state(true);
	let searchTerm = $state('');

	// toast
	let toast = $state('');
	let toastOk = $state(true);
	function setToast(message: string, ok = true) {
		toast = message;
		tostOk = ok; // internal write then mirror to toastOk
		toastOk = ok;
		setTimeout(() => (toast = ''), 4000);
	}
	// tiny helper to avoid TS gripe on first assignment
	let tostOk = $state(true);

	// CREATE / EDIT modal state (only rendered if canManage)
	let showUpsertModal = $state(false);
	let isSaving = $state(false);
	let upsertMode = $state<'create' | 'edit'>('create');
	let form = $state({
		destination_id: null as number | null, // never sent on create
		location_name: '' as string,
		address: '' as string,
		address2: '' as string,
		city: '' as string,
		state: '' as string,
		zipcode: '' as string
	});

	// DELETE modal state (only rendered if canManage)
	let showDeleteModal = $state(false);
	let isDeleting = $state(false);
	let toDelete = $state<Destination | null>(null);

	onMount(async () => {
		await loadDestinations();
	});

	// Friendly datetime
	function formatDate(ts: string | null): string {
		if (!ts) return '—';
		const d = new Date(ts);
		if (isNaN(d.getTime())) return '—';
		return new Intl.DateTimeFormat(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		}).format(d);
	}

	// Load (NO joins)
	async function loadDestinations() {
		try {
			isLoading = true;

			const { data: rows, error } = await supabase
				.from('destinations')
				.select(`
					destination_id,
					created_at,
					address,
					address2,
					city,
					state,
					zipcode,
					location_name
				`)
				.order('destination_id', { ascending: true });

			if (error) {
				console.error('Load error:', error.message);
				setToast('Failed to load destinations.', false);
				destinations = [];
				return;
			}

			destinations = (rows ?? []) as Destination[];
		} catch (e: any) {
			console.error('Load error:', e?.message ?? e);
			setToast('Error loading destinations.', false);
			destinations = [];
		} finally {
			isLoading = false;
		}
	}

	// ------- Add / Edit (guarded) -------
	function resetForm() {
		form = {
			destination_id: null,
			location_name: '',
			address: '',
			address2: '',
			city: '',
			state: '',
			zipcode: ''
		};
	}

	function openCreateModal() {
		if (!canManage) return;
		upsertMode = 'create';
		resetForm();
		showUpsertModal = true;
	}

	function openEditModal(row: Destination) {
		if (!canManage) return;
		upsertMode = 'edit';
		form = {
			destination_id: row.destination_id,
			location_name: row.location_name ?? '',
			address: row.address ?? '',
			address2: row.address2 ?? '',
			city: row.city ?? '',
			state: row.state ?? '',
			zipcode: row.zipcode ?? ''
		};
		showUpsertModal = true;
	}

	async function saveDestination() {
		if (!canManage) {
			setToast('You do not have permission to modify destinations.', false);
			return;
		}

		if (!form.location_name.trim()) return setToast('Location name is required.', false);
		if (!form.address.trim() || !form.city.trim() || !form.state.trim())
			return setToast('Address, City, and State are required.', false);

		isSaving = true;
		try {
			if (upsertMode === 'create') {
				const insertPayload = {
					location_name: form.location_name.trim(),
					address: form.address.trim(),
					address2: form.address2?.trim() || null,
					city: form.city.trim(),
					state: form.state.trim(),
					zipcode: form.zipcode?.trim() || null
				};

				const { error } = await supabase.from('destinations').insert(insertPayload);
				if (error) throw error;

				setToast('Destination created.', true);
			} else {
				if (!form.destination_id) return setToast('Missing destination_id for update.', false);

				const updatePayload = {
					location_name: form.location_name.trim(),
					address: form.address.trim(),
					address2: form.address2?.trim() || null,
					city: form.city.trim(),
					state: form.state.trim(),
					zipcode: form.zipcode?.trim() || null
				};

				const { error } = await supabase
					.from('destinations')
					.update(updatePayload)
					.eq('destination_id', form.destination_id);

				if (error) throw error;

				setToast('Destination updated.', true);
			}

			showUpsertModal = false;
			await loadDestinations();
		} catch (err: any) {
			const msg = err?.message ?? String(err);
			console.error('Save error:', msg);
			if (msg.includes('duplicate key') || msg.includes('23505')) {
				setToast('Primary key collision. If you recently imported/deleted data, RESTART identity to MAX(id)+1.', false);
			} else {
				setToast(msg || 'Failed to save destination.', false);
			}
		} finally {
			isSaving = false;
		}
	}

	// ------- Delete (guarded) -------
	function openDeleteModal(row: Destination) {
		if (!canManage) return;
		toDelete = row;
		showDeleteModal = true;
	}

	async function confirmDelete() {
		if (!canManage) {
			setToast('You do not have permission to delete destinations.', false);
			return;
		}
		if (!toDelete) return;

		isDeleting = true;
		try {
			const { error } = await supabase
				.from('destinations')
				.delete()
				.eq('destination_id', toDelete.destination_id);

			if (error) throw error;

			setToast('Destination deleted.', true);
			showDeleteModal = false;
			toDelete = null;
			await loadDestinations();
		} catch (err: any) {
			console.error('Delete error:', err?.message ?? err);
			setToast(err?.message ?? 'Failed to delete destination.', false);
		} finally {
			isDeleting = false;
		}
	}

	// ------- FILTER (runes) -------
	let filteredDestinations = $derived(
		!destinations?.length
			? []
			: !searchTerm.trim()
				? destinations
				: destinations.filter((d) => {
						const q = searchTerm.toLowerCase();
						return (
							(String(d.location_name ?? '').toLowerCase().includes(q)) ||
							(String(d.city ?? '').toLowerCase().includes(q)) ||
							(String(d.state ?? '').toLowerCase().includes(q)) ||
							(String(d.zipcode ?? '').toLowerCase().includes(q)) ||
							(String(d.address ?? '').toLowerCase().includes(q)) ||
							(String(d.address2 ?? '').toLowerCase().includes(q))
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
						<Building2 class="w-6 h-6 text-blue-600" />
					</div>
					<div>
						<h1 class="text-2xl font-bold text-gray-900">Destinations</h1>
						<p class="text-sm text-gray-600">View {canManage ? 'and manage ' : ''}destinations</p>
					</div>
				</div>

				{#if canManage}
					<Button onclick={openCreateModal} class="flex items-center gap-2">
						<Plus class="w-4 h-4" />
						<span>Add Destination</span>
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
								placeholder="Search destinations..."
								bind:value={searchTerm}
								class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
						</div>
					</div>
					<div class="text-sm text-gray-500">
						{filteredDestinations.length} destination{filteredDestinations.length !== 1 ? 's' : ''} found
					</div>
				</div>
			</div>
		</div>

		<!-- Table -->
		<div class="bg-white rounded-lg shadow-sm border border-gray-200">
			{#if isLoading}
				<div class="p-8 text-center">
					<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
					<p class="mt-2 text-gray-500">Loading destinations...</p>
				</div>
			{:else if filteredDestinations.length === 0}
				<div class="p-8 text-center">
					<MapPin class="w-16 h-16 text-gray-400 mx-auto mb-4" />
					<h3 class="text-lg font-medium text-gray-900 mb-2">
						{searchTerm ? 'No destinations found' : 'No destinations yet'}
					</h3>
					<p class="text-gray-500 mb-4">
						{searchTerm ? 'Try adjusting your search terms.' : 'No destinations available.'}
					</p>
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-gray-200">
						<thead class="bg-gray-50">
							<tr>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Destination</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created At</th>
								{#if canManage}
									<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
								{/if}
							</tr>
						</thead>
						<tbody class="bg-white divide-y divide-gray-200">
							{#each filteredDestinations as dest (dest.destination_id)}
								<tr class="hover:bg-gray-50">
									<td class="px-6 py-4 whitespace-nowrap">
										<div>
											<div class="text-sm font-medium text-gray-900">{dest.location_name ?? '—'}</div>
											<div class="text-sm text-gray-500">ID: {dest.destination_id}</div>
										</div>
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<div class="text-sm text-gray-900">
											{dest.address ?? ''}{dest.address2 ? `, ${dest.address2}` : ''}
										</div>
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<div class="flex items-center space-x-2">
											<MapPin class="w-4 h-4 text-gray-400" />
											<div>
												<div class="text-sm text-gray-900">{dest.city ?? ''}, {dest.state ?? ''}</div>
												<div class="text-sm text-gray-500">{dest.zipcode ?? ''}</div>
											</div>
										</div>
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
										{formatDate(dest.created_at)}
									</td>
									{#if canManage}
										<td class="px-6 py-4 whitespace-nowrap">
											<div class="flex gap-2">
												<Button variant="outline" size="sm" class="flex items-center gap-1" onclick={() => openEditModal(dest)}>
													<Pencil class="w-4 h-4" />
													<span>Edit</span>
												</Button>
												<Button variant="destructive" size="sm" class="flex items-center gap-1" onclick={() => openDeleteModal(dest)}>
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

	<!-- Modals only mount if user can manage -->
	{#if canManage}
		<!-- Create / Edit Modal -->
		<Dialog.Root bind:open={showUpsertModal}>
			<Dialog.Content class="sm:max-w-lg bg-white">
				<Dialog.Header>
					<Dialog.Title>{upsertMode === 'create' ? 'Add Destination' : 'Edit Destination'}</Dialog.Title>
					<Dialog.Description>
						{upsertMode === 'create'
							? 'Create a new destination entry.'
							: `Update details for destination ID ${form.destination_id}.`}
					</Dialog.Description>
				</Dialog.Header>

				<div class="space-y-4">
					<div class="space-y-2">
						<Label for="location_name">Location Name</Label>
						<Input id="location_name" bind:value={form.location_name} placeholder="e.g., Jefferson Medical Plaza" />
					</div>

					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div class="space-y-2">
							<Label for="address">Address</Label>
							<Input id="address" bind:value={form.address} placeholder="123 Main St" />
						</div>
						<div class="space-y-2">
							<Label for="address2">Address 2</Label>
							<Input id="address2" bind:value={form.address2} placeholder="Suite / Floor (optional)" />
						</div>
					</div>

					<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
						<div class="space-y-2">
							<Label for="city">City</Label>
							<Input id="city" bind:value={form.city} placeholder="City" />
						</div>
						<div class="space-y-2">
							<Label for="state">State</Label>
							<Input id="state" bind:value={form.state} placeholder="NY" />
						</div>
						<div class="space-y-2">
							<Label for="zipcode">Zipcode</Label>
							<Input id="zipcode" bind:value={form.zipcode} placeholder="14604" />
						</div>
					</div>
				</div>

				<Dialog.Footer class="mt-6">
					<Button variant="outline" onclick={() => (showUpsertModal = false)} disabled={isSaving}>Cancel</Button>
					<Button onclick={saveDestination} disabled={isSaving}>
						{isSaving ? 'Saving…' : (upsertMode === 'create' ? 'Create' : 'Save Changes')}
					</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog.Root>

		<!-- Delete Modal -->
		<Dialog.Root bind:open={showDeleteModal}>
			<Dialog.Content class="sm:max-w-md bg-white">
				<Dialog.Header>
					<Dialog.Title>Delete Destination</Dialog.Title>
					<Dialog.Description>This action cannot be undone.</Dialog.Description>
				</Dialog.Header>

				<div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
					Delete <span class="font-medium">{toDelete?.location_name ?? '—'}</span> (ID: {toDelete?.destination_id})?
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