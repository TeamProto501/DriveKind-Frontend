<script lang="ts">
	import { Building2, Search, MapPin } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';

	// Destination interface matching your CSV & Supabase schema
	interface Destination {
		destination_id: number;
		created_at: string | null;
		created_by: string | null;
		address: string | null;
		address2: string | null;
		city: string | null;
		state: string | null;
		zipcode: string | null;
		location_name: string | null;
	}

	// State
	let destinations: Destination[] = [];
	let filteredDestinations: Destination[] = [];
	let isLoading = true;
	let searchTerm = '';
	let editMessage = '';
	let editMessageSuccess = false;

	// Fallback (CSV) data — shown if Supabase request fails or returns nothing
	const fallbackDestinations: Destination[] = [
		{
			destination_id: 1,
			created_at: '2025-10-19 09:15:00+00',
			created_by: '23a834fd-674e-495f-be77-d862291b22a2',
			address: '5 Jefferson Rd',
			address2: 'Suite 200',
			city: 'Henrietta',
			state: 'NY',
			zipcode: '14467',
			location_name: 'Jefferson Medical Plaza'
		},
		{
			destination_id: 2,
			created_at: '2025-10-19 10:30:00+00',
			created_by: '607face6-dd12-4afe-9dac-fe1856a0c737',
			address: '300 Marketplace Dr',
			address2: '',
			city: 'Henrietta',
			state: 'NY',
			zipcode: '14467',
			location_name: 'Marketplace Shopping Center'
		},
		{
			destination_id: 3,
			created_at: '2025-10-19 11:45:00+00',
			created_by: null,
			address: '10 Calkins Rd',
			address2: '',
			city: 'Henrietta',
			state: 'NY',
			zipcode: '14467',
			location_name: 'Calkins Business Park'
		},
		{
			destination_id: 4,
			created_at: '2025-10-19 12:00:00+00',
			created_by: 'a05f5725-8f58-4d5e-923d-d381bd38fa9b',
			address: '50 East Ave',
			address2: '',
			city: 'Rochester',
			state: 'NY',
			zipcode: '14604',
			location_name: 'East Ave Community Center'
		},
		{
			destination_id: 5,
			created_at: '2025-10-19 13:20:00+00',
			created_by: 'e81b6de6-5aa3-4d5e-9857-ee9ef6aea62d',
			address: '150 Maple St',
			address2: 'Floor 3',
			city: 'Rochester',
			state: 'NY',
			zipcode: '14607',
			location_name: 'Maple Tech Hub'
		}
	];

	// Load destinations on mount
	onMount(async () => {
		console.log('📍 Destinations page loaded');
		await loadDestinations();
	});

	// Show transient message
	function showMessage(message: string, success = true) {
		editMessage = message;
		editMessageSuccess = success;
		setTimeout(() => {
			editMessage = '';
		}, 5000);
	}

	// Load destinations from Supabase (falls back to CSV)
	async function loadDestinations() {
		try {
			console.log('📡 Loading destinations from Supabase...');
			isLoading = true;

			const { data, error } = await supabase
				.from('destinations') // use the table name you have in Supabase
				.select('*')
				.order('location_name', { ascending: true });

			if (error) {
				console.warn('⚠️ Supabase error loading destinations:', error.message);
				showMessage('Failed to load destinations from Supabase — using fallback data.', false);
				destinations = fallbackDestinations;
			} else if (!data || data.length === 0) {
				console.log('ℹ️ Supabase returned no rows, using fallback data.');
				destinations = fallbackDestinations;
			} else {
				console.log('✅ Destinations loaded from Supabase:', data.length);
				// Cast/normalize to Destination (Supabase returns "any")
				destinations = (data as Destination[]).map(d => ({
					destination_id: d.destination_id,
					created_at: d.created_at ?? null,
					created_by: d.created_by ?? null,
					address: d.address ?? '',
					address2: d.address2 ?? '',
					city: d.city ?? '',
					state: d.state ?? '',
					zipcode: d.zipcode ?? '',
					location_name: d.location_name ?? ''
				}));
			}
		} catch (err) {
			console.error('❌ Exception loading destinations:', err);
			showMessage('Error loading destinations — using fallback data.', false);
			destinations = fallbackDestinations;
		} finally {
			isLoading = false;
		}
	}

	// Reactive filtering: updates filteredDestinations whenever destinations or searchTerm change
	$: {
		if (!destinations || destinations.length === 0) {
			filteredDestinations = [];
		} else if (!searchTerm.trim()) {
			filteredDestinations = destinations;
		} else {
			const q = searchTerm.toLowerCase();
			filteredDestinations = destinations.filter(dest =>
				(String(dest.location_name ?? '').toLowerCase().includes(q)) ||
				(String(dest.city ?? '').toLowerCase().includes(q)) ||
				(String(dest.state ?? '').toLowerCase().includes(q)) ||
				(String(dest.zipcode ?? '').toLowerCase().includes(q)) ||
				(String(dest.address ?? '').toLowerCase().includes(q)) ||
				(String(dest.address2 ?? '').toLowerCase().includes(q))
			);
		}
		console.log('🔍 Filter applied. Results:', filteredDestinations.length);
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
						<h1 class="text-2xl font-bold text-gray-900">Destinations</h1>
						<p class="text-sm text-gray-600">View destinations stored in the database</p>
					</div>
				</div>
				<!-- No add button — editing features intentionally omitted for now -->
			</div>
		</div>
	</div>

	<!-- Success/Error Messages -->
	{#if editMessage}
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
			<div class={editMessageSuccess ? 'rounded-md p-4 bg-green-50 border border-green-200' : 'rounded-md p-4 bg-red-50 border border-red-200'}>
				<div class="flex">
					<div class="ml-3">
						<p class={editMessageSuccess ? 'text-sm font-medium text-green-800' : 'text-sm font-medium text-red-800'}>
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
								placeholder="Search destinations..."
								bind:value={searchTerm}
								class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							/>
						</div>
					</div>
					<div class="text-sm text-gray-500">
						{filteredDestinations.length} destination{filteredDestinations.length !== 1 ? 's' : ''} found
					</div>
				</div>
			</div>
		</div>

		<!-- Destinations Table -->
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
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Meta</th>
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
										<div>
											<div class="text-sm text-gray-900">{dest.address ?? ''}{dest.address2 ? `, ${dest.address2}` : ''}</div>
											<div class="text-sm text-gray-500">{dest.address2 ? dest.address2 : ''}</div>
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
										<div>
											<div class="text-sm text-gray-900">Created: {dest.created_at ?? '—'}</div>
											<div class="text-sm text-gray-500">By: {dest.created_by ?? '—'}</div>
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