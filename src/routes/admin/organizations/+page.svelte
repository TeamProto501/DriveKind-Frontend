<script lang="ts">
	import { Building2, Plus, Search, Edit, Trash2, Save, X, Mail, Phone, MapPin, Link as LinkIcon, Globe, User, Users, Clock, AlertTriangle } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';

	/** Organization row: keep loose to tolerate schema breadth */
	type OrgRow = Record<string, any> & { org_id: number; name: string };

	// State
	let organizations: OrgRow[] = [];
	let filteredOrganizations: OrgRow[] = [];
	let isLoading = $state(true);
	let searchTerm = $state('');
	let showAddModal = $state(false);
	let showEditModal = $state(false);
	let showDeleteModal = $state(false);
	let showPasswordModal = $state(false);
	let selectedOrg: OrgRow | null = null;
	let editingOrg: OrgRow | null = null;
	let editMessage = $state('');
	let editMessageSuccess = $state(false);
	let passwordInput = $state('');
	let passwordError = $state('');

	// -------- Helpers (shared with config page style) --------
	const dayMap: Record<string,string> = {
		Su: 'Sunday', Mo: 'Monday', Tu: 'Tuesday', We: 'Wednesday',
		Th: 'Thursday', Fr: 'Friday', Sa: 'Saturday'
	};
	function hhToLabel(hh: string) {
		const n = Number(hh); if (isNaN(n)) return hh;
		const ampm = n < 12 ? 'AM' : 'PM';
		const hour12 = ((n + 11) % 12) + 1;
		return `${hour12}:00 ${ampm}`;
	}
	function formatWorkingHours(str?: string | null) {
		if (!str) return [] as { day: string, open: string, close: string }[];
		const tokens = String(str).split(',').map(s => s.trim()).filter(Boolean);
		const out: { day: string, open: string, close: string }[] = [];
		for (const t of tokens) {
			const m = t.match(/^([A-Z][a-z])(\d{2})-(\d{2})$/);
			if (!m) continue;
			const [, d, start, end] = m;
			out.push({ day: dayMap[d] ?? d, open: hhToLabel(start), close: hhToLabel(end) });
		}
		return out;
	}
	const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
	function ordinal(n: number) {
		const s = ['th','st','nd','rd']; const v = n % 100;
		return n + (s[(v - 20) % 10] || s[v] || s[0]);
	}
	function formatDaysOff(str?: string | null): string[] {
		if (!str) return [];
		return String(str).split(',').map(s => s.trim()).filter(Boolean).map(tok => {
			const m = tok.match(/^(\d{1,2})\/(\d{1,2})$/);
			if (!m) return '';
			const mm = Math.max(1, Math.min(12, parseInt(m[1], 10)));
			const dd = Math.max(1, Math.min(31, parseInt(m[2], 10)));
			return `${MONTHS[mm - 1]} ${ordinal(dd)}`;
		}).filter(Boolean);
	}
	function usernameExample(code: string | null | undefined, first = 'John', last = 'Doe') {
		if (!code) return '';
		const c = String(code).toUpperCase().trim();
		if (c === 'F1L') {
			const ex = `${(first[0] ?? '').toLowerCase()}${(last ?? '').toLowerCase()}`;
			return `Format “F1L”: first initial + last name. Example: ${first} ${last} → ${ex}`;
		}
		const m = c.match(/^F(\d+)L(\d+)$/);
		if (m) {
			const n = parseInt(m[1], 10);
			const k = parseInt(m[2], 10);
			const firstPart = (first ?? '').slice(0, Math.max(0, n));
			const lastPart = (last ?? '').slice(0, Math.max(0, k)).toLowerCase();
			const ex = `${firstPart}${lastPart}`;
			return `Format “F${n}L${k}”: first ${n} of first + first ${k} of last. Example: ${first} ${last} → ${ex}`;
		}
		return '';
	}

	// -------- Form model (mirrors config page) --------
	let form = $state({
		// Overview
		name: '',
		org_status: '',
		org_email: '',
		org_phone: '',
		org_website: '',
		// Address
		org_address: '',
		org_address2: '',
		org_city: '',
		org_state: '',
		org_zip_code: '',
		// Operations
		working_hours: '',
		days_off: '',
		rides_phone_number: '',
		client_min_age: '',
		min_days_in_advance_for_ride_requests: '',
		// Contacts (no phone fields)
		primary_contact_name: '',
		primary_contact_email: '',
		primary_contact_address: '',
		primary_contact_address2: '',
		primary_contact_city: '',
		primary_contact_state: '',
		primary_contact_zipcode: '',
		secondary_contact_name: '',
		secondary_contact_email: '',
		secondary_contact_address: '',
		secondary_contact_address2: '',
		secondary_contact_city: '',
		secondary_contact_state: '',
		secondary_contact_zipcode: '',
		// Login / username
		username_format: '',
		user_initial_password: '',
		// Meta (read only, never write)
		org_creation_date: '',
		first_ride_date: '',
		last_activity_in_portal: ''
	});
	const OPTIONAL_KEYS = new Set<string>([
		'days_off','org_address2','first_ride_date','last_activity_in_portal',
		'primary_contact_address2',
		'secondary_contact_name','secondary_contact_email','secondary_contact_address',
		'secondary_contact_address2','secondary_contact_city','secondary_contact_state','secondary_contact_zipcode'
	]);
	function isRequired(key: string) { return !OPTIONAL_KEYS.has(key); }
	const FIELD_LABELS: Record<string,string> = {
		name:'Name', org_status:'Organization Status', org_email:'Organization Email', org_phone:'Organization Phone', org_website:'Website',
		org_address:'Street', org_address2:'Street 2', org_city:'City', org_state:'State', org_zip_code:'Zip Code',
		working_hours:'Working Hours', days_off:'Days Off', rides_phone_number:'Rides Phone',
		client_min_age:'Client Minimum Age', min_days_in_advance_for_ride_requests:'Min Days in Advance',
		primary_contact_name:'Primary Contact Name', primary_contact_email:'Primary Contact Email',
		primary_contact_address:'Primary Contact Address', primary_contact_address2:'Primary Contact Address 2',
		primary_contact_city:'Primary Contact City', primary_contact_state:'Primary Contact State', primary_contact_zipcode:'Primary Contact Zip',
		secondary_contact_name:'Secondary Contact Name', secondary_contact_email:'Secondary Contact Email',
		secondary_contact_address:'Secondary Contact Address', secondary_contact_address2:'Secondary Contact Address 2',
		secondary_contact_city:'Secondary Contact City', secondary_contact_state:'Secondary Contact State', secondary_contact_zipcode:'Secondary Contact Zip',
		username_format:'Username Format', user_initial_password:'Initial Password'
	};
	let fieldErrors = $state<Record<string,string>>({});
	function validateRequired(): string[] {
		fieldErrors = {};
		const missing: string[] = [];
		for (const key of Object.keys(form)) {
			if (!isRequired(key)) continue;
			if (key === 'org_creation_date' || key === 'first_ride_date' || key === 'last_activity_in_portal') continue;
			const val = (form as any)[key];
			const empty = val == null || String(val).trim() === '';
			if (empty) { missing.push(key); fieldErrors[key] = 'Required'; }
		}
		return missing;
	}
	function labelWithRequired(label: string, key: string) {
		return isRequired(key) ? `${label} *` : label;
	}
	function emptyToNull(obj: Record<string, any>) {
		const out: Record<string, any> = {};
		for (const k in obj) out[k] = obj[k] === '' ? null : obj[k];
		return out;
	}
	function coerceNumbers(payload: Record<string, any>, keys: string[]) {
		for (const k of keys) {
			if (payload[k] === null || payload[k] === undefined || payload[k] === '') { payload[k] = null; continue; }
			const n = Number(payload[k]); payload[k] = isNaN(n) ? null : n;
		}
	}

	// -------- Data load / refresh --------
	onMount(async () => {
		await loadOrganizations();
		if (filteredOrganizations.length === 0 && organizations.length > 0) {
			filteredOrganizations = organizations;
		}
	});
	async function loadOrganizations() {
		try {
			isLoading = true;
			const { data, error } = await supabase.from('organization').select('*').order('name');
			if (error) { showEditMessage('Failed to load organizations: ' + error.message, false); return; }
			organizations = data || [];
			applyFilter();
		} catch (e: any) {
			showEditMessage('Failed to load organizations: ' + (e?.message ?? 'Unknown error'), false);
		} finally { isLoading = false; }
	}
	async function refreshOrganizations() {
		try {
			isLoading = true;
			const { data, error } = await supabase.from('organization').select('*').order('name');
			if (error) { showEditMessage('Failed to refresh organizations: ' + error.message, false); return; }
			organizations = data || [];
			applyFilter();
		} catch (e: any) {
			showEditMessage('Failed to refresh organizations: ' + (e?.message ?? 'Unknown error'), false);
		} finally { isLoading = false; }
	}

	// -------- Search --------
	function applyFilter() {
		if (!searchTerm.trim()) {
			filteredOrganizations = organizations;
		} else {
			const q = searchTerm.toLowerCase();
			filteredOrganizations = organizations.filter(org =>
				(org.name ?? '').toLowerCase().includes(q) ||
				(org.org_email ?? '').toLowerCase().includes(q) ||
				(org.org_city ?? '').toLowerCase().includes(q) ||
				(org.org_state ?? '').toLowerCase().includes(q)
			);
		}
	}
	$effect(() => { if (organizations) applyFilter(); });

	// -------- Toasts --------
	function showEditMessage(message: string, success: boolean) {
		editMessage = message;
		editMessageSuccess = success;
		setTimeout(() => { editMessage = ''; }, 5000);
	}

	// -------- Modals open/close --------
	function openAddModal() {
		// reset form
		for (const k of Object.keys(form)) (form as any)[k] = '';
		fieldErrors = {};
		showAddModal = true;
	}
	function openEditModal(org: OrgRow) {
		editingOrg = org;
		for (const k of Object.keys(form)) {
			let v = (org as any)[k];
			if (k === 'days_off' && (v == null || v === '')) v = (org as any)['days-off'];
			(form as any)[k] = v == null ? '' : String(v);
		}
		// derive org_status from org_status_enum/status
		const rawStatus = (org.org_status ?? org.org_status_enum ?? org.status ?? '') as string;
		const s = String(rawStatus).trim().toLowerCase();
		form.org_status = s === 'active' ? 'Active' : s === 'inactive' ? 'Inactive' : 'Inactive';
		fieldErrors = {};
		showEditModal = true;
	}
	function openDeleteModal(org: OrgRow) {
		selectedOrg = org; showDeleteModal = true;
	}
	function openPasswordModal() {
		passwordInput = ''; passwordError = ''; showDeleteModal = false; showPasswordModal = true;
	}
	function closeModals() {
		showAddModal = false; showEditModal = false; showDeleteModal = false; showPasswordModal = false;
		selectedOrg = null; editingOrg = null; passwordInput = ''; passwordError = '';
	}

	// -------- Create / Update / Delete --------
	async function addOrganization(e: Event) {
		e.preventDefault();
		const missing = validateRequired();
		if (missing.length) {
			const names = missing.map(k => FIELD_LABELS[k] ?? k).join(', ');
			showEditMessage(`Please fill in the required field(s): ${names}.`, false);
			return;
		}
		try {
			const payload: Record<string, any> = emptyToNull({ ...form });
			coerceNumbers(payload, ['client_min_age','min_days_in_advance_for_ride_requests']);
			// map form -> DB
			if ('days_off' in payload) { payload['days-off'] = payload.days_off; delete payload.days_off; }
			if ('org_status' in payload) { payload.org_status_enum = payload.org_status; delete payload.org_status; }
			// drop meta (not set on insert)
			delete payload.org_creation_date; delete payload.first_ride_date; delete payload.last_activity_in_portal;

			const { data, error } = await supabase.from('organization').insert([payload]).select().single();
			if (error) { showEditMessage('Failed to add organization: ' + error.message, false); return; }

			showEditMessage('Organization added successfully!', true);
			closeModals();
			await refreshOrganizations();
		} catch (e: any) {
			showEditMessage('Failed to add organization: ' + (e?.message ?? 'Unknown error'), false);
		}
	}
	async function updateOrganization(e: Event) {
		e.preventDefault();
		if (!editingOrg) return;
		const missing = validateRequired();
		if (missing.length) {
			const names = missing.map(k => FIELD_LABELS[k] ?? k).join(', ');
			showEditMessage(`Please fill in the required field(s): ${names}.`, false);
			return;
		}
		try {
			const payload: Record<string, any> = emptyToNull({ ...form });
			coerceNumbers(payload, ['client_min_age','min_days_in_advance_for_ride_requests']);
			if ('days_off' in payload) { payload['days-off'] = payload.days_off; delete payload.days_off; }
			if ('org_status' in payload) { payload.org_status_enum = payload.org_status; delete payload.org_status; }
			delete payload.org_creation_date; delete payload.first_ride_date; delete payload.last_activity_in_portal;

			const { data, error } = await supabase
				.from('organization')
				.update(payload)
				.eq('org_id', editingOrg.org_id)
				.select()
				.single();

			if (error) { showEditMessage('Failed to update organization: ' + error.message, false); return; }

			showEditMessage('Organization updated successfully!', true);
			closeModals();
			await refreshOrganizations();
		} catch (e: any) {
			showEditMessage('Failed to update organization: ' + (e?.message ?? 'Unknown error'), false);
		}
	}
	async function deleteOrganization() {
		if (!selectedOrg) return;
		try {
			const { error } = await supabase.from('organization').delete().eq('org_id', selectedOrg.org_id);
			if (error) { showEditMessage('Failed to delete organization: ' + error.message, false); return; }
			showEditMessage('Organization deleted successfully!', true);
			closeModals();
			await refreshOrganizations();
		} catch (e: any) {
			showEditMessage('Failed to delete organization: ' + (e?.message ?? 'Unknown error'), false);
		}
	}
	async function confirmDeleteWithPassword() {
		if (!passwordInput.trim()) { passwordError = 'Please enter your password to confirm deletion.'; return; }
		try {
			passwordError = '';
			const { data: { user } } = await supabase.auth.getUser();
			if (!user?.email) { passwordError = 'Unable to verify user identity.'; return; }
			const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: passwordInput });
			if (signInError) { passwordError = 'Invalid password. Please try again.'; return; }
			await deleteOrganization();
		} catch (e) {
			passwordError = 'Error verifying password. Please try again.';
		}
	}
