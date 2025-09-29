<script lang="ts">
	import RoleGuard from '$lib/components/RoleGuard.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import { User, Mail, Phone, MapPin, Calendar, Shield, Award, Clock, Home, Car, AlertTriangle } from '@lucide/svelte';
	import { getContext, onMount } from 'svelte';
	import { supabase } from '$lib/supabase';

	const session = getContext<any>('session');
	
	// Staff profile interface matching your Supabase schema
	interface StaffProfile {
		user_id: string;
		org_id: number;
		first_name: string;
		last_name: string;
		email: string;
		training_completed: boolean;
		training_score: number | null;
		training_started_at: string | null;
		training_completed_at: string | null;
		dob: string;
		address: string | null;
		zipcode: number | null;
		city: string;
		state: string;
		mileage_reimbursment: boolean;
		contact_type_pref: string | null;
		emergency_contact: string | null;
		emergency_reln: string | null;
		emergency_phone: string | null;
		max_riders: number | null;
		destination_limitation: string | null;
		user_name: string | null;
		primary_phone: string | null;
		secondary_phone: string | null;
		primary_is_cell: boolean | null;
		primary_can_text: boolean | null;
		secondary_is_cell: boolean | null;
		secondary_can_text: boolean | null;
		role: string[] | null;
		address2: string | null;
	}

	let profile: StaffProfile | null = null;
	let isLoading = $state(true);
	let error = $state('');

	// Load profile data on mount
	onMount(async () => {
		if (session?.user?.id) {
			await loadProfile();
		} else {
			error = 'No user session found';
			isLoading = false;
		}
	});

	// Load profile from Supabase
	async function loadProfile() {
		try {
			console.log('👤 Loading staff profile for user:', session.user.id);
			isLoading = true;
			
			const { data, error: profileError } = await supabase
				.from('staff_profiles')
				.select('*')
				.eq('user_id', session.user.id)
				.single();

			if (profileError) {
				console.error('❌ Error loading profile:', profileError);
				error = 'Failed to load profile: ' + profileError.message;
				return;
			}

			console.log('✅ Profile loaded:', data);
			profile = data;
		} catch (err) {
			console.error('❌ Exception loading profile:', err);
			error = 'Failed to load profile: ' + (err as Error).message;
		} finally {
			isLoading = false;
		}
	}

	// Format date
	function formatDate(dateString: string | null) {
		if (!dateString) return '-';
		return new Date(dateString).toLocaleDateString();
	}

	// Format phone number
	function formatPhone(phone: string | null) {
		if (!phone) return '-';
		return phone;
	}

	// Get role display
	function getRoleDisplay(roles: string[] | null) {
		if (!roles || roles.length === 0) return '-';
		return roles.join(', ');
	}
</script>

