<script lang="ts">
	import RoleGuard from '$lib/components/RoleGuard.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import { User, Mail, Phone, MapPin, Calendar, Shield, Award, Clock, Home, Car, AlertTriangle, Edit, Save, X } from '@lucide/svelte';
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
	let originalProfile: StaffProfile | null = null;
	let isLoading = true;
	let error = '';
	let showEditModal = false;
	let editMessage = '';
	let editMessageSuccess = false;
	let isSubmitting = false;

	// Form data for editing
	let formData = {
		first_name: '',
		last_name: '',
		user_name: '',
		dob: '',
		address: '',
		address2: '',
		city: '',
		state: '',
		zipcode: '',
		primary_phone: '',
		secondary_phone: '',
		primary_is_cell: false,
		primary_can_text: false,
		secondary_is_cell: false,
		secondary_can_text: false,
		contact_type_pref: '',
		emergency_contact: '',
		emergency_reln: '',
		emergency_phone: '',
		max_riders: '',
		destination_limitation: ''
	};

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

	// Validation functions
	function validateForm(): string[] {
		const errors: string[] = [];

		// Required fields validation
		if (!formData.first_name.trim()) errors.push('First name is required');
		if (!formData.last_name.trim()) errors.push('Last name is required');
		if (!formData.dob.trim()) errors.push('Date of birth is required');
		if (!formData.city.trim()) errors.push('City is required');
		if (!formData.state.trim()) errors.push('State is required');

		// String length validation (matching database constraints)
		if (formData.first_name.length > 50) errors.push('First name must be 50 characters or less');
		if (formData.last_name.length > 50) errors.push('Last name must be 50 characters or less');
		if (formData.user_name && formData.user_name.length > 50) errors.push('Username must be 50 characters or less');
		if (formData.address && formData.address.length > 100) errors.push('Address must be 100 characters or less');
		if (formData.address2 && formData.address2.length > 100) errors.push('Address line 2 must be 100 characters or less');
		if (formData.city.length > 50) errors.push('City must be 50 characters or less');
		if (formData.state.length > 2) errors.push('State must be 2 characters or less');
		if (formData.contact_type_pref && formData.contact_type_pref.length > 20) errors.push('Contact preference must be 20 characters or less');
		if (formData.emergency_contact && formData.emergency_contact.length > 50) errors.push('Emergency contact name must be 50 characters or less');
		if (formData.emergency_reln && formData.emergency_reln.length > 20) errors.push('Emergency relationship must be 20 characters or less');
		if (formData.destination_limitation && formData.destination_limitation.length > 200) errors.push('Destination limitation must be 200 characters or less');

		// Phone validation (if provided) - more strict format
		if (formData.primary_phone && !/^[\d\-\+\(\)\s]{10,15}$/.test(formData.primary_phone.replace(/\s/g, ''))) {
			errors.push('Primary phone must be 10-15 digits');
		}
		if (formData.secondary_phone && !/^[\d\-\+\(\)\s]{10,15}$/.test(formData.secondary_phone.replace(/\s/g, ''))) {
			errors.push('Secondary phone must be 10-15 digits');
		}
		if (formData.emergency_phone && !/^[\d\-\+\(\)\s]{10,15}$/.test(formData.emergency_phone.replace(/\s/g, ''))) {
			errors.push('Emergency phone must be 10-15 digits');
		}

		// Zip code validation (if provided) - must be valid US format
		if (formData.zipcode && !/^\d{5}(-\d{4})?$/.test(formData.zipcode)) {
			errors.push('Zip code must be 5 digits or 5+4 format (e.g., 12345 or 12345-6789)');
		}

		// Date validation
		if (formData.dob) {
			const dobDate = new Date(formData.dob);
			const today = new Date();
			const minAge = new Date();
			minAge.setFullYear(today.getFullYear() - 100); // Max age 100
			
			if (isNaN(dobDate.getTime())) {
				errors.push('Invalid date of birth format');
			} else if (dobDate >= today) {
				errors.push('Date of birth must be in the past');
			} else if (dobDate < minAge) {
				errors.push('Date of birth cannot be more than 100 years ago');
			}
		}

		// Max riders validation (if provided) - must be reasonable number
		if (formData.max_riders) {
			const maxRiders = Number(formData.max_riders);
			if (isNaN(maxRiders) || maxRiders < 1 || maxRiders > 50) {
				errors.push('Max riders must be between 1 and 50');
			}
		}

		// Contact preference validation - must be valid enum value
		const validContactPrefs = ['phone', 'email', 'text', 'mail', 'none'];
		if (formData.contact_type_pref && !validContactPrefs.includes(formData.contact_type_pref.toLowerCase())) {
			errors.push('Contact preference must be one of: phone, email, text, mail, or none');
		}

		// Emergency relationship validation - must be valid enum value
		const validRelationships = ['spouse', 'parent', 'child', 'sibling', 'friend', 'other'];
		if (formData.emergency_reln && !validRelationships.includes(formData.emergency_reln.toLowerCase())) {
			errors.push('Emergency relationship must be one of: spouse, parent, child, sibling, friend, or other');
		}

		return errors;
	}

	// Open edit modal
	function openEditModal() {
		if (!profile) return;
		
		// Store original profile for cancel
		originalProfile = { ...profile };
		
		// Populate form data
		formData = {
			first_name: profile.first_name || '',
			last_name: profile.last_name || '',
			user_name: profile.user_name || '',
			dob: profile.dob || '',
			address: profile.address || '',
			address2: profile.address2 || '',
			city: profile.city || '',
			state: profile.state || '',
			zipcode: profile.zipcode?.toString() || '',
			primary_phone: profile.primary_phone || '',
			secondary_phone: profile.secondary_phone || '',
			primary_is_cell: profile.primary_is_cell || false,
			primary_can_text: profile.primary_can_text || false,
			secondary_is_cell: profile.secondary_is_cell || false,
			secondary_can_text: profile.secondary_can_text || false,
			contact_type_pref: profile.contact_type_pref || '',
			emergency_contact: profile.emergency_contact || '',
			emergency_reln: profile.emergency_reln || '',
			emergency_phone: profile.emergency_phone || '',
			max_riders: profile.max_riders?.toString() || '',
			destination_limitation: profile.destination_limitation || ''
		};
		
		showEditModal = true;
		editMessage = '';
	}

	// Close edit modal
	function closeEditModal() {
		showEditModal = false;
		// Restore original profile if it exists
		if (originalProfile) {
			profile = { ...originalProfile };
		}
	}

	// Show message
	function showMessage(message: string, success: boolean) {
		editMessage = message;
		editMessageSuccess = success;
		setTimeout(() => {
			editMessage = '';
		}, 5000);
	}

	// Save profile changes
	async function saveProfile(event: Event) {
		event.preventDefault();
		
		const validationErrors = validateForm();
		if (validationErrors.length > 0) {
			showMessage('Please fix the following errors:\n• ' + validationErrors.join('\n• '), false);
			return;
		}

		isSubmitting = true;
		try {
			console.log('💾 Saving profile changes...');

			// Prepare data for database
			const updateData: any = {
				first_name: formData.first_name.trim(),
				last_name: formData.last_name.trim(),
				user_name: formData.user_name.trim() || null,
				dob: formData.dob,
				address: formData.address.trim() || null,
				address2: formData.address2.trim() || null,
				city: formData.city.trim(),
				state: formData.state.trim(),
				zipcode: formData.zipcode ? parseInt(formData.zipcode) : null,
				primary_phone: formData.primary_phone.trim() || null,
				secondary_phone: formData.secondary_phone.trim() || null,
				primary_is_cell: formData.primary_phone ? formData.primary_is_cell : null,
				primary_can_text: formData.primary_phone ? formData.primary_can_text : null,
				secondary_is_cell: formData.secondary_phone ? formData.secondary_is_cell : null,
				secondary_can_text: formData.secondary_phone ? formData.secondary_can_text : null,
				contact_type_pref: formData.contact_type_pref.trim() || null,
				emergency_contact: formData.emergency_contact.trim() || null,
				emergency_reln: formData.emergency_reln.trim() || null,
				emergency_phone: formData.emergency_phone.trim() || null
			};

			if (formData.max_riders) {
				updateData.max_riders = parseInt(formData.max_riders);
			}
			
			updateData.destination_limitation = formData.destination_limitation.trim() || null;

			const { data, error: updateError } = await supabase
				.from('staff_profiles')
				.update(updateData)
				.eq('user_id', session.user.id)
				.select()
				.single();

			if (updateError) {
				console.error('❌ Error updating profile:', updateError);
				showMessage('Failed to update profile: ' + updateError.message, false);
				return;
			}

			console.log('✅ Profile updated successfully:', data);
			profile = data;
			showEditModal = false;
			showMessage('Profile updated successfully!');

		} catch (error) {
			console.error('❌ Exception updating profile:', error);
			showMessage('Failed to update profile: ' + (error as Error).message, false);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<RoleGuard requiredRoles={['Admin', 'Dispatcher', 'Driver', 'Volunteer', 'Super Admin']}>
	<div class="min-h-screen bg-gray-50">
		<Breadcrumbs />
		
		<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			<div class="mb-8 flex justify-between items-center">
				<div>
					<h1 class="text-3xl font-bold text-gray-900">Profile Information</h1>
					<p class="text-gray-600 mt-2">View your complete staff profile information.</p>
				</div>
				{#if profile}
					<button
						onclick={openEditModal}
						class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
					>
						<Edit class="w-4 h-4 mr-2" />
						Edit Profile
					</button>
				{/if}
			</div>
			
			<!-- Success/Error Messages -->
			{#if editMessage}
				<div class="mb-6">
					<div class="rounded-md p-4 {editMessageSuccess ? 'bg-green-50' : 'bg-red-50'} border {editMessageSuccess ? 'border-green-200' : 'border-red-200'}">
						<div class="flex">
							<div class="ml-3">
								<p class="text-sm font-medium {editMessageSuccess ? 'text-green-800' : 'text-red-800'}">
									{editMessage}
								</p>
							</div>
						</div>
					</div>
				</div>
			{/if}

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

	<!-- Edit Profile Modal -->
	{#if showEditModal && profile}
		<div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
			<div class="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
				<div class="mt-3">
					<div class="flex items-center justify-between mb-6">
						<h3 class="text-xl font-medium text-gray-900">Edit Profile Information</h3>
						<button onclick={closeEditModal} class="text-gray-400 hover:text-gray-600">
							<X class="w-5 h-5" />
						</button>
					</div>
					
					<form onsubmit={saveProfile} class="space-y-6">
						<!-- Personal Information -->
						<div>
							<h4 class="text-lg font-medium text-gray-900 mb-4">Personal Information</h4>
							<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
								<div>
									<label class="block text-sm font-medium text-gray-700">First Name *</label>
									<input
										type="text"
										bind:value={formData.first_name}
										required
										maxlength="50"
										class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
									/>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Last Name *</label>
									<input
										type="text"
										bind:value={formData.last_name}
										required
										maxlength="50"
										class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
									/>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Username</label>
									<input
										type="text"
										bind:value={formData.user_name}
										maxlength="50"
										class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
									/>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Date of Birth *</label>
									<input
										type="date"
										bind:value={formData.dob}
										required
										class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
									/>
								</div>
							</div>
						</div>

						<!-- Contact Information -->
						<div>
							<h4 class="text-lg font-medium text-gray-900 mb-4">Contact Information</h4>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label class="block text-sm font-medium text-gray-700">Primary Phone</label>
									<input
										type="tel"
										bind:value={formData.primary_phone}
										class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
									/>
									<div class="mt-2 flex space-x-4">
										<label class="flex items-center">
											<input type="checkbox" bind:checked={formData.primary_is_cell} class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
											<span class="ml-2 text-sm text-gray-700">Mobile</span>
										</label>
										<label class="flex items-center">
											<input type="checkbox" bind:checked={formData.primary_can_text} class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
											<span class="ml-2 text-sm text-gray-700">Can text</span>
										</label>
									</div>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Secondary Phone</label>
											<input
												type="tel"
												bind:value={formData.secondary_phone}
												class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
											/>
									<div class="mt-2 flex space-x-4">
										<label class="flex items-center">
											<input type="checkbox" bind:checked={formData.secondary_is_cell} class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
											<span class="ml-2 text-sm text-gray-700">Mobile</span>
										</label>
										<label class="flex items-center">
											<input type="checkbox" bind:checked={formData.secondary_can_text} class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
											<span class="ml-2 text-sm text-gray-700">Can text</span>
										</label>
									</div>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Contact Preference</label>
									<select
										bind:value={formData.contact_type_pref}
										class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
									>
										<option value="">Select preference</option>
										<option value="phone">Phone</option>
										<option value="email">Email</option>
										<option value="text">Text</option>
										<option value="mail">Mail</option>
										<option value="none">None</option>
									</select>
								</div>
							</div>
						</div>

						<!-- Address Information -->
						<div>
							<h4 class="text-lg font-medium text-gray-900 mb-4">Address Information</h4>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label class="block text-sm font-medium text-gray-700">Address</label>
									<input
										type="text"
										bind:value={formData.address}
										maxlength="100"
										class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
									/>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Address Line 2</label>
									<input
										type="text"
										bind:value={formData.address2}
										maxlength="100"
										class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
									/>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">City *</label>
									<input
										type="text"
										bind:value={formData.city}
										required
										maxlength="50"
										class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
									/>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">State *</label>
									<input
										type="text"
										bind:value={formData.state}
										required
										maxlength="2"
										placeholder="e.g., CA"
										class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
									/>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Zip Code</label>
									<input
										type="text"
										bind:value={formData.zipcode}
										pattern="\d{5}(-\d{4})?"
										placeholder="12345 or 12345-6789"
										class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
									/>
								</div>
							</div>
						</div>

						<!-- Emergency Contact -->
						<div>
							<h4 class="text-lg font-medium text-gray-900 mb-4">Emergency Contact</h4>
							<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div>
									<label class="block text-sm font-medium text-gray-700">Emergency Contact Name</label>
									<input
										type="text"
										bind:value={formData.emergency_contact}
										maxlength="50"
										class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
									/>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Relationship</label>
									<select
										bind:value={formData.emergency_reln}
										class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
									>
										<option value="">Select relationship</option>
										<option value="spouse">Spouse</option>
										<option value="parent">Parent</option>
										<option value="child">Child</option>
										<option value="sibling">Sibling</option>
										<option value="friend">Friend</option>
										<option value="other">Other</option>
									</select>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Emergency Phone</label>
									<input
										type="tel"
										bind:value={formData.emergency_phone}
										class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
									/>
								</div>
							</div>
						</div>

						<!-- Work Information -->
						<div>
							<h4 class="text-lg font-medium text-gray-900 mb-4">Work Information</h4>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label class="block text-sm font-medium text-gray-700">Max Riders</label>
									<input
										type="number"
										min="1"
										max="50"
										bind:value={formData.max_riders}
										placeholder="1-50"
										class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
									/>
								</div>
								<div class="md:col-span-2">
									<label class="block text-sm font-medium text-gray-700">Destination Limitations</label>
									<textarea
										bind:value={formData.destination_limitation}
										rows="3"
										maxlength="200"
										placeholder="Describe any destination limitations..."
										class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
									></textarea>
								</div>
							</div>
						</div>

						<div class="flex justify-end space-x-3 pt-4">
							<button
								type="button"
								onclick={closeEditModal}
								disabled={isSubmitting}
								class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={isSubmitting}
								class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
							>
								<Save class="w-4 h-4" />
								<span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	{/if}
</RoleGuard>