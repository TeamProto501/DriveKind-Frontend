<script lang="ts">
	import RoleGuard from '$lib/components/RoleGuard.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import { Building2, Plus, Search, Edit, Trash2, Eye, Save, X } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';

	// Organization interface
	interface Organization {
		org_id: number;
		name: string;
		contact_email: string;
		contact_phone: string;
		address: string;
		city: string;
		state: string;
		zip_code: string;
	}

	// State
	let organizations: Organization[] = [];
	let filteredOrganizations: Organization[] = [];
	let isLoading = $state(true);
	let searchTerm = $state('');
	let showAddModal = $state(false);
	let showEditModal = $state(false);
	let showDeleteModal = $state(false);
	let selectedOrg: Organization | null = null;
	let editingOrg: Organization | null = null;

	// Form data for add/edit
	let formData = $state({
		name: '',
		contact_email: '',
		contact_phone: '',
		address: '',
		city: '',
		state: '',
		zip_code: ''
	});

	// Load organizations on mount
	onMount(async () => {
		console.log('🏢 Organizations page loaded');
		await loadOrganizations();
	});

	// Load organizations from Supabase
	async function loadOrganizations() {
		try {
			console.log('🏢 Loading organizations from Supabase...');
			isLoading = true;
			const { data, error } = await supabase
				.from('organization')
				.select('*')
				.order('name');

			if (error) {
				console.error('❌ Error loading organizations:', error);
				alert('Failed to load organizations: ' + error.message);
				return;
			}

			console.log('✅ Organizations loaded:', data);
			organizations = data || [];
			filteredOrganizations = organizations;
			console.log('📊 Total organizations:', organizations.length);
		} catch (error) {
			console.error('❌ Exception loading organizations:', error);
			alert('Failed to load organizations: ' + error.message);
		} finally {
			isLoading = false;
		}
	}

	// Filter organizations based on search term
	$effect(() => {
		if (!searchTerm.trim()) {
			filteredOrganizations = organizations;
		} else {
			filteredOrganizations = organizations.filter(org =>
				org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
				org.contact_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
				org.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
				org.state.toLowerCase().includes(searchTerm.toLowerCase())
			);
		}
	});

	// Open add modal
	function openAddModal() {
		formData = {
			name: '',
			contact_email: '',
			contact_phone: '',
			address: '',
			city: '',
			state: '',
			zip_code: ''
		};
		showAddModal = true;
	}

	// Open edit modal
	function openEditModal(org: Organization) {
		editingOrg = org;
		formData = {
			name: org.name,
			contact_email: org.contact_email,
			contact_phone: org.contact_phone,
			address: org.address,
			city: org.city,
			state: org.state,
			zip_code: org.zip_code
		};
		showEditModal = true;
	}

	// Open delete modal
	function openDeleteModal(org: Organization) {
		selectedOrg = org;
		showDeleteModal = true;
	}

	// Close modals
	function closeModals() {
		showAddModal = false;
		showEditModal = false;
		showDeleteModal = false;
		selectedOrg = null;
		editingOrg = null;
	}

	// Add organization
	async function addOrganization() {
		try {
			const { data, error } = await supabase
				.from('organization')
				.insert([formData])
				.select()
				.single();

			if (error) {
				console.error('Error adding organization:', error);
				alert('Failed to add organization');
				return;
			}

			organizations = [...organizations, data];
			closeModals();
		} catch (error) {
			console.error('Error adding organization:', error);
			alert('Failed to add organization');
		}
	}

	// Update organization
	async function updateOrganization() {
		if (!editingOrg) return;

		try {
			const { data, error } = await supabase
				.from('organization')
				.update(formData)
				.eq('org_id', editingOrg.org_id)
				.select()
				.single();

			if (error) {
				console.error('Error updating organization:', error);
				alert('Failed to update organization');
				return;
			}

			organizations = organizations.map(org => 
				org.org_id === editingOrg.org_id ? data : org
			);
			closeModals();
		} catch (error) {
			console.error('Error updating organization:', error);
			alert('Failed to update organization');
		}
	}

	// Delete organization
	async function deleteOrganization() {
		if (!selectedOrg) return;

		try {
			const { error } = await supabase
				.from('organization')
				.delete()
				.eq('org_id', selectedOrg.org_id);

			if (error) {
				console.error('Error deleting organization:', error);
				alert('Failed to delete organization');
				return;
			}

			organizations = organizations.filter(org => org.org_id !== selectedOrg.org_id);
			closeModals();
		} catch (error) {
			console.error('Error deleting organization:', error);
			alert('Failed to delete organization');
		}
	}