</script>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<div class="bg-white shadow-sm border-b border-gray-200">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
			<div class="flex items-center justify-between">
				<div class="flex items-center space-x-3">
					<div class="p-2 bg-blue-100 rounded-lg">
						<Building2 class="w-6 h-6 text-blue-600" />
					</div>
					<div>
						<h1 class="text-2xl font-bold text-gray-900">Organizations Management</h1>
						<p class="text-sm text-gray-600">Manage organizations in the database</p>
					</div>
				</div>
				<button onclick={openAddModal} class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
					<Plus class="w-4 h-4 mr-2" />
					Add Organization
				</button>
			</div>
		</div>
	</div>

	<!-- Success/Error Messages -->
	{#if editMessage}
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
			<div class="rounded-md p-4 {editMessageSuccess ? 'bg-green-50' : 'bg-red-50'} border {editMessageSuccess ? 'border-green-200' : 'border-red-200'}">
				<p class="text-sm font-medium {editMessageSuccess ? 'text-green-800' : 'text-red-800'}">
					{editMessage}
				</p>
			</div>
		</div>
	{/if}

	<!-- Main Content -->
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
		<!-- Search -->
		<div class="mb-6">
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
				<div class="flex items-center space-x-4">
					<div class="flex-1 max-w-md">
						<div class="relative">
							<Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
							<input
								type="text"
								placeholder="Search organizations..."
								bind:value={searchTerm}
								oninput={applyFilter}
								class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							/>
						</div>
					</div>
					<div class="text-sm text-gray-500">
						{filteredOrganizations.length} organization{filteredOrganizations.length !== 1 ? 's' : ''} found
					</div>
				</div>
			</div>
		</div>

		<!-- Table -->
		<div class="bg-white rounded-lg shadow-sm border border-gray-200">
			{#if isLoading}
				<div class="p-8 text-center">
					<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
					<p class="mt-2 text-gray-500">Loading organizations...</p>
				</div>
			{:else if filteredOrganizations.length === 0}
				<div class="p-8 text-center">
					<Building2 class="w-16 h-16 text-gray-400 mx-auto mb-4" />
					<h3 class="text-lg font-medium text-gray-900 mb-2">
						{searchTerm ? 'No organizations found' : 'No organizations yet'}
					</h3>
					<p class="text-gray-500 mb-4">
						{searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first organization.'}
					</p>
					{#if !searchTerm}
						<button onclick={openAddModal} class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
							<Plus class="w-4 h-4 mr-2" /> Add First Organization
						</button>
					{/if}
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-gray-200">
						<thead class="bg-gray-50">
							<tr>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organization</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
							</tr>
						</thead>
						<tbody class="bg-white divide-y divide-gray-200">
							{#each filteredOrganizations as org}
								<tr class="hover:bg-gray-50">
									<td class="px-6 py-4 whitespace-nowrap">
										<div class="space-y-0.5">
											<div class="text-sm font-medium text-gray-900 flex items-center gap-2">
												{#if org.org_website}
													<a
														href={/^https?:\/\//.test(org.org_website) ? org.org_website : `https://${org.org_website}`}
														class="text-blue-600 hover:underline inline-flex items-center gap-1"
														target="_blank" rel="noopener noreferrer">
														<LinkIcon class="w-4 h-4 text-gray-400" /> {org.name}
													</a>
												{:else}
													<span>{org.name}</span>
												{/if}
											</div>
											<div class="text-xs text-gray-500">ID: {org.org_id}</div>
										</div>
									</td>

									<td class="px-6 py-4 whitespace-nowrap">
										<div class="space-y-1">
											<div class="text-sm text-gray-900 flex items-center">
												<Mail class="w-4 h-4 mr-1 text-gray-400" />
												{org.org_email ?? '-'}
											</div>
											<div class="text-sm text-gray-900 flex items-center">
												<Phone class="w-4 h-4 mr-1 text-gray-400" />
												{org.org_phone ?? '-'}
											</div>
										</div>
									</td>

									<td class="px-6 py-4 whitespace-nowrap">
										<div class="text-sm text-gray-900 flex items-start">
											<MapPin class="w-4 h-4 mr-1 mt-0.5 text-gray-400" />
											<div>
												<div>{org.org_city ?? '-'}, {org.org_state ?? '-'}</div>
												<div class="text-gray-500">{org.org_zip_code ?? ''}</div>
											</div>
										</div>
									</td>

									<td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
										<div class="flex space-x-2">
											<button onclick={() => openEditModal(org)} class="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
												<Edit class="w-4 h-4 mr-1" /> Edit
											</button>
											<button onclick={() => openDeleteModal(org)} class="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
												<Trash2 class="w-4 h-4 mr-1" /> Delete
											</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	</div>

	<!-- Delete Confirmation Modal -->
	{#if showDeleteModal && selectedOrg}
		<div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
			<div class="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
				<div class="mt-3">
					<div class="flex items-center justify-between mb-4">
					            <h3 class="text-lg font-medium text-gray-900">Delete Organization</h3>
						<button onclick={closeModals} class="text-gray-400 hover:text-gray-600">
							<X class="w-5 h-5" />
						</button>
					</div>
					<div class="mb-6">
						<p class="text-sm text-gray-600">
							Are you sure you want to delete <strong>{selectedOrg.name}</strong>? This action cannot be undone.
						</p>
					</div>
					<div class="flex justify-end space-x-3">
						<button onclick={closeModals} class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
						<button onclick={openPasswordModal} class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center space-x-2">
							<Trash2 class="w-4 h-4" /><span>Yes, Delete</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Password Confirmation Modal -->
	{#if showPasswordModal && selectedOrg}
		<div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
			<div class="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
				<div class="mt-3">
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-lg font-medium text-gray-900">Confirm Deletion</h3>
						<button onclick={closeModals} class="text-gray-400 hover:text-gray-600"><X class="w-5 h-5" /></button>
					</div>
					<div class="mb-6">
						<p class="text-sm text-gray-600 mb-4">
							To delete <strong>{selectedOrg.name}</strong>, please enter your password to confirm this action.
						</p>
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">Password</label>
							<input type="password" bind:value={passwordInput} placeholder="Enter your password" class="w-full px-3 py-2 border {passwordError ? 'border-red-300' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" />
							{#if passwordError}<p class="mt-2 text-sm text-red-600">{passwordError}</p>{/if}
						</div>
					</div>
					<div class="flex justify-end space-x-3">
						<button onclick={closeModals} class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
						<button onclick={confirmDeleteWithPassword} class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center space-x-2">
							<Trash2 class="w-4 h-4" /><span>Delete Organization</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Add Organization Modal (full configuration form) -->
	{#if showAddModal}
		<div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
			<div class="relative top-12 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
				<div class="mt-1">
					<div class="flex items-center justify-between mb-2">
						<h3 class="text-xl font-medium text-gray-900">Add Organization</h3>
						<button onclick={closeModals} class="text-gray-400 hover:text-gray-600"><X class="w-5 h-5" /></button>
					</div>
					<p class="text-sm text-gray-500 mb-6"><span class="text-red-600">*</span> indicates required fields.</p>

					<form onsubmit={addOrganization} class="space-y-8">
						<!-- Overview -->
						<div>
							<h4 class="text-lg font-medium text-gray-900 mb-3">Overview</h4>
							<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
								<div><label class="block text-sm font-medium text-gray-700">{labelWithRequired('Name','name')}</label><input type="text" bind:value={form.name} required class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.name ? 'border-red-500' : 'border-gray-300')} /></div>
								<div><label class="block text-sm font-medium text-gray-700">{labelWithRequired('Organization Status','org_status')}</label><select bind:value={form.org_status} required class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.org_status ? 'border-red-500' : 'border-gray-300')}><option value="">—</option><option value="Active">Active</option><option value="Inactive">Inactive</option></select></div>
								<div><label class="block text-sm font-medium text-gray-700">{labelWithRequired('Website','org_website')}</label><input type="text" bind:value={form.org_website} required class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.org_website ? 'border-red-500' : 'border-gray-300')} /></div>
								<div><label class="block text-sm font-medium text-gray-700">{labelWithRequired('Organization Email','org_email')}</label><input type="email" bind:value={form.org_email} required class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.org_email ? 'border-red-500' : 'border-gray-300')} /></div>
								<div><label class="block text-sm font-medium text-gray-700">{labelWithRequired('Organization Phone','org_phone')}</label><input type="tel" bind:value={form.org_phone} required class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.org_phone ? 'border-red-500' : 'border-gray-300')} /></div>
							</div>
						</div>

						<!-- Address -->
						<div>
							<h4 class="text-lg font-medium text-gray-900 mb-3">Address</h4>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div><label class="block text-sm font-medium text-gray-700">{labelWithRequired('Street','org_address')}</label><input type="text" bind:value={form.org_address} required class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.org_address ? 'border-red-500' : 'border-gray-300')} /></div>
								<div><label class="block text-sm font-medium text-gray-700">{labelWithRequired('Street 2','org_address2')}</label><input type="text" bind:value={form.org_address2} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" /></div>
								<div><label class="block text-sm font-medium text-gray-700">{labelWithRequired('City','org_city')}</label><input type="text" bind:value={form.org_city} required class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.org_city ? 'border-red-500' : 'border-gray-300')} /></div>
								<div><label class="block text-sm font-medium text-gray-700">{labelWithRequired('State','org_state')}</label><input type="text" maxlength="2" bind:value={form.org_state} required class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.org_state ? 'border-red-500' : 'border-gray-300')} /></div>
								<div><label class="block text-sm font-medium text-gray-700">{labelWithRequired('Zip Code','org_zip_code')}</label><input type="text" bind:value={form.org_zip_code} required class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.org_zip_code ? 'border-red-500' : 'border-gray-300')} /></div>
							</div>
						</div>

						<!-- Operations -->
						<div>
							<h4 class="text-lg font-medium text-gray-900 mb-3">Operations</h4>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div class="md:col-span-2">
									<label class="block text-sm font-medium text-gray-700">{labelWithRequired('Working Hours (short form)','working_hours')}</label>
									<textarea rows="3" bind:value={form.working_hours} required class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.working_hours ? 'border-red-500' : 'border-gray-300')}></textarea>
									<p class="mt-1 text-xs text-gray-500">Example: <code>Su07-18, Mo08-17</code></p>
								</div>
								<div><label class="block text-sm font-medium text-gray-700">{labelWithRequired('Days Off','days_off')}</label><input type="text" bind:value={form.days_off} placeholder="MM/DD, MM/DD" class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" /></div>
								<div><label class="block text-sm font-medium text-gray-700">{labelWithRequired('Rides Phone','rides_phone_number')}</label><input type="tel" bind:value={form.rides_phone_number} required class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.rides_phone_number ? 'border-red-500' : 'border-gray-300')} /></div>
								<div><label class="block text-sm font-medium text-gray-700">{labelWithRequired('Client Minimum Age','client_min_age')}</label><input type="number" bind:value={form.client_min_age} required class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.client_min_age ? 'border-red-500' : 'border-gray-300')} /></div>
								<div><label class="block text-sm font-medium text-gray-700">{labelWithRequired('Min Days in Advance','min_days_in_advance_for_ride_requests')}</label><input type="number" bind:value={form.min_days_in_advance_for_ride_requests} required class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.min_days_in_advance_for_ride_requests ? 'border-red-500' : 'border-gray-300')} /></div>
							</div>
						</div>

						<!-- Primary Contact -->
						<div>
							<h4 class="text-lg font-medium text-gray-900 mb-3">Primary Contact</h4>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div><label class="block text-sm font-medium text-gray-700">{labelWithRequired('Name','primary_contact_name')}</label><input type="text" bind:value={form.primary_contact_name} required class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.primary_contact_name ? 'border-red-500' : 'border-gray-300')} /></div>
								<div><label class="block text-sm font-medium text-gray-700">{labelWithRequired('Email','primary_contact_email')}</label><input type="email" bind:value={form.primary_contact_email} required class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.primary_contact_email ? 'border-red-500' : 'border-gray-300')} /></div>
								<div class="md:col-span-2"><label class="block text-sm font-medium text-gray-700">{labelWithRequired('Address','primary_contact_address')}</label><input type="text" bind:value={form.primary_contact_address} required class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.primary_contact_address ? 'border-red-500' : 'border-gray-300')} /></div>
								<div class="md:col-span-2"><label class="block text-sm font-medium text-gray-700">{labelWithRequired('Address 2','primary_contact_address2')}</label><input type="text" bind:value={form.primary_contact_address2} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" /></div>
								<div><label class="block text-sm font-medium text-gray-700">{labelWithRequired('City','primary_contact_city')}</label><input type="text" bind:value={form.primary_contact_city} required class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.primary_contact_city ? 'border-red-500' : 'border-gray-300')} /></div>
								<div><label class="block text-sm font-medium text-gray-700">{labelWithRequired('State','primary_contact_state')}</label><input type="text" maxlength="2" bind:value={form.primary_contact_state} required class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.primary_contact_state ? 'border-red-500' : 'border-gray-300')} /></div>
								<div><label class="block text-sm font-medium text-gray-700">{labelWithRequired('Zip','primary_contact_zipcode')}</label><input type="text" bind:value={form.primary_contact_zipcode} required class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.primary_contact_zipcode ? 'border-red-500' : 'border-gray-300')} /></div>
							</div>
						</div>

						<!-- Secondary Contact (all optional) -->
						<div>
							<h4 class="text-lg font-medium text-gray-900 mb-3">Secondary Contact</h4>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div><label class="block text-sm font-medium text-gray-700">{labelWithRequired('Name','secondary_contact_name')}</label><input type="text" bind:value={form.secondary_contact_name} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" /></div>
								<div><label class="block text-sm font-medium text-gray-700">{labelWithRequired('Email','secondary_contact_email')}</label><input type="email" bind:value={form.secondary_contact_email} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" /></div>
								<div class="md:col-span-2"><label class="block text-sm font-medium text-gray-700">{labelWithRequired('Address','secondary_contact_address')}</label><input type="text" bind:value={form.secondary_contact_address} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" /></div>
								<div class="md:col-span-2"><label class="block text-sm font-medium text-gray-700">{labelWithRequired('Address 2','secondary_contact_address2')}</label><input type="text" bind:value={form.secondary_contact_address2} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" /></div>
								<div><label class="block text-sm font-medium text-gray-700">{labelWithRequired('City','secondary_contact_city')}</label><input type="text" bind:value={form.secondary_contact_city} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" /></div>
								<div><label class="block text-sm font-medium text-gray-700">{labelWithRequired('State','secondary_contact_state')}</label><input type="text" maxlength="2" bind:value={form.secondary_contact_state} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" /></div>
								<div><label class="block text-sm font-medium text-gray-700">{labelWithRequired('Zip','secondary_contact_zipcode')}</label><input type="text" bind:value={form.secondary_contact_zipcode} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" /></div>
							</div>
						</div>

						<!-- Login / Username -->
						<div>
							<h4 class="text-lg font-medium text-gray-900 mb-3">Login & Username</h4>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label class="block text-sm font-medium text-gray-700">{labelWithRequired('Username Format','username_format')}</label>
									<input type="text" bind:value={form.username_format} required class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.username_format ? 'border-red-500' : 'border-gray-300')} />
									<p class="mt-1 text-xs text-gray-500">{usernameExample(form.username_format, 'John', 'Doe')}</p>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">{labelWithRequired('Initial Password','user_initial_password')}</label>
									<input type="text" bind:value={form.user_initial_password} required class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.user_initial_password ? 'border-red-500' : 'border-gray-300')} />
								</div>
							</div>
						</div>

						<div class="flex justify-end gap-3 pt-2">
							<button type="button" onclick={closeModals} class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
							<button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center gap-2">
								<Save class="w-4 h-4" /><span>Add Organization</span>
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	{/if}

	<!-- Edit Organization Modal (full configuration form) -->
	{#if showEditModal}
		<div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
			<div class="relative top-12 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
				<div class="mt-1">
					<div class="flex items-center justify-between mb-2">
						<h3 class="text-xl font-medium text-gray-900">Edit Organization</h3>
						<button onclick={closeModals} class="text-gray-400 hover:text-gray-600"><X class="w-5 h-5" /></button>
					</div>
					<p class="text-sm text-gray-500 mb-6"><span class="text-red-600">*</span> indicates required fields.</p>

					<form onsubmit={updateOrganization} class="space-y-8">
						<!-- Reuse the exact same form markup as in Add modal -->
						<!-- Overview -->
						<div>
							<h4 class="text-lg font-medium text-gray-900 mb-3">Overview</h4>
							<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
								<div><label class="block text-sm font-medium text-gray-700">{labelWithRequired('Name','name')}</label><input type="text" bind:value={form.name} required class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.name ? 'border-red-500' : 'border-gray-300')} /></div>
								<div><label class="block text-sm font-medium text-gray-700">{labelWithRequired('Organization Status','org_status')}</label><select bind:value={form.org_status} required class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.org_status ? 'border-red-500' : 'border-gray-300')}><option value="">—</option><option value="Active">Active</option><option value="Inactive">Inactive</option></select></div>
								<div><label class="block text-sm font-medium text-gray-700">{labelWithRequired('Website','org_website')}</label><input type="text" bind:value={form.org_website} required class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.org_website ? 'border-red-500' : 'border-gray-300')} /></div>
								<div><label class="block text-sm font-medium text-gray-700">{labelWithRequired('Organization Email','org_email')}</label><input type="email" bind:value={form.org_email} required class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.org_email ? 'border-red-500' : 'border-gray-300')} /></div>
								<div><label class="block text-sm font-medium text-gray-700">{labelWithRequired('Organization Phone','org_phone')}</label><input type="tel" bind:value={form.org_phone} required class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.org_phone ? 'border-red-500' : 'border-gray-300')} /></div>
							</div>
						</div>

						<!-- Address -->
						<div>
							<h4 class="text-lg font-medium text-gray-900 mb-3">Address</h4>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div><label class="block text-sm font-medium text-gray-700">{labelWithRequired('Street','org_address')}</label><input type="text" bind:value={form.org_address} required class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.org_address ? 'border-red-500' : 'border-gray-300')} /></div>
								<div><label class="block text-sm font-medium text-gray-700">{labelWithRequired('Street 2','org_address2')}</label><input type="text" bind:value={form.org_address2} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" /></div>
								<div><label class="block text-sm font-medium text-gray-700">{labelWithRequired('City','org_city')}</label><input type="text" bind:value={form.org_city} required class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.org_city ? 'border-red-500' : 'border-gray-300')} /></div>
								<div><label class="block text-sm font-medium text-gray-700">{labelWithRequired('State','org_state')}</label><input type="text" maxlength="2" bind:value={form.org_state} required class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.org_state ? 'border-red-500' : 'border-gray-300')} /></div>
								<div><label class="block text-sm font-medium text-gray-700">{labelWithRequired('Zip Code','org_zip_code')}</label><input type="text" bind:value={form.org_zip_code} required class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.org_zip_code ? 'border-red-500' : 'border-gray-300')} /></div>
							</div>
						</div>

						<!-- Operations -->
						<div>
							<h4 class="text-lg font-medium text-gray-900 mb-3">Operations</h4>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div class="md:col-span-2">
									<label class="block text-sm font-medium text-gray-700">{labelWithRequired('Working Hours (short form)','working_hours')}</label>
									<textarea rows="3" bind:value={form.working_hours} required class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.working_hours ? 'border-red-500' : 'border-gray-300')}></textarea>
									<p class="mt-1 text-xs text-gray-500">Example: <code>Su07-18, Mo08-17</code></p>
								</div>
								<div><label class="block text-sm font-medium text-gray-700">{labelWithRequired('Days Off','days_off')}</label><input type="text" bind:value={form.days_off} placeholder="MM/DD, MM/DD" class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" /></div>
								<div><label class="block text-sm font-medium text-gray-700">{labelWithRequired('Rides Phone','rides_phone_number')}</label><input type="tel" bind:value={form.rides_phone_number} required class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.rides_phone_number ? 'border-red-500' : 'border-gray-300')} /></div>
								<div><label class="block text-sm font-medium text-gray-700">{labelWithRequired('Client Minimum Age','client_min_age')}</label><input type="number" bind:value={form.client_min_age} required class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.client_min_age ? 'border-red-500' : 'border-gray-300')} /></div>
								<div><label class="block text-sm font-medium text-gray-700">{labelWithRequired('Min Days in Advance','min_days_in_advance_for_ride_requests')}</label><input type="number" bind:value={form.min_days_in_advance_for_ride_requests} required class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.min_days_in_advance_for_ride_requests ? 'border-red-500' : 'border-gray-300')} /></div>
							</div>
						</div>

						<!-- Primary Contact -->
						<div>
							<h4 class="text-lg font-medium text-gray-900 mb-3">Primary Contact</h4>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div><label class="block text-sm font-medium text-gray-700">{labelWithRequired('Name','primary_contact_name')}</label><input type="text" bind:value={form.primary_contact_name} required class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.primary_contact_name ? 'border-red-500' : 'border-gray-300')} /></div>
								<div><label class="block text-sm font-medium text-gray-700">{labelWithRequired('Email','primary_contact_email')}</label><input type="email" bind:value={form.primary_contact_email} required class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.primary_contact_email ? 'border-red-500' : 'border-gray-300')} /></div>
								<div class="md:col-span-2"><label class="block text-sm font-medium text-gray-700">{labelWithRequired('Address','primary_contact_address')}</label><input type="text" bind:value={form.primary_contact_address} required class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.primary_contact_address ? 'border-red-500' : 'border-gray-300')} /></div>
								<div class="md:col-span-2"><label class="block text-sm font-medium text-gray-700">{labelWithRequired('Address 2','primary_contact_address2')}</label><input type="text" bind:value={form.primary_contact_address2} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" /></div>
								<div><label class="block text-sm font-medium text-gray-700">{labelWithRequired('City','primary_contact_city')}</label><input type="text" bind:value={form.primary_contact_city} required class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.primary_contact_city ? 'border-red-500' : 'border-gray-300')} /></div>
								<div><label class="block text-sm font-medium text-gray-700">{labelWithRequired('State','primary_contact_state')}</label><input type="text" maxlength="2" bind:value={form.primary_contact_state} required class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.primary_contact_state ? 'border-red-500' : 'border-gray-300')} /></div>
								<div><label class="block text-sm font-medium text-gray-700">{labelWithRequired('Zip','primary_contact_zipcode')}</label><input type="text" bind:value={form.primary_contact_zipcode} required class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.primary_contact_zipcode ? 'border-red-500' : 'border-gray-300')} /></div>
							</div>
						</div>

						<!-- Secondary Contact -->
						<div>
							<h4 class="text-lg font-medium text-gray-900 mb-3">Secondary Contact</h4>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div><label class="block text-sm font-medium text-gray-700">{labelWithRequired('Name','secondary_contact_name')}</label><input type="text" bind:value={form.secondary_contact_name} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" /></div>
								<div><label class="block text-sm font-medium text-gray-700">{labelWithRequired('Email','secondary_contact_email')}</label><input type="email" bind:value={form.secondary_contact_email} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" /></div>
								<div class="md:col-span-2"><label class="block text-sm font-medium text-gray-700">{labelWithRequired('Address','secondary_contact_address')}</label><input type="text" bind:value={form.secondary_contact_address} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" /></div>
								<div class="md:col-span-2"><label class="block text-sm font-medium text-gray-700">{labelWithRequired('Address 2','secondary_contact_address2')}</label><input type="text" bind:value={form.secondary_contact_address2} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" /></div>
								<div><label class="block text-sm font-medium text-gray-700">{labelWithRequired('City','secondary_contact_city')}</label><input type="text" bind:value={form.secondary_contact_city} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" /></div>
								<div><label class="block text-sm font-medium text-gray-700">{labelWithRequired('State','secondary_contact_state')}</label><input type="text" maxlength="2" bind:value={form.secondary_contact_state} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" /></div>
								<div><label class="block text-sm font-medium text-gray-700">{labelWithRequired('Zip','secondary_contact_zipcode')}</label><input type="text" bind:value={form.secondary_contact_zipcode} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" /></div>
							</div>
						</div>

						<!-- Login / Username -->
						<div>
							<h4 class="text-lg font-medium text-gray-900 mb-3">Login & Username</h4>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label class="block text-sm font-medium text-gray-700">{labelWithRequired('Username Format','username_format')}</label>
									<input type="text" bind:value={form.username_format} required class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.username_format ? 'border-red-500' : 'border-gray-300')} />
									<p class="mt-1 text-xs text-gray-500">{usernameExample(form.username_format, 'John', 'Doe')}</p>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">{labelWithRequired('Initial Password','user_initial_password')}</label>
									<input type="text" bind:value={form.user_initial_password} required class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.user_initial_password ? 'border-red-500' : 'border-gray-300')} />
								</div>
							</div>
						</div>

						<div class="flex justify-end gap-3 pt-2">
							<button type="button" onclick={closeModals} class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
							<button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center gap-2">
								<Save class="w-4 h-4" /><span>Save Changes</span>
							</button>
						</div>
					</form>

				</div>
			</div>
		</div>
	{/if}
</div>