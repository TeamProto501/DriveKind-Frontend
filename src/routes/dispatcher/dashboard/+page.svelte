<script lang="ts">
	import RoleGuard from '$lib/components/RoleGuard.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import { 
		Car, 
		Calendar, 
		MapPin, 
		Clock, 
		AlertCircle,
		ArrowRight,
		Phone,
		User,
		Navigation,
		Send
	} from '@lucide/svelte';
	
	let { data }: { data: PageData } = $props();
	
	// Sort rides: rides without driver requests first, then those with pending requests
	const sortedRides = $derived(() => {
		const rides = data.rides || [];
		return [...rides].sort((a, b) => {
			// Rides without driver_user_id come first (not yet sent to any driver)
			const aHasDriver = a.driver_user_id != null;
			const bHasDriver = b.driver_user_id != null;
			
			if (!aHasDriver && bHasDriver) return -1;
			if (aHasDriver && !bHasDriver) return 1;
			
			// Then sort by appointment time
			return new Date(a.appointment_time).getTime() - new Date(b.appointment_time).getTime();
		});
	});
	
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
	
	function hasDriverRequest(ride: any) {
		return ride.driver_user_id != null;
	}
</script>

<RoleGuard requiredRoles={['Dispatcher']}>
	<div class="min-h-screen bg-gray-50">
		<Breadcrumbs />
		
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			<!-- Header Section -->
			<div class="mb-8">
				<div class="flex items-center justify-between">
					<div>
						<h1 class="text-3xl font-bold text-gray-900">Dispatcher Dashboard</h1>
						<p class="text-gray-600 mt-2">
							Manage ride requests, assign drivers, and coordinate transportation.
						</p>
					</div>
					
					<div class="flex items-center space-x-2 px-4 py-2 bg-green-100 rounded-full">
						<Car class="w-5 h-5 text-green-600" />
						<span class="text-sm font-medium text-green-800">Dispatcher</span>
					</div>
				</div>
			</div>
			
			<!-- Quick Action Cards -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
				<!-- Rides Card -->
				<button 
					onclick={() => goto('/dispatcher/rides')}
					class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer text-left w-full group"
				>
					<div class="flex items-center justify-between">
						<div class="flex items-center">
							<div class="p-3 bg-blue-100 rounded-lg">
								<Car class="w-8 h-8 text-blue-600" />
							</div>
							<div class="ml-4">
								<h3 class="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
									Ride Management
								</h3>
								<p class="text-sm text-gray-500">View and manage all rides</p>
							</div>
						</div>
						<div class="text-right">
							<p class="text-3xl font-bold text-blue-600">{data.rideCounts?.pending || 0}</p>
							<p class="text-xs text-gray-500">Pending</p>
						</div>
					</div>
				</button>
				
				<!-- Destinations Card -->
				<button 
					onclick={() => goto('/dispatcher/destinations')}
					class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-green-300 transition-all duration-200 cursor-pointer text-left w-full group"
				>
					<div class="flex items-center justify-between">
						<div class="flex items-center">
							<div class="p-3 bg-green-100 rounded-lg">
								<Navigation class="w-8 h-8 text-green-600" />
							</div>
							<div class="ml-4">
								<h3 class="text-lg font-semibold text-gray-900 group-hover:text-green-600 transition-colors">
									Destinations
								</h3>
								<p class="text-sm text-gray-500">Manage frequent locations</p>
							</div>
						</div>
						<ArrowRight class="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
					</div>
				</button>
			</div>
			
			<!-- Ride Requests List -->
			<div class="bg-white rounded-lg border border-gray-200 shadow-sm">
				<div class="px-6 py-4 border-b border-gray-200">
					<div class="flex items-center justify-between">
						<div>
							<h2 class="text-lg font-semibold text-gray-900">Ride Requests</h2>
							<p class="text-sm text-gray-500">Unassigned rides awaiting driver assignment</p>
						</div>
						
						<button 
							onclick={() => goto('/dispatcher/rides')}
							class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2"
						>
							<Car class="w-4 h-4" />
							<span>View All Rides</span>
						</button>
					</div>
				</div>
				
				{#if sortedRides().length > 0}
					<div class="divide-y divide-gray-200">
						{#each sortedRides() as ride}
							<div class="p-6 hover:bg-gray-50 transition-colors">
								<div class="space-y-3">
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
										{#if hasDriverRequest(ride)}
											<span class="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 flex items-center gap-1">
												<Send class="w-3 h-3" />
												Request Sent
											</span>
										{:else}
											<span class="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 flex items-center gap-1">
												<AlertCircle class="w-3 h-3" />
												Needs Driver
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
										<div class="flex items-center gap-2 md:col-span-2">
											<MapPin class="w-4 h-4 text-gray-400" />
											Destination: {ride.destination_name || 'Not specified'}
										</div>
									</div>
									
									{#if ride.notes}
										<div class="text-sm text-gray-600">
											<span class="font-medium">Notes:</span> {ride.notes}
										</div>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="p-12 text-center">
						<Car class="w-12 h-12 mx-auto text-gray-400 mb-4" />
						<h3 class="text-lg font-semibold text-gray-900 mb-2">No pending ride requests</h3>
						<p class="text-gray-600">
							All ride requests have been assigned to drivers.
						</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
</RoleGuard>
