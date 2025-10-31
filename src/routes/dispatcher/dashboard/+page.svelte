<script lang="ts">
	import RoleGuard from '$lib/components/RoleGuard.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import { 
		Car, 
		Users, 
		Calendar, 
		MapPin, 
		Clock, 
		CheckCircle,
		AlertCircle,
		Plus,
		Search,
		Filter,
		ArrowRight,
		Phone,
		User,
		Edit,
		UserCheck
	} from '@lucide/svelte';
	import DriverMatchModal from '$lib/components/DriverMatchModal.svelte';
	import { invalidateAll } from '$app/navigation';
	
	let { data }: { data: PageData } = $props();
	
	// Filter to show only requested rides (already filtered by server)
	const requestedRides = $derived(data.rides || []);
	
	let isUpdating = $state(false);
	
	// Get status badge color
	function getStatusColor(status: string) {
		switch (status) {
			case 'Requested': return 'bg-gray-100 text-gray-800';
			case 'Scheduled': return 'bg-blue-100 text-blue-800';
			case 'Assigned': return 'bg-yellow-100 text-yellow-800';
			case 'In Progress': return 'bg-orange-100 text-orange-800';
			case 'Reported': return 'bg-purple-100 text-purple-800';
			case 'Completed': return 'bg-green-100 text-green-800';
			case 'Cancelled': return 'bg-red-100 text-red-800';
			default: return 'bg-gray-100 text-gray-800';
		}
	}
	
	function getClientName(ride: any) {
		if (ride.clients) {
			return `${ride.clients.first_name} ${ride.clients.last_name}`;
		}
		return 'Unknown Client';
	}
	
	function getDriverName(ride: any) {
		if (ride.drivers) {
			return `${ride.drivers.first_name} ${ride.drivers.last_name}`;
		}
		return 'Unassigned';
	}
	
	function formatDateTime(timestamp: string) {
		if (!timestamp) return 'N/A';
		return new Date(timestamp).toLocaleString();
	}
	
	function formatDate(timestamp: string) {
		if (!timestamp) return 'N/A';
		return new Date(timestamp).toLocaleDateString();
	}
	
	function formatTime(timestamp: string) {
		if (!timestamp) return 'N/A';
		return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}
	
	function getClientPhone(ride: any) {
		return ride.clients?.primary_phone || 'No phone';
	}
	
	let showDriverMatchModal = $state(false);
	let selectedRideForMatch = $state(null);
	
	function openDriverMatchModal(ride: any) {
		selectedRideForMatch = ride;
		showDriverMatchModal = true;
	}
	
	function openEditModal(ride: any) {
		// Navigate to rides page with the ride ID to edit
		goto(`/dispatcher/rides`);
	}
</script>