</script>

<RoleGuard requiredRoles={['Super Admin']}>
	<div class="min-h-screen bg-gray-50">
		<Breadcrumbs />
		
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			<div class="mb-8">
				<h1 class="text-3xl font-bold text-gray-900">Organization Management</h1>
				<p class="text-gray-600 mt-2">Manage organizations, add new ones, and configure settings.</p>
			</div>
			
			<!-- Search and Add Section -->
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
				<div class="px-6 py-4 border-b border-gray-200">
					<div class="flex items-center justify-between">
						<div class="flex-1 max-w-md">
							<div class="relative">
								<Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
								<input
									type="text"
									placeholder="Search organizations..."
									bind:value={searchTerm}
									class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								/>
							</div>
						</div>
						<button
							onclick={openAddModal}
							class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2"
						>
							<Plus class="w-4 h-4" />
							<span>Add Organization</span>
						</button>
					</div>
				</div>
			</div>

			<!-- Organizations List -->
			<div class="bg-white rounded-lg shadow-sm border border-gray-200">
				{#if isLoading}
					<div class="p-8 text-center">
						<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
						<p class="mt-2 text-gray-500">Loading organizations...</p>
					</div>
				{:else if filteredOrganizations.length === 0}
					<div class="p-8 text-center">
						<Building2 class="w-16 h-16 text-gray-400 mx-auto mb-4" />
						<h3 class="text-lg font-medium text-gray-900 mb-2">No organizations found</h3>
						<p class="text-gray-500">
							{searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first organization.'}
						</p>
					</div>
				{:else}
					<div class="overflow-x-auto">
						<table class="min-w-full divide-y divide-gray-200">
							<thead class="bg-gray-50">
								<tr>
									<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organization</th>
									<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
									<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
									<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
								</tr>
							</thead>
							<tbody class="bg-white divide-y divide-gray-200">
								{#each filteredOrganizations as org}
									<tr class="hover:bg-gray-50">
										<td class="px-6 py-4 whitespace-nowrap">
											<div>
												<div class="text-sm font-medium text-gray-900">{org.name}</div>
												<div class="text-sm text-gray-500">ID: {org.org_id}</div>
											</div>
										</td>
										<td class="px-6 py-4 whitespace-nowrap">
											<div class="text-sm text-gray-900">{org.contact_email}</div>
											<div class="text-sm text-gray-500">{org.contact_phone}</div>
										</td>
										<td class="px-6 py-4 whitespace-nowrap">
											<div class="text-sm text-gray-900">{org.city}, {org.state}</div>
											<div class="text-sm text-gray-500">{org.zip_code}</div>
										</td>
										<td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
											<div class="flex space-x-2">
												<button
													onclick={() => openEditModal(org)}
													class="text-blue-600 hover:text-blue-900 p-1 rounded"
													title="Edit"
												>
													<Edit class="w-4 h-4" />
												</button>
												<button
													onclick={() => openDeleteModal(org)}
													class="text-red-600 hover:text-red-900 p-1 rounded"
													title="Delete"
												>
													<Trash2 class="w-4 h-4" />
												</button>
											</div>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Add Organization Modal -->
	{#if showAddModal}
		<div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
			<div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
				<div class="mt-3">
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-lg font-medium text-gray-900">Add Organization</h3>
						<button onclick={closeModals} class="text-gray-400 hover:text-gray-600">
							<X class="w-5 h-5" />
						</button>
					</div>
					
					<form onsubmit={(e) => { e.preventDefault(); addOrganization(); }} class="space-y-4">
						<div>
							<label class="block text-sm font-medium text-gray-700">Organization Name</label>
							<input
								type="text"
								bind:value={formData.name}
								required
								class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>
						
						<div>
							<label class="block text-sm font-medium text-gray-700">Contact Email</label>
							<input
								type="email"
								bind:value={formData.contact_email}
								required
								class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>
						
						<div>
							<label class="block text-sm font-medium text-gray-700">Contact Phone</label>
							<input
								type="tel"
								bind:value={formData.contact_phone}
								required
								class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>
						
						<div>
							<label class="block text-sm font-medium text-gray-700">Address</label>
							<input
								type="text"
								bind:value={formData.address}
								required
								class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>
						
						<div class="grid grid-cols-2 gap-4">
							<div>
								<label class="block text-sm font-medium text-gray-700">City</label>
								<input
									type="text"
									bind:value={formData.city}
									required
									class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700">State</label>
								<input
									type="text"
									bind:value={formData.state}
									required
									class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>
						</div>
						
						<div>
							<label class="block text-sm font-medium text-gray-700">Zip Code</label>
							<input
								type="text"
								bind:value={formData.zip_code}
								required
								class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>
						
						<div class="flex justify-end space-x-3 pt-4">
							<button
								type="button"
								onclick={closeModals}
								class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
							>
								Cancel
							</button>
							<button
								type="submit"
								class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
							>
								<Save class="w-4 h-4" />
								<span>Add Organization</span>
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	{/if}

	<!-- Edit Organization Modal -->
	{#if showEditModal}
		<div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
			<div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
				<div class="mt-3">
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-lg font-medium text-gray-900">Edit Organization</h3>
						<button onclick={closeModals} class="text-gray-400 hover:text-gray-600">
							<X class="w-5 h-5" />
						</button>
					</div>
					
					<form onsubmit={(e) => { e.preventDefault(); updateOrganization(); }} class="space-y-4">
						<div>
							<label class="block text-sm font-medium text-gray-700">Organization Name</label>
							<input
								type="text"
								bind:value={formData.name}
								required
								class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>
						
						<div>
							<label class="block text-sm font-medium text-gray-700">Contact Email</label>
							<input
								type="email"
								bind:value={formData.contact_email}
								required
								class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>
						
						<div>
							<label class="block text-sm font-medium text-gray-700">Contact Phone</label>
							<input
								type="tel"
								bind:value={formData.contact_phone}
								required
								class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>
						
						<div>
							<label class="block text-sm font-medium text-gray-700">Address</label>
							<input
								type="text"
								bind:value={formData.address}
								required
								class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>
						
						<div class="grid grid-cols-2 gap-4">
							<div>
								<label class="block text-sm font-medium text-gray-700">City</label>
								<input
									type="text"
									bind:value={formData.city}
									required
									class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700">State</label>
								<input
									type="text"
									bind:value={formData.state}
									required
									class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>
						</div>
						
						<div>
							<label class="block text-sm font-medium text-gray-700">Zip Code</label>
							<input
								type="text"
								bind:value={formData.zip_code}
								required
								class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>
						
						<div class="flex justify-end space-x-3 pt-4">
							<button
								type="button"
								onclick={closeModals}
								class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
							>
								Cancel
							</button>
							<button
								type="submit"
								class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
							>
								<Save class="w-4 h-4" />
								<span>Update Organization</span>
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	{/if}

	<!-- Delete Confirmation Modal -->
	{#if showDeleteModal && selectedOrg}
		<div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
			<div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
				<div class="mt-3">
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-lg font-medium text-gray-900">Delete Organization</h3>
						<button onclick={closeModals} class="text-gray-400 hover:text-gray-600">
							<X class="w-5 h-5" />
						</button>
					</div>
					
					<div class="mb-6">
						<p class="text-sm text-gray-600">
							Are you sure you want to delete <strong>{selectedOrg.name}</strong>? This action cannot be undone.
						</p>
					</div>
					
					<div class="flex justify-end space-x-3">
						<button
							onclick={closeModals}
							class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
						>
							Cancel
						</button>
						<button
							onclick={deleteOrganization}
							class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center space-x-2"
						>
							<Trash2 class="w-4 h-4" />
							<span>Delete</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
</RoleGuard>
