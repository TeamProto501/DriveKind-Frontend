<script lang="ts">
	import RoleGuard from '$lib/components/RoleGuard.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
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
		Filter
	} from '@lucide/svelte';
	
	// Mock data - replace with actual API calls
	let rideRequests = $state([
		{ id: 1, client: 'John Smith', pickup: '123 Main St', dropoff: '456 Oak Ave', time: '2:00 PM', status: 'Pending' },
		{ id: 2, client: 'Jane Doe', pickup: '789 Pine Rd', dropoff: '321 Elm St', time: '3:30 PM', status: 'Assigned' },
		{ id: 3, client: 'Bob Johnson', pickup: '654 Maple Dr', dropoff: '987 Cedar Ln', time: '4:15 PM', status: 'In Progress' }
	]);
	
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
						<h2 class="text-lg font-medium text-gray-900">Ride Requests</h2>
						
						<div class="flex items-center space-x-3">
							<!-- Search -->
							<div class="relative">
								<Search class="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
								<input
									type="text"
									placeholder="Search requests..."
									class="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								/>
							</div>
							
							<!-- Status Filter -->
							<select
								bind:value={selectedStatus}
								class="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							>
								<option value="all">All Status</option>
								<option value="Pending">Pending</option>
								<option value="Assigned">Assigned</option>
								<option value="In Progress">In Progress</option>
								<option value="Completed">Completed</option>
							</select>
							
							<!-- Add New Request -->
							<button class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2">
								<Plus class="w-4 h-4" />
								<span>New Request</span>
							</button>
						</div>
					</div>
				</div>
				
				<!-- Ride Requests Table -->
				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-gray-200">
						<thead class="bg-gray-50">
							<tr>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Request ID
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Client
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Pickup
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Dropoff
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Time
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Status
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Actions
								</th>
							</tr>
						</thead>
						<tbody class="bg-white divide-y divide-gray-200">
							{#each filteredRequests as request}
								<tr class="hover:bg-gray-50">
									<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
										#{request.id}
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
										{request.client}
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
										<div class="flex items-center">
											<MapPin class="w-4 h-4 text-gray-400 mr-2" />
											{request.pickup}
										</div>
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
										<div class="flex items-center">
											<MapPin class="w-4 h-4 text-gray-400 mr-2" />
											{request.dropoff}
										</div>
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
										<div class="flex items-center">
											<Clock class="w-4 h-4 text-gray-400 mr-2" />
											{request.time}
										</div>
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {getStatusColor(request.status)}">
											{request.status}
										</span>
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
										<button class="text-blue-600 hover:text-blue-900 mr-3">
											Assign Driver
										</button>
										<button class="text-gray-600 hover:text-gray-900">
											View Details
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
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