<RoleGuard requiredRoles={['Dispatcher']}>
	<div class="min-h-screen bg-gray-50">
		<!-- Breadcrumbs -->
		<Breadcrumbs />
		
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			<!-- Header Section -->
			<div class="mb-8">
				<div class="flex items-center justify-between">
					<div>
						<h1 class="text-3xl font-bold text-gray-900">Dispatcher Dashboard</h1>
						<p class="text-gray-600 mt-2">
							Manage ride requests, assign drivers, and monitor trip progress.
						</p>
					</div>
					
					<!-- Dispatcher Badge -->
					<div class="flex items-center space-x-2 px-4 py-2 bg-green-100 rounded-full">
						<Car class="w-5 h-5 text-green-600" />
						<span class="text-sm font-medium text-green-800">Dispatcher</span>
					</div>
				</div>
			</div>
			
			<!-- Quick Stats -->
			<div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
				<button 
					onclick={() => goto('/dispatcher/rides?tab=requested')}
					class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer text-left w-full"
				>
					<div class="flex items-center">
						<div class="p-2 bg-blue-100 rounded-lg">
							<AlertCircle class="w-6 h-6 text-blue-600" />
						</div>
						<div class="ml-4">
							<p class="text-sm font-medium text-gray-500">Pending Requests</p>
							<p class="text-2xl font-semibold text-gray-900">{data.rideCounts?.pending || 0}</p>
						</div>
					</div>
				</button>
				
				<button 
					onclick={() => goto('/dispatcher/rides?tab=active')}
					class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-green-300 transition-all duration-200 cursor-pointer text-left w-full"
				>
					<div class="flex items-center">
						<div class="p-2 bg-green-100 rounded-lg">
							<CheckCircle class="w-6 h-6 text-green-600" />
						</div>
						<div class="ml-4">
							<p class="text-sm font-medium text-gray-500">Assigned Rides</p>
							<p class="text-2xl font-semibold text-gray-900">{data.rideCounts?.assigned || 0}</p>
						</div>
					</div>
				</button>
				
				<button 
					onclick={() => goto('/dispatcher/rides?tab=active')}
					class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-orange-300 transition-all duration-200 cursor-pointer text-left w-full"
				>
					<div class="flex items-center">
						<div class="p-2 bg-orange-100 rounded-lg">
							<Clock class="w-6 h-6 text-orange-600" />
						</div>
						<div class="ml-4">
							<p class="text-sm font-medium text-gray-500">In Progress</p>
							<p class="text-2xl font-semibold text-gray-900">{data.rideCounts?.inProgress || 0}</p>
						</div>
					</div>
				</button>
				
				<button 
					onclick={() => goto('/dispatcher/drivers')}
					class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-purple-300 transition-all duration-200 cursor-pointer text-left w-full"
				>
					<div class="flex items-center">
						<div class="p-2 bg-purple-100 rounded-lg">
							<Users class="w-6 h-6 text-purple-600" />
						</div>
						<div class="ml-4">
							<p class="text-sm font-medium text-gray-500">Active Drivers</p>
							<p class="text-2xl font-semibold text-gray-900">{data.activeDrivers || 0}</p>
						</div>
					</div>
				</button>
			</div>
			
			<!-- Main Content -->
			<div class="bg-white rounded-lg border border-gray-200 shadow-sm">
				<!-- Header with Actions -->
				<div class="px-6 py-4 border-b border-gray-200">
					<div class="flex items-center justify-between">
						<button 
							onclick={() => goto('/dispatcher/rides')}
							class="flex items-center gap-2 text-lg font-medium text-gray-900 hover:text-blue-600 transition-colors duration-200 cursor-pointer group"
						>
							<span>Ride Requests</span>
							<ArrowRight class="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
						</button>
						
						<div class="flex items-center space-x-3">
							<!-- View All Rides Button -->
							<button 
								onclick={() => goto('/dispatcher/rides')}
								class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2"
							>
								<Car class="w-4 h-4" />
								<span>View All Rides</span>
							</button>
						</div>
					</div>
				</div>
				
				<!-- Ride Requests List (Same format as Ride Management Requested tab) -->
				{#if requestedRides.length > 0}
					<div class="divide-y divide-gray-200">
						{#each requestedRides as ride}
							<div class="p-6 hover:bg-gray-50 transition-colors">
								<div class="flex items-start justify-between">
									<div class="space-y-3 flex-1">
										<div class="flex items-center gap-3">
											<h3 class="text-lg font-semibold text-gray-900">{getClientName(ride)}</h3>
											<span class="px-2 py-1 text-xs font-medium rounded-full {getStatusColor(ride.status)}">
												{ride.status.toUpperCase()}
											</span>
											{#if ride.purpose}
												<span class="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
													{ride.purpose}
												</span>
											{/if}
										</div>
										
										<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
											<div class="flex items-center gap-2">
												<Phone class="w-4 h-4 text-gray-400" />
												{getClientPhone(ride)}
											</div>
											<div class="flex items-center gap-2">
												<Calendar class="w-4 h-4 text-gray-400" />
												{formatDate(ride.appointment_time)} at {formatTime(ride.appointment_time)}
											</div>
											<div class="flex items-center gap-2">
												<User class="w-4 h-4 text-gray-400" />
												Driver: {getDriverName(ride)}
											</div>
											<div class="flex items-center gap-2">
												<MapPin class="w-4 h-4 text-gray-400" />
												Destination: {ride.destination_name}
											</div>
										</div>
										
										{#if ride.notes}
											<div class="text-sm">
												<span class="font-medium">Notes:</span> {ride.notes}
											</div>
										{/if}
									</div>
									
									<div class="flex gap-2 ml-4">
										{#if ride.status === "Requested"}
											<button 
												onclick={() => openDriverMatchModal(ride)}
												disabled={isUpdating}
												class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-colors disabled:opacity-50"
											>
												<UserCheck class="w-4 h-4" />
												Send Request
											</button>
										{/if}
										
										<button 
											onclick={() => openEditModal(ride)}
											disabled={isUpdating}
											class="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-colors disabled:opacity-50"
										>
											<Edit class="w-4 h-4" />
											Edit
										</button>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<!-- Empty State -->
					<div class="p-12 text-center">
						<Car class="w-12 h-12 mx-auto text-gray-400 mb-4" />
						<h3 class="text-lg font-semibold text-gray-900 mb-2">No rides found</h3>
						<p class="text-gray-600">
							No requested rides at this time.
						</p>
					</div>
				{/if}
			</div>
			
			<!-- Quick Actions -->
			<div class="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
				<a href="/dispatcher/requests/create" class="group p-6 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200">
					<div class="flex items-center space-x-3">
						<div class="p-2 rounded-lg bg-blue-500 text-white">
							<Plus class="w-6 h-6" />
						</div>
						<div>
							<h3 class="font-medium text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
								Create Ride Request
							</h3>
							<p class="text-sm text-gray-500">Add new ride requests for clients</p>
						</div>
					</div>
				</a>
				
				<a href="/dispatcher/schedule" class="group p-6 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200">
					<div class="flex items-center space-x-3">
						<div class="p-2 rounded-lg bg-green-500 text-white">
							<Calendar class="w-6 h-6" />
						</div>
						<div>
							<h3 class="font-medium text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
								Manage Schedule
							</h3>
							<p class="text-sm text-gray-500">View and manage driver schedules</p>
						</div>
					</div>
				</a>
				
				<a href="/dispatcher/drivers" class="group p-6 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200">
					<div class="flex items-center space-x-3">
						<div class="p-2 rounded-lg bg-purple-500 text-white">
							<Users class="w-6 h-6" />
						</div>
						<div>
							<h3 class="font-medium text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
								Driver Management
							</h3>
							<p class="text-sm text-gray-500">Manage driver accounts and availability</p>
						</div>
					</div>
				</a>
			</div>
		</div>
	</div>
</RoleGuard>

<DriverMatchModal 
	bind:show={showDriverMatchModal}
	ride={selectedRideForMatch}
	onClose={() => {
		showDriverMatchModal = false;
		selectedRideForMatch = null;
		invalidateAll();
	}}
/>
