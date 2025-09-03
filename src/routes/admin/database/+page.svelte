<!-- src/routes/admin/database/+page.svelte -->
<script lang="ts">
	import RoleGuard from '$lib/components/RoleGuard.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import { 
		Database, 
		Settings, 
		RefreshCw, 
		Download, 
		Upload, 
		Trash2,
		Eye,
		Edit,
		Plus,
		Search,
		Filter
	} from '@lucide/svelte';
	
	// Mock database tables data
	const databaseTables = [
		{
			name: 'users',
			records: 156,
			size: '2.3 MB',
			lastModified: '2024-01-15',
			status: 'active'
		},
		{
			name: 'rides',
			records: 892,
			size: '8.7 MB',
			lastModified: '2024-01-15',
			status: 'active'
		},
		{
			name: 'organizations',
			records: 12,
			size: '156 KB',
			lastModified: '2024-01-14',
			status: 'active'
		},
		{
			name: 'audit_logs',
			records: 2341,
			size: '15.2 MB',
			lastModified: '2024-01-15',
			status: 'active'
		}
	];
	
	// Mock backup history
	const backupHistory = [
		{
			id: 1,
			date: '2024-01-15 02:00',
			size: '45.2 MB',
			status: 'completed',
			type: 'automatic'
		},
		{
			id: 2,
			date: '2024-01-14 02:00',
			size: '44.8 MB',
			status: 'completed',
			type: 'automatic'
		},
		{
			id: 3,
			date: '2024-01-13 02:00',
			size: '44.5 MB',
			status: 'completed',
			type: 'automatic'
		}
	];
	
	let selectedTable = $state('');
	let searchQuery = $state('');
	let showBackupModal = $state(false);
	let showRestoreModal = $state(false);
	
	function handleTableSelect(tableName: string) {
		selectedTable = tableName;
	}
	
	function createBackup() {
		showBackupModal = true;
		// TODO: Implement actual backup creation
	}
	
	function restoreBackup() {
		showRestoreModal = true;
		// TODO: Implement actual backup restoration
	}
	
	function optimizeDatabase() {
		// TODO: Implement database optimization
		console.log('Optimizing database...');
	}
</script>

