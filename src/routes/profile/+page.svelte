<script lang="ts">
	import RoleGuard from '$lib/components/RoleGuard.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import { User, Settings, Shield, Mail, Phone, MapPin, Calendar } from '@lucide/svelte';
</script>

<RoleGuard requiredRoles={['Admin', 'Dispatcher', 'Driver', 'Volunteer']}>
	<div class="min-h-screen bg-gray-50">
		<Breadcrumbs />
		
		<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			<div class="mb-8">
				<h1 class="text-3xl font-bold text-gray-900">Profile Settings</h1>
				<p class="text-gray-600 mt-2">Manage your account information and preferences.</p>
			</div>
			
			<div class="bg-white rounded-lg shadow-sm border border-gray-200">
				<div class="px-6 py-4 border-b border-gray-200">
					<h2 class="text-lg font-medium text-gray-900">Personal Information</h2>
				</div>
				
				<div class="p-6">
					<div class="text-center py-12">
						<User class="w-16 h-16 text-gray-400 mx-auto mb-4" />
						<h3 class="text-lg font-medium text-gray-900 mb-2">Profile Management Coming Soon</h3>
						<p class="text-gray-500">This page will allow users to update their personal information, contact details, and account preferences.</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</RoleGuard>