<RoleGuard requiredRoles={['Admin', 'Dispatcher', 'Driver', 'Volunteer', 'Super Admin']}>
	<div class="min-h-screen bg-gray-50">
		<Breadcrumbs />
		
		<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			<div class="mb-8">
				<h1 class="text-3xl font-bold text-gray-900">Profile Information</h1>
				<p class="text-gray-600 mt-2">View your complete staff profile information.</p>
			</div>

			{#if isLoading}
				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
					<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
					<p class="mt-2 text-gray-500">Loading profile...</p>
				</div>
			{:else if error}
				<div class="bg-red-50 border border-red-200 rounded-lg p-6">
					<div class="flex">
						<AlertTriangle class="w-5 h-5 text-red-400 mr-3 mt-0.5" />
						<div>
							<h3 class="text-sm font-medium text-red-800">Error Loading Profile</h3>
							<p class="mt-1 text-sm text-red-700">{error}</p>
						</div>
					</div>
				</div>
			{:else if profile}
				<div class="space-y-6">
					<!-- Personal Information -->
					<div class="bg-white rounded-lg shadow-sm border border-gray-200">
						<div class="px-6 py-4 border-b border-gray-200">
							<div class="flex items-center">
								<User class="w-5 h-5 text-blue-600 mr-2" />
								<h2 class="text-lg font-medium text-gray-900">Personal Information</h2>
							</div>
						</div>
						<div class="p-6">
							<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
								<div>
									<label class="block text-sm font-medium text-gray-700">First Name</label>
									<p class="mt-1 text-gray-900">{profile.first_name}</p>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Last Name</label>
									<p class="mt-1 text-gray-900">{profile.last_name}</p>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Username</label>
									<p class="mt-1 text-gray-900">{profile.user_name || '-'}</p>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Email</label>
									<p class="mt-1 text-gray-900 flex items-center">
										<Mail class="w-4 h-4 mr-1 text-gray-400" />
										{profile.email}
									</p>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Date of Birth</label>
									<p class="mt-1 text-gray-900 flex items-center">
										<Calendar class="w-4 h-4 mr-1 text-gray-400" />
										{formatDate(profile.dob)}
									</p>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Role(s)</label>
									<p class="mt-1 text-gray-900 flex items-center">
										<Shield class="w-4 h-4 mr-1 text-gray-400" />
										{getRoleDisplay(profile.role)}
									</p>
								</div>
							</div>
						</div>
					</div>

					<!-- Contact Information -->
					<div class="bg-white rounded-lg shadow-sm border border-gray-200">
						<div class="px-6 py-4 border-b border-gray-200">
							<div class="flex items-center">
								<Phone class="w-5 h-5 text-green-600 mr-2" />
								<h2 class="text-lg font-medium text-gray-900">Contact Information</h2>
							</div>
						</div>
						<div class="p-6">
							<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
								<div>
									<label class="block text-sm font-medium text-gray-700">Primary Phone</label>
									<p class="mt-1 text-gray-900 flex items-center">
										<Phone class="w-4 h-4 mr-1 text-gray-400" />
										{formatPhone(profile.primary_phone)}
									</p>
									{#if profile.primary_is_cell !== null}
										<p class="text-xs text-gray-500 mt-1">
											{profile.primary_is_cell ? 'Mobile' : 'Landline'} 
											{profile.primary_can_text ? '• Can text' : ''}
										</p>
									{/if}
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Secondary Phone</label>
									<p class="mt-1 text-gray-900 flex items-center">
										<Phone class="w-4 h-4 mr-1 text-gray-400" />
										{formatPhone(profile.secondary_phone)}
									</p>
									{#if profile.secondary_is_cell !== null}
										<p class="text-xs text-gray-500 mt-1">
											{profile.secondary_is_cell ? 'Mobile' : 'Landline'} 
											{profile.secondary_can_text ? '• Can text' : ''}
										</p>
									{/if}
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Contact Preference</label>
									<p class="mt-1 text-gray-900">{profile.contact_type_pref || '-'}</p>
								</div>
							</div>
						</div>
					</div>

					<!-- Address Information -->
					<div class="bg-white rounded-lg shadow-sm border border-gray-200">
						<div class="px-6 py-4 border-b border-gray-200">
							<div class="flex items-center">
								<MapPin class="w-5 h-5 text-purple-600 mr-2" />
								<h2 class="text-lg font-medium text-gray-900">Address Information</h2>
							</div>
						</div>
						<div class="p-6">
							<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div>
									<label class="block text-sm font-medium text-gray-700">Address</label>
									<p class="mt-1 text-gray-900 flex items-center">
										<Home class="w-4 h-4 mr-1 text-gray-400" />
										{profile.address || '-'}
									</p>
									{#if profile.address2}
										<p class="mt-1 text-gray-900 ml-5">{profile.address2}</p>
									{/if}
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">City, State ZIP</label>
									<p class="mt-1 text-gray-900 flex items-center">
										<MapPin class="w-4 h-4 mr-1 text-gray-400" />
										{profile.city}, {profile.state} {profile.zipcode || ''}
									</p>
								</div>
							</div>
						</div>
					</div>

					<!-- Training Information -->
					<div class="bg-white rounded-lg shadow-sm border border-gray-200">
						<div class="px-6 py-4 border-b border-gray-200">
							<div class="flex items-center">
								<Award class="w-5 h-5 text-yellow-600 mr-2" />
								<h2 class="text-lg font-medium text-gray-900">Training Information</h2>
							</div>
						</div>
						<div class="p-6">
							<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
								<div>
									<label class="block text-sm font-medium text-gray-700">Training Status</label>
									<p class="mt-1 text-gray-900">
										<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {profile.training_completed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
											{profile.training_completed ? 'Completed' : 'In Progress'}
										</span>
									</p>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Training Score</label>
									<p class="mt-1 text-gray-900">{profile.training_score || '-'}</p>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Training Started</label>
									<p class="mt-1 text-gray-900 flex items-center">
										<Clock class="w-4 h-4 mr-1 text-gray-400" />
										{formatDate(profile.training_started_at)}
									</p>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Training Completed</label>
									<p class="mt-1 text-gray-900 flex items-center">
										<Clock class="w-4 h-4 mr-1 text-gray-400" />
										{formatDate(profile.training_completed_at)}
									</p>
								</div>
							</div>
						</div>
					</div>

					<!-- Work Information -->
					<div class="bg-white rounded-lg shadow-sm border border-gray-200">
						<div class="px-6 py-4 border-b border-gray-200">
							<div class="flex items-center">
								<Car class="w-5 h-5 text-indigo-600 mr-2" />
								<h2 class="text-lg font-medium text-gray-900">Work Information</h2>
							</div>
						</div>
						<div class="p-6">
							<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
								<div>
									<label class="block text-sm font-medium text-gray-700">Organization ID</label>
									<p class="mt-1 text-gray-900">{profile.org_id}</p>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Max Riders</label>
									<p class="mt-1 text-gray-900">{profile.max_riders || '-'}</p>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Mileage Reimbursement</label>
									<p class="mt-1 text-gray-900">
										<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {profile.mileage_reimbursment ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
											{profile.mileage_reimbursment ? 'Enabled' : 'Disabled'}
										</span>
									</p>
								</div>
								{#if profile.destination_limitation}
									<div class="md:col-span-2">
										<label class="block text-sm font-medium text-gray-700">Destination Limitations</label>
										<p class="mt-1 text-gray-900">{profile.destination_limitation}</p>
									</div>
								{/if}
							</div>
						</div>
					</div>

					<!-- Emergency Contact -->
					{#if profile.emergency_contact}
						<div class="bg-white rounded-lg shadow-sm border border-gray-200">
							<div class="px-6 py-4 border-b border-gray-200">
								<div class="flex items-center">
									<AlertTriangle class="w-5 h-5 text-red-600 mr-2" />
									<h2 class="text-lg font-medium text-gray-900">Emergency Contact</h2>
								</div>
							</div>
							<div class="p-6">
								<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
									<div>
										<label class="block text-sm font-medium text-gray-700">Contact Name</label>
										<p class="mt-1 text-gray-900">{profile.emergency_contact}</p>
									</div>
									<div>
										<label class="block text-sm font-medium text-gray-700">Relationship</label>
										<p class="mt-1 text-gray-900">{profile.emergency_reln || '-'}</p>
									</div>
									<div>
										<label class="block text-sm font-medium text-gray-700">Phone</label>
										<p class="mt-1 text-gray-900 flex items-center">
											<Phone class="w-4 h-4 mr-1 text-gray-400" />
											{formatPhone(profile.emergency_phone)}
										</p>
									</div>
								</div>
							</div>
						</div>
					{/if}
				</div>
			{:else}
				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
					<User class="w-16 h-16 text-gray-400 mx-auto mb-4" />
					<h3 class="text-lg font-medium text-gray-900 mb-2">No Profile Found</h3>
					<p class="text-gray-500">Your staff profile could not be loaded. Please contact your administrator.</p>
				</div>
			{/if}
		</div>
	</div>
</RoleGuard>