<script lang="ts">
	import RoleGuard from '$lib/components/RoleGuard.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import { BarChart3, Download, Calendar, Filter, FileText } from '@lucide/svelte';
</script>

<RoleGuard requiredRoles={['Admin']}>
	<div class="min-h-screen bg-gray-50">
		<Breadcrumbs />
		
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			<div class="mb-8">
				<h1 class="text-3xl font-bold text-gray-900">Trip Reports</h1>
				<p class="text-gray-600 mt-2">Generate and export comprehensive trip reports and analytics.</p>
			</div>
			
			<div class="bg-white rounded-lg shadow-sm border border-gray-200">
				<div class="px-6 py-4 border-b border-gray-200">
					<div class="flex items-center justify-between">
						<h2 class="text-lg font-medium text-gray-900">Report Generator</h2>
						<button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2">
							<Download class="w-4 h-4" />
							<span>Export Report</span>
						</button>
					</div>
				</div>
				
				<div class="p-6">
					<div class="text-center py-12">
						<BarChart3 class="w-16 h-16 text-gray-400 mx-auto mb-4" />
						<h3 class="text-lg font-medium text-gray-900 mb-2">Reporting System Coming Soon</h3>
						<p class="text-gray-500">This page will provide comprehensive reporting tools for trip data, driver performance, and organizational analytics.</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</RoleGuard>
