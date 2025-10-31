<script lang="ts">
	import RoleGuard from '$lib/components/RoleGuard.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import { goto } from '$app/navigation';
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
		ArrowRight
	} from '@lucide/svelte';
	
	// Empty array - data will come from the rides page
	let rideRequests = $state([]);
	
	let selectedStatus = $state('all');
	
	// Filter ride requests by status using runes
	const filteredRequests = $derived(selectedStatus === 'all' 
		? rideRequests 
		: rideRequests.filter(ride => ride.status === selectedStatus));
	
	// Get status badge color
	function getStatusColor(status: string) {
		switch (status) {
			case 'Pending': return 'bg-yellow-100 text-yellow-800';
			case 'Assigned': return 'bg-blue-100 text-blue-800';
			case 'In Progress': return 'bg-orange-100 text-orange-800';
			case 'Completed': return 'bg-green-100 text-green-800';
			default: return 'bg-gray-100 text-gray-800';
		}
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
				<div class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
					<div class="flex items-center">
						<div class="p-2 bg-blue-100 rounded-lg">
							<AlertCircle class="w-6 h-6 text-blue-600" />
						</div>
						<div class="ml-4">
							<p class="text-sm font-medium text-gray-500">Pending Requests</p>
							<p class="text-2xl font-semibold text-gray-900">5</p>
						</div>
					</div>
				</div>
				
				<div class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
					<div class="flex items-center">
						<div class="p-2 bg-green-100 rounded-lg">
							<CheckCircle class="w-6 h-6 text-green-600" />
						</div>
						<div class="ml-4">
							<p class="text-sm font-medium text-gray-500">Assigned Rides</p>
							<p class="text-2xl font-semibold text-gray-900">12</p>
						</div>
					</div>
				</div>
				
				<div class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
					<div class="flex items-center">
						<div class="p-2 bg-orange-100 rounded-lg">
							<Clock class="w-6 h-6 text-orange-600" />
						</div>
						<div class="ml-4">
							<p class="text-sm font-medium text-gray-500">In Progress</p>
							<p class="text-2xl font-semibold text-gray-900">3</p>
						</div>
					</div>
				</div>
				
				<div class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
					<div class="flex items-center">
						<div class="p-2 bg-purple-100 rounded-lg">
							<Users class="w-6 h-6 text-purple-600" />
						</div>
						<div class="ml-4">
							<p class="text-sm font-medium text-gray-500">Active Drivers</p>
							<p class="text-2xl font-semibold text-gray-900">8</p>
						</div>
					</div>
				</div>
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
				
				<!-- Empty State with Link to Rides Page -->
				<div class="px-6 py-12 text-center">
					<Car class="w-12 h-12 text-gray-400 mx-auto mb-4" />
					<h3 class="text-lg font-medium text-gray-900 mb-2">No Ride Requests</h3>
					<p class="text-sm text-gray-500 mb-6">View and manage all ride requests in the rides page.</p>
					<button 
						onclick={() => goto('/dispatcher/rides')}
						class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
					>
						<Car class="w-4 h-4 mr-2" />
						Go to Rides Page
					</button>
				</div>
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