<RoleGuard requiredRoles={['Admin']}>
	<div class="min-h-screen bg-gray-50">
		<!-- Header -->
		<div class="bg-white shadow-sm border-b border-gray-200">
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
				<div class="flex items-center justify-between">
					<div>
						<h1 class="text-2xl font-bold text-gray-900">Database Management</h1>
						<p class="text-sm text-gray-600">Manage database tables, backups, and system configuration</p>
					</div>
					<div class="flex items-center space-x-3">
						<button
							on:click={createBackup}
							class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
						>
							<Download class="w-4 h-4 mr-2" />
							Create Backup
						</button>
						<button
							on:click={restoreBackup}
							class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
						>
							<Upload class="w-4 h-4 mr-2" />
							Restore Backup
						</button>
					</div>
				</div>
			</div>
		</div>
		
		<!-- Breadcrumbs -->
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
			<Breadcrumbs />
		</div>
		
		<!-- Main Content -->
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
			<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<!-- Database Overview -->
				<div class="lg:col-span-2 space-y-6">
					<!-- Database Tables -->
					<div class="bg-white shadow rounded-lg">
						<div class="px-6 py-4 border-b border-gray-200">
							<div class="flex items-center justify-between">
								<h3 class="text-lg font-medium text-gray-900">Database Tables</h3>
								<div class="flex items-center space-x-2">
									<div class="relative">
										<Search class="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
										<input
											bind:value={searchQuery}
											type="text"
											placeholder="Search tables..."
											class="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
										/>
									</div>
									<button class="p-2 text-gray-400 hover:text-gray-600">
										<Filter class="w-4 h-4" />
									</button>
								</div>
							</div>
						</div>
						<div class="overflow-x-auto">
							<table class="min-w-full divide-y divide-gray-200">
								<thead class="bg-gray-50">
									<tr>
										<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Table Name
										</th>
										<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Records
										</th>
										<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Size
										</th>
										<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Last Modified
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
									{#each databaseTables.filter(table => 
										!searchQuery || table.name.toLowerCase().includes(searchQuery.toLowerCase())
									) as table}
										<tr class="hover:bg-gray-50">
											<td class="px-6 py-4 whitespace-nowrap">
												<div class="flex items-center">
													<Database class="w-5 h-5 text-blue-500 mr-3" />
													<span class="text-sm font-medium text-gray-900">{table.name}</span>
												</div>
											</td>
											<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												{table.records.toLocaleString()}
											</td>
											<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												{table.size}
											</td>
											<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												{table.lastModified}
											</td>
											<td class="px-6 py-4 whitespace-nowrap">
												<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
													{table.status}
												</span>
											</td>
											<td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
												<div class="flex items-center space-x-2">
													<button class="text-blue-600 hover:text-blue-900" title="View">
														<Eye class="w-4 h-4" />
													</button>
													<button class="text-gray-600 hover:text-gray-900" title="Edit">
														<Edit class="w-4 h-4" />
													</button>
													<button class="text-red-600 hover:text-red-900" title="Delete">
														<Trash2 class="w-4 h-4" />
													</button>
												</div>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
					
					<!-- System Configuration -->
					<div class="bg-white shadow rounded-lg">
						<div class="px-6 py-4 border-b border-gray-200">
							<h3 class="text-lg font-medium text-gray-900">System Configuration</h3>
						</div>
						<div class="px-6 py-4 space-y-4">
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label class="block text-sm font-medium text-gray-700">Database Connection Pool</label>
									<input type="number" value="20" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Query Timeout (seconds)</label>
									<input type="number" value="30" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Max Backup Size (GB)</label>
									<input type="number" value="10" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Auto Backup Frequency</label>
									<select class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
										<option>Daily</option>
										<option>Weekly</option>
										<option>Monthly</option>
									</select>
								</div>
							</div>
							<div class="flex items-center justify-end space-x-3 pt-4">
								<button class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
									Reset to Defaults
								</button>
								<button class="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">
									Save Changes
								</button>
							</div>
						</div>
					</div>
				</div>
				
				<!-- Sidebar -->
				<div class="space-y-6">
					<!-- Quick Stats -->
					<div class="bg-white shadow rounded-lg p-6">
						<h3 class="text-lg font-medium text-gray-900 mb-4">Database Stats</h3>
						<div class="space-y-4">
							<div class="flex items-center justify-between">
								<span class="text-sm text-gray-600">Total Tables</span>
								<span class="text-sm font-medium text-gray-900">4</span>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-sm text-gray-600">Total Records</span>
								<span class="text-sm font-medium text-gray-900">3,401</span>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-sm text-gray-600">Total Size</span>
								<span class="text-sm font-medium text-gray-900">26.3 MB</span>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-sm text-gray-600">Last Backup</span>
								<span class="text-sm font-medium text-gray-900">2 hours ago</span>
							</div>
						</div>
					</div>
					
					<!-- Backup History -->
					<div class="bg-white shadow rounded-lg p-6">
						<h3 class="text-lg font-medium text-gray-900 mb-4">Recent Backups</h3>
						<div class="space-y-3">
							{#each backupHistory as backup}
								<div class="flex items-center justify-between p-3 bg-gray-50 rounded-md">
									<div>
										<p class="text-sm font-medium text-gray-900">#{backup.id}</p>
										<p class="text-xs text-gray-600">{backup.date}</p>
									</div>
									<div class="text-right">
										<p class="text-sm text-gray-900">{backup.size}</p>
										<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
											{backup.status}
										</span>
									</div>
								</div>
							{/each}
						</div>
					</div>
					
					<!-- Quick Actions -->
					<div class="bg-white shadow rounded-lg p-6">
						<h3 class="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
						<div class="space-y-3">
							<button
								on:click={optimizeDatabase}
								class="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
							>
								<RefreshCw class="w-4 h-4 mr-2" />
								Optimize Database
							</button>
							<button class="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
								<Settings class="w-4 h-4 mr-2" />
								Advanced Settings
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</RoleGuard>
