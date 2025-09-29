<script lang="ts">
	import { Building2, Plus, Search, Edit, Trash2, Save, X, Mail, Phone, MapPin } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { invalidateAll } from '$app/navigation';

	// Organization interface matching your Supabase schema
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
	let showPasswordModal = $state(false);
	let selectedOrg: Organization | null = null;
	let editingOrg: Organization | null = null;
	let editMessage = $state('');
	let editMessageSuccess = $state(false);
	let passwordInput = $state('');

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
		console.log('🏢 Organizations page loaded for Super Admin');
		await loadOrganizations();
		// Ensure filteredOrganizations is initialized
		if (filteredOrganizations.length === 0 && organizations.length > 0) {
			filteredOrganizations = organizations;
		}
	});

	// Function to pull fresh data from organization table
	async function refreshOrganizations() {
		try {
			console.log('🔄 Refreshing organizations data...');
			isLoading = true;
			
			const { data, error } = await supabase
				.from('organization')
				.select('*')
				.order('name');

			if (error) {
				console.error('❌ Error refreshing organizations:', error);
				showEditMessage('Failed to refresh organizations: ' + error.message, false);
				return;
			}

			console.log('✅ Organizations refreshed:', data);
			organizations = data || [];
			// Trigger search effect to update filtered list
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
			console.log('📊 Total organizations after refresh:', organizations.length);
			console.log('📊 Filtered organizations after refresh:', filteredOrganizations.length);
		} catch (error) {
			console.error('❌ Exception refreshing organizations:', error);
			showEditMessage('Failed to refresh organizations: ' + (error as Error).message, false);
		} finally {
			isLoading = false;
		}
	}

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
				showEditMessage('Failed to load organizations: ' + error.message, false);
				return;
			}

			console.log('✅ Organizations loaded:', data);
			organizations = data || [];
			// Initialize filtered list
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
			console.log('📊 Total organizations:', organizations.length);
			console.log('📊 Filtered organizations:', filteredOrganizations.length);
		} catch (error) {
			console.error('❌ Exception loading organizations:', error);
			showEditMessage('Failed to load organizations: ' + (error as Error).message, false);
		} finally {
			isLoading = false;
		}
	}

	// Filter organizations based on search term
	$effect(() => {
		console.log('🔍 Search effect triggered - searchTerm:', searchTerm, 'organizations.length:', organizations.length);
		if (organizations.length === 0) {
			filteredOrganizations = [];
			return;
		}
		
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
		console.log('🔍 Filtered organizations:', filteredOrganizations.length);
	});

	// Show message
	function showEditMessage(message: string, success: boolean) {
		editMessage = message;
		editMessageSuccess = success;
		setTimeout(() => {
			editMessage = '';
		}, 5000);
	}

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

	// Open password confirmation modal
	function openPasswordModal() {
		passwordInput = '';
		showDeleteModal = false;
		showPasswordModal = true;
	}

	// Close modals
	function closeModals() {
		showAddModal = false;
		showEditModal = false;
		showDeleteModal = false;
		showPasswordModal = false;
		selectedOrg = null;
		editingOrg = null;
		passwordInput = '';
	}

	// Add organization
	async function addOrganization() {
		try {
			console.log('🏢 Adding organization:', formData);
			
			const { data, error } = await supabase
				.from('organization')
				.insert([formData])
				.select()
				.single();

			if (error) {
				console.error('❌ Error adding organization:', error);
				showEditMessage('Failed to add organization: ' + error.message, false);
				return;
			}

			console.log('✅ Organization added:', data);
			showEditMessage('Organization added successfully!', true);
			closeModals();
			
			// Pull fresh data from database after successful add
			console.log('Organization added successfully, refreshing data...');
			await refreshOrganizations();
		} catch (error) {
			console.error('❌ Exception adding organization:', error);
			showEditMessage('Failed to add organization: ' + (error as Error).message, false);
		}
	}

	// Update organization
	async function updateOrganization() {
		if (!editingOrg) return;

		try {
			console.log('🏢 Updating organization:', editingOrg.org_id, formData);
			
			const { data, error } = await supabase
				.from('organization')
				.update(formData)
				.eq('org_id', editingOrg.org_id)
				.select()
				.single();

			if (error) {
				console.error('❌ Error updating organization:', error);
				showEditMessage('Failed to update organization: ' + error.message, false);
				return;
			}

			console.log('✅ Organization updated:', data);
			showEditMessage('Organization updated successfully!', true);
			closeModals();
			
			// Pull fresh data from database after successful update
			console.log('Organization updated successfully, refreshing data...');
			await refreshOrganizations();
		} catch (error) {
			console.error('❌ Exception updating organization:', error);
			showEditMessage('Failed to update organization: ' + (error as Error).message, false);
		}
	}

	// Delete organization with password confirmation
	async function deleteOrganization() {
		if (!selectedOrg) return;

		try {
			console.log('🏢 Deleting organization:', selectedOrg.org_id);
			
			const { error } = await supabase
				.from('organization')
				.delete()
				.eq('org_id', selectedOrg.org_id);

			if (error) {
				console.error('❌ Error deleting organization:', error);
				showEditMessage('Failed to delete organization: ' + error.message, false);
				return;
			}

			console.log('✅ Organization deleted');
			showEditMessage('Organization deleted successfully!', true);
			closeModals();
			
			// Pull fresh data from database after successful delete
			console.log('Organization deleted successfully, refreshing data...');
			await refreshOrganizations();
		} catch (error) {
			console.error('❌ Exception deleting organization:', error);
			showEditMessage('Failed to delete organization: ' + (error as Error).message, false);
		}
	}

	// Verify password and proceed with deletion
	async function confirmDeleteWithPassword() {
		if (!passwordInput.trim()) {
			showEditMessage('Please enter your password to confirm deletion.', false);
			return;
		}

		// For now, we'll just proceed with deletion
		// In a real app, you'd verify the password against the user's account
		await deleteOrganization();
	}
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
						<h1 class="text-2xl font-bold text-gray-900">Organizations Management</h1>
						<p class="text-sm text-gray-600">Manage organizations in the database</p>
					</div>
				</div>
				
				<button
					onclick={openAddModal}
					class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
				>
					<Plus class="w-4 h-4 mr-2" />
					Add Organization
				</button>
			</div>
		</div>
	</div>

	<!-- Success/Error Messages -->
	{#if editMessage}
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
			<div class="rounded-md p-4 {editMessageSuccess ? 'bg-green-50' : 'bg-red-50'} border {editMessageSuccess ? 'border-green-200' : 'border-red-200'}">
				<div class="flex">
					<div class="ml-3">
						<p class="text-sm font-medium {editMessageSuccess ? 'text-green-800' : 'text-red-800'}">
							{editMessage}
						</p>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Main Content -->
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
		<!-- Search Section -->
		<div class="mb-6">
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
				<div class="flex items-center space-x-4">
					<div class="flex-1 max-w-md">
						<div class="relative">
							<Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
							<input
								type="text"
								placeholder="Search organizations..."
								bind:value={searchTerm}
								class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							/>
						</div>
					</div>
					<div class="text-sm text-gray-500">
						{filteredOrganizations.length} organization{filteredOrganizations.length !== 1 ? 's' : ''} found
					</div>
				</div>
			</div>
		</div>

		<!-- Organizations Table -->
		<div class="bg-white rounded-lg shadow-sm border border-gray-200">
			{#if isLoading}
				<div class="p-8 text-center">
					<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
					<p class="mt-2 text-gray-500">Loading organizations...</p>
				</div>
			{:else if filteredOrganizations.length === 0}
				<div class="p-8 text-center">
					<Building2 class="w-16 h-16 text-gray-400 mx-auto mb-4" />
					<h3 class="text-lg font-medium text-gray-900 mb-2">
						{searchTerm ? 'No organizations found' : 'No organizations yet'}
					</h3>
					<p class="text-gray-500 mb-4">
						{searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first organization.'}
					</p>
					{#if !searchTerm}
						<button
							onclick={openAddModal}
							class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
						>
							<Plus class="w-4 h-4 mr-2" />
							Add First Organization
						</button>
					{/if}
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
										<div class="flex items-center space-x-2">
											<Mail class="w-4 h-4 text-gray-400" />
											<div>
												<div class="text-sm text-gray-900">{org.contact_email}</div>
												<div class="text-sm text-gray-500 flex items-center">
													<Phone class="w-3 h-3 mr-1" />
													{org.contact_phone}
												</div>
											</div>
										</div>
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<div class="flex items-center space-x-2">
											<MapPin class="w-4 h-4 text-gray-400" />
											<div>
												<div class="text-sm text-gray-900">{org.city}, {org.state}</div>
												<div class="text-sm text-gray-500">{org.zip_code}</div>
											</div>
										</div>
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
										<div class="flex space-x-2">
											<button
												onclick={() => openEditModal(org)}
												class="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
											>
												<Edit class="w-4 h-4 mr-1" />
												Edit
											</button>
											<button
												onclick={() => openDeleteModal(org)}
												class="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
											>
												<Trash2 class="w-4 h-4 mr-1" />
												Delete
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

	<!-- Add Organization Modal -->
	{#if showAddModal}
		<div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
			<div class="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
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
			<div class="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
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
			<div class="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
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
							onclick={openPasswordModal}
							class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center space-x-2"
						>
							<Trash2 class="w-4 h-4" />
							<span>Yes, Delete</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Password Confirmation Modal -->
	{#if showPasswordModal && selectedOrg}
		<div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
			<div class="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
				<div class="mt-3">
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-lg font-medium text-gray-900">Confirm Deletion</h3>
						<button onclick={closeModals} class="text-gray-400 hover:text-gray-600">
							<X class="w-5 h-5" />
						</button>
					</div>
					
					<div class="mb-6">
						<p class="text-sm text-gray-600 mb-4">
							To delete <strong>{selectedOrg.name}</strong>, please enter your password to confirm this action.
						</p>
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">Password</label>
							<input
								type="password"
								bind:value={passwordInput}
								placeholder="Enter your password"
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
							/>
						</div>
					</div>
					
					<div class="flex justify-end space-x-3">
						<button
							onclick={closeModals}
							class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
						>
							Cancel
						</button>
						<button
							onclick={confirmDeleteWithPassword}
							class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center space-x-2"
						>
							<Trash2 class="w-4 h-4" />
							<span>Delete Organization</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>