<script lang="ts">
	import RoleGuard from '$lib/components/RoleGuard.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import { User, Mail, Phone, MapPin, Calendar } from '@lucide/svelte';
	import { getContext } from 'svelte';

	const profile = getContext<any>('profile');
	const session = getContext<any>('session');
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
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
						<div>
							<label class="block text-sm font-medium text-gray-700">First name</label>
							<p class="mt-1 text-gray-900">{profile?.first_name ?? '-'}</p>
						</div>
						<div>
							<label class="block text-sm font-medium text-gray-700">Last name</label>
							<p class="mt-1 text-gray-900">{profile?.last_name ?? '-'}</p>
						</div>
						<div class="sm:col-span-2">
							<label class="block text-sm font-medium text-gray-700">Email</label>
							<p class="mt-1 text-gray-900">{profile?.email ?? session?.user?.email ?? '-'}</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</RoleGuard>
