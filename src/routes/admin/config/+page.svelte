<script lang="ts">
	import RoleGuard from '$lib/components/RoleGuard.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import {
		Building2, Globe, Mail, Phone, MapPin,
		Clock, Link as LinkIcon, User, Users, Edit, Save, X, AlertTriangle
	} from '@lucide/svelte';
	import { getContext, onMount } from 'svelte';
	import { supabase } from '$lib/supabase';

	/** Session is provided from layout via setContext("session", ...) like your other pages */
	const session = getContext<any>('session');

	type OrgRow = Record<string, any> & { org_id: number };

	let isLoading = $state(true);
	let loadError = $state('');
	let org: OrgRow | null = $state(null);
	let originalOrg: OrgRow | null = $state(null);
	let orgId: number | null = $state(null);

	// Edit modal
	let showEditModal = $state(false);
	let isSaving = $state(false);

	// ---- Helpers (parsing / formatting) ----
	const dayMap: Record<string,string> = {
		Su: 'Sunday', Mo: 'Monday', Tu: 'Tuesday', We: 'Wednesday',
		Th: 'Thursday', Fr: 'Friday', Sa: 'Saturday'
	};
	function hhToLabel(hh: string) {
		const n = Number(hh);
		if (isNaN(n)) return hh;
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
			out.push({
				day: dayMap[d] ?? d,
				open: hhToLabel(start),
				close: hhToLabel(end)
			});
		}
		return out;
	}
	function usernameExample(code: string | null | undefined, first = 'John', last = 'Doe') {
		if (!code) return '';
		const c = code.toUpperCase();
		if (c === 'F1L') {
			const ex = `${(first[0] ?? '').toLowerCase()}${(last ?? '').toLowerCase()}`;
			return `Format “F1L”: first initial + last name. Example: ${first} ${last} → ${ex}`;
		}
		return `Format “${code}”.`;
	}

	// ---- Load data ----
	async function loadOrg() {
		try {
			isLoading = true;
			loadError = '';

			// get user id (context or auth)
			let uid: string | null = session?.user?.id ?? null;
			if (!uid) {
				const { data, error } = await supabase.auth.getUser();
				if (error) throw error;
				uid = data?.user?.id ?? null;
			}
			if (!uid) {
				loadError = 'No user session found.';
				return;
			}

			// find org_id from staff_profiles
			const { data: sp, error: spErr } = await supabase
				.from('staff_profiles')
				.select('org_id')
				.eq('user_id', uid)
				.single();

			if (spErr) throw spErr;
			if (!sp?.org_id) {
				loadError = 'Your staff profile is not linked to an organization.';
				return;
			}
			orgId = sp.org_id as number;

			// load organization row
			const { data: row, error: orgErr } = await supabase
				.from('organization')
				.select('*')
				.eq('org_id', orgId)
				.single();

			if (orgErr) throw orgErr;

			org = row as OrgRow;
			originalOrg = JSON.parse(JSON.stringify(row));
		} catch (e: any) {
			console.error('Load error:', e?.message ?? e);
			loadError = 'Failed to load organization: ' + (e?.message ?? 'Unknown error');
		} finally {
			isLoading = false;
		}
	}

	onMount(() => { void loadOrg(); });

	// ---- Edit modal form state ----
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
		// Contacts
		primary_contact_name: '',
		primary_contact_email: '',
		primary_contact_phone: '',
		primary_contact_address: '',
		primary_contact_address2: '',
		primary_contact_city: '',
		primary_contact_state: '',
		primary_contact_zipcode: '',
		secondary_contact_name: '',
		secondary_contact_email: '',
		secondary_contact_phone: '',
		secondary_contact_address: '',
		secondary_contact_address2: '',
		secondary_contact_city: '',
		secondary_contact_state: '',
		secondary_contact_zipcode: '',
		// Login / username
		username_format: '',
		user_initial_password: '',
		// Meta (read only in UI, not edited here)
		org_creation: '',
		first_ride_date: '',
		last_activity: ''
	});

	function openEdit() {
		if (!org) return;
		// map current org values into form (strings for inputs)
		for (const k in form) {
			const v = (org as any)[k];
			(form as any)[k] = v == null ? '' : String(v);
		}
		showEditModal = true;
	}

	function closeEdit() {
		showEditModal = false;
		// keep view unchanged
	}

	function emptyToNull(obj: Record<string, any>) {
		const out: Record<string, any> = {};
		for (const k in obj) out[k] = obj[k] === '' ? null : obj[k];
		return out;
	}

	function coerceNumbers(payload: Record<string, any>, keys: string[]) {
		for (const k of keys) {
			if (payload[k] === null || payload[k] === undefined || payload[k] === '') {
				payload[k] = null;
				continue;
			}
			const n = Number(payload[k]);
			payload[k] = isNaN(n) ? null : n;
		}
	}

	async function saveOrg(e: Event) {
		e.preventDefault();
		if (!org || !orgId) return;

		isSaving = true;
		try {
			const payload = emptyToNull({ ...form });
			// numeric fields
			coerceNumbers(payload, ['client_min_age', 'min_days_in_advance_for_ride_requests', 'primary_contact_zipcode', 'secondary_contact_zipcode']);

			// do not allow meta to overwrite if your schema manages them
			delete payload.org_creation;
			delete payload.first_ride_date;
			delete payload.last_activity;

			const { error } = await supabase
				.from('organization')
				.update(payload)
				.eq('org_id', orgId);

			if (error) throw error;

			// refresh
			await loadOrg();
			showEditModal = false;
		} catch (e: any) {
			console.error('Save error:', e?.message ?? e);
			alert('Failed to save organization: ' + (e?.message ?? 'Unknown error'));
		} finally {
			isSaving = false;
		}
	}
</script>

<RoleGuard requiredRoles={['Admin', 'Super Admin']}>
	<div class="min-h-screen bg-gray-50">
		<Breadcrumbs />

		<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			<!-- Header -->
			<div class="mb-8 flex justify-between items-center">
				<div class="flex items-center gap-3">
					<div class="p-2 bg-blue-100 rounded-lg">
						<Building2 class="w-6 h-6 text-blue-600" />
					</div>
					<div>
						<h1 class="text-3xl font-bold text-gray-900">Organization Settings</h1>
						<p class="text-gray-600 mt-1">View and manage your organization configuration.</p>
					</div>
				</div>

				{#if org}
					<button
						onclick={openEdit}
						class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
					>
						<Edit class="w-4 h-4 mr-2" />
						Edit Organization
					</button>
				{/if}
			</div>

			<!-- Loading / Error -->
			{#if isLoading}
				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
					<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
					<p class="mt-2 text-gray-500">Loading organization...</p>
				</div>
			{:else if loadError}
				<div class="bg-red-50 border border-red-200 rounded-lg p-6">
					<div class="flex">
						<AlertTriangle class="w-5 h-5 text-red-400 mr-3 mt-0.5" />
						<div>
							<h3 class="text-sm font-medium text-red-800">Error Loading Organization</h3>
							<p class="mt-1 text-sm text-red-700">{loadError}</p>
						</div>
					</div>
				</div>
			{:else if org}
				<div class="space-y-6">
					<!-- Overview -->
					<div class="bg-white rounded-lg shadow-sm border border-gray-200">
						<div class="px-6 py-4 border-b border-gray-200">
							<div class="flex items-center">
								<Globe class="w-5 h-5 text-blue-600 mr-2" />
								<h2 class="text-lg font-medium text-gray-900">Overview</h2>
							</div>
						</div>
						<div class="p-6">
							<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
								<div>
									<label class="block text-sm font-medium text-gray-700">Name</label>
									<p class="mt-1 text-gray-900">{org.name ?? '-'}</p>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Organization Status</label>
									<p class="mt-1 text-gray-900">
										<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {org.org_status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
											{org.org_status ?? '-'}
										</span>
									</p>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Website</label>
									<p class="mt-1 text-gray-900 flex items-center">
										<LinkIcon class="w-4 h-4 mr-1 text-gray-400" />
										{org.org_website ?? '-'}
									</p>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Email</label>
									<p class="mt-1 text-gray-900 flex items-center">
										<Mail class="w-4 h-4 mr-1 text-gray-400" />
										{org.org_email ?? '-'}
									</p>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Phone</label>
									<p class="mt-1 text-gray-900 flex items-center">
										<Phone class="w-4 h-4 mr-1 text-gray-400" />
										{org.org_phone ?? '-'}
									</p>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Org ID</label>
									<p class="mt-1 text-gray-900">{org.org_id}</p>
								</div>
							</div>
						</div>
					</div>

					<!-- Address -->
					<div class="bg-white rounded-lg shadow-sm border border-gray-200">
						<div class="px-6 py-4 border-b border-gray-200">
							<div class="flex items-center">
								<MapPin class="w-5 h-5 text-purple-600 mr-2" />
								<h2 class="text-lg font-medium text-gray-900">Address</h2>
							</div>
						</div>
						<div class="p-6">
							<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div>
									<label class="block text-sm font-medium text-gray-700">Street</label>
									<p class="mt-1 text-gray-900">{org.org_address ?? '-'}</p>
									{#if org.org_address2}
										<p class="mt-1 text-gray-900">{org.org_address2}</p>
									{/if}
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">City / State / Zip</label>
									<p class="mt-1 text-gray-900">
										{org.org_city ?? '-'}, {org.org_state ?? '-'} {org.org_zip_code ?? ''}
									</p>
								</div>
							</div>
						</div>
					</div>

					<!-- Operations -->
					<div class="bg-white rounded-lg shadow-sm border border-gray-200">
						<div class="px-6 py-4 border-b border-gray-200">
							<div class="flex items-center">
								<Clock class="w-5 h-5 text-indigo-600 mr-2" />
								<h2 class="text-lg font-medium text-gray-900">Operations</h2>
							</div>
						</div>
						<div class="p-6 space-y-6">
							<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div>
									<label class="block text-sm font-medium text-gray-700">Working Hours</label>
									{#if formatWorkingHours(org.working_hours).length}
										<div class="mt-2 rounded-md border border-gray-200">
											<table class="w-full text-sm">
												<thead class="bg-gray-50">
													<tr>
														<th class="text-left px-3 py-2 text-gray-500">Day</th>
														<th class="text-left px-3 py-2 text-gray-500">Open</th>
														<th class="text-left px-3 py-2 text-gray-500">Close</th>
													</tr>
												</thead>
												<tbody>
													{#each formatWorkingHours(org.working_hours) as row}
														<tr class="odd:bg-white even:bg-gray-50">
															<td class="px-3 py-2">{row.day}</td>
															<td class="px-3 py-2">{row.open}</td>
															<td class="px-3 py-2">{row.close}</td>
														</tr>
													{/each}
												</tbody>
											</table>
										</div>
									{:else}
										<p class="mt-1 text-gray-900">-</p>
									{/if}
									<p class="mt-2 text-xs text-gray-500">Short form example: <code>Su07-18, Mo08-17</code></p>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Days Off</label>
									<p class="mt-1 text-gray-900">{org.days_off ?? '-'}</p>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Rides Phone</label>
									<p class="mt-1 text-gray-900">{org.rides_phone_number ?? '-'}</p>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Client Minimum Age</label>
									<p class="mt-1 text-gray-900">{org.client_min_age ?? '-'}</p>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Min Days in Advance</label>
									<p class="mt-1 text-gray-900">{org.min_days_in_advance_for_ride_requests ?? '-'}</p>
								</div>
							</div>
						</div>
					</div>

					<!-- Primary Contact -->
					<div class="bg-white rounded-lg shadow-sm border border-gray-200">
						<div class="px-6 py-4 border-b border-gray-200">
							<div class="flex items-center">
								<User class="w-5 h-5 text-emerald-600 mr-2" />
								<h2 class="text-lg font-medium text-gray-900">Primary Contact</h2>
							</div>
						</div>
						<div class="p-6">
							<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div>
									<label class="block text-sm font-medium text-gray-700">Name</label>
									<p class="mt-1 text-gray-900">{org.primary_contact_name ?? '-'}</p>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Email</label>
									<p class="mt-1 text-gray-900">{org.primary_contact_email ?? '-'}</p>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Phone</label>
									<p class="mt-1 text-gray-900">{org.primary_contact_phone ?? '-'}</p>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Address</label>
									<p class="mt-1 text-gray-900">
										{org.primary_contact_address ?? '-'}{org.primary_contact_address2 ? `, ${org.primary_contact_address2}` : ''}
									</p>
									<p class="mt-1 text-gray-900">
										{org.primary_contact_city ?? ''}{org.primary_contact_city ? ', ' : ''}{org.primary_contact_state ?? ''} {org.primary_contact_zipcode ?? ''}
									</p>
								</div>
							</div>
						</div>
					</div>

					<!-- Secondary Contact -->
					<div class="bg-white rounded-lg shadow-sm border border-gray-200">
						<div class="px-6 py-4 border-b border-gray-200">
							<div class="flex items-center">
								<Users class="w-5 h-5 text-sky-600 mr-2" />
								<h2 class="text-lg font-medium text-gray-900">Secondary Contact</h2>
							</div>
						</div>
						<div class="p-6">
							<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div>
									<label class="block text-sm font-medium text-gray-700">Name</label>
									<p class="mt-1 text-gray-900">{org.secondary_contact_name ?? '-'}</p>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Email</label>
									<p class="mt-1 text-gray-900">{org.secondary_contact_email ?? '-'}</p>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Phone</label>
									<p class="mt-1 text-gray-900">{org.secondary_contact_phone ?? '-'}</p>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Address</label>
									<p class="mt-1 text-gray-900">
										{org.secondary_contact_address ?? '-'}{org.secondary_contact_address2 ? `, ${org.secondary_contact_address2}` : ''}
									</p>
									<p class="mt-1 text-gray-900">
										{org.secondary_contact_city ?? ''}{org.secondary_contact_city ? ', ' : ''}{org.secondary_contact_state ?? ''} {org.secondary_contact_zipcode ?? ''}
									</p>
								</div>
							</div>
						</div>
					</div>

					<!-- Login / Username -->
					<div class="bg-white rounded-lg shadow-sm border border-gray-200">
						<div class="px-6 py-4 border-b border-gray-200">
							<div class="flex items-center">
								<User class="w-5 h-5 text-amber-600 mr-2" />
								<h2 class="text-lg font-medium text-gray-900">Login & Username</h2>
							</div>
						</div>
						<div class="p-6">
							<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div>
									<label class="block text-sm font-medium text-gray-700">Username Format</label>
									<p class="mt-1 text-gray-900">{org.username_format ?? '-'}</p>
									<p class="text-xs text-gray-500 mt-1">{usernameExample(org.username_format, 'John', 'Doe')}</p>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Initial Password</label>
									<p class="mt-1 text-gray-900">{org.user_initial_password ?? '-'}</p>
								</div>
							</div>
						</div>
					</div>

					<!-- Meta -->
					<div class="bg-white rounded-lg shadow-sm border border-gray-200">
						<div class="px-6 py-4 border-b border-gray-200">
							<div class="flex items-center">
								<Clock class="w-5 h-5 text-gray-600 mr-2" />
								<h2 class="text-lg font-medium text-gray-900">Meta</h2>
							</div>
						</div>
						<div class="p-6">
							<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
								<div>
									<label class="block text-sm font-medium text-gray-700">Created</label>
									<p class="mt-1 text-gray-900">{org.org_creation ?? '-'}</p>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">First Ride Date</label>
									<p class="mt-1 text-gray-900">{org.first_ride_date ?? '-'}</p>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Last Activity</label>
									<p class="mt-1 text-gray-900">{org.last_activity ?? '-'}</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			{:else}
				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
					<Building2 class="w-16 h-16 text-gray-400 mx-auto mb-4" />
					<h3 class="text-lg font-medium text-gray-900 mb-2">No Organization Found</h3>
					<p class="text-gray-500">We couldn’t find your organization record.</p>
				</div>
			{/if}
		</div>
	</div>

	<!-- Edit Organization Modal -->
	{#if showEditModal}
		<div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
			<div class="relative top-12 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
				<div class="mt-1">
					<div class="flex items-center justify-between mb-6">
						<h3 class="text-xl font-medium text-gray-900">Edit Organization</h3>
						<button onclick={closeEdit} class="text-gray-400 hover:text-gray-600">
							<X class="w-5 h-5" />
						</button>
					</div>

					<form onsubmit={saveOrg} class="space-y-8">
						<!-- Overview -->
						<div>
							<h4 class="text-lg font-medium text-gray-900 mb-3">Overview</h4>
							<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
								<div>
									<label class="block text-sm font-medium text-gray-700">Name</label>
									<input type="text" bind:value={form.name} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" />
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Organization Status</label>
									<select bind:value={form.org_status} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2">
										<option value="">—</option>
										<option value="Active">Active</option>
										<option value="Inactive">Inactive</option>
									</select>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Website</label>
									<input type="text" bind:value={form.org_website} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" />
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Email</label>
									<input type="email" bind:value={form.org_email} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" />
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Phone</label>
									<input type="tel" bind:value={form.org_phone} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" />
								</div>
							</div>
						</div>

						<!-- Address -->
						<div>
							<h4 class="text-lg font-medium text-gray-900 mb-3">Address</h4>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label class="block text-sm font-medium text-gray-700">Street</label>
									<input type="text" bind:value={form.org_address} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" />
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Street 2</label>
									<input type="text" bind:value={form.org_address2} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" />
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">City</label>
									<input type="text" bind:value={form.org_city} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" />
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">State</label>
									<input type="text" maxlength="2" bind:value={form.org_state} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" />
								</div>
								<div>
                                    <label class="block text-sm font-medium text-gray-700">Zip Code</label>
									<input type="text" bind:value={form.org_zip_code} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" />
								</div>
							</div>
						</div>

						<!-- Operations -->
						<div>
							<h4 class="text-lg font-medium text-gray-900 mb-3">Operations</h4>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div class="md:col-span-2">
									<label class="block text-sm font-medium text-gray-700">Working Hours (short form)</label>
									<textarea rows="3" bind:value={form.working_hours} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"></textarea>
									<p class="mt-1 text-xs text-gray-500">Example: <code>Su07-18, Mo08-17</code></p>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Days Off</label>
									<input type="text" bind:value={form.days_off} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" />
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Rides Phone</label>
									<input type="tel" bind:value={form.rides_phone_number} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" />
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Client Minimum Age</label>
									<input type="number" bind:value={form.client_min_age} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" />
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Min Days in Advance</label>
									<input type="number" bind:value={form.min_days_in_advance_for_ride_requests} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" />
								</div>
							</div>
						</div>

						<!-- Primary Contact -->
						<div>
							<h4 class="text-lg font-medium text-gray-900 mb-3">Primary Contact</h4>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div><label class="block text-sm font-medium text-gray-700">Name</label><input type="text" bind:value={form.primary_contact_name} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" /></div>
								<div><label class="block text-sm font-medium text-gray-700">Email</label><input type="email" bind:value={form.primary_contact_email} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" /></div>
								<div><label class="block text-sm font-medium text-gray-700">Phone</label><input type="tel" bind:value={form.primary_contact_phone} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" /></div>
								<div><label class="block text-sm font-medium text-gray-700">Address</label><input type="text" bind:value={form.primary_contact_address} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" /></div>
								<div><label class="block text-sm font-medium text-gray-700">Address 2</label><input type="text" bind:value={form.primary_contact_address2} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" /></div>
								<div><label class="block text-sm font-medium text-gray-700">City</label><input type="text" bind:value={form.primary_contact_city} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" /></div>
								<div><label class="block text-sm font-medium text-gray-700">State</label><input type="text" maxlength="2" bind:value={form.primary_contact_state} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" /></div>
								<div><label class="block text-sm font-medium text-gray-700">Zip</label><input type="text" bind:value={form.primary_contact_zipcode} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" /></div>
							</div>
						</div>

						<!-- Secondary Contact -->
						<div>
							<h4 class="text-lg font-medium text-gray-900 mb-3">Secondary Contact</h4>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div><label class="block text-sm font-medium text-gray-700">Name</label><input type="text" bind:value={form.secondary_contact_name} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" /></div>
								<div><label class="block text-sm font-medium text-gray-700">Email</label><input type="email" bind:value={form.secondary_contact_email} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" /></div>
								<div><label class="block text-sm font-medium text-gray-700">Phone</label><input type="tel" bind:value={form.secondary_contact_phone} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" /></div>
								<div><label class="block text-sm font-medium text-gray-700">Address</label><input type="text" bind:value={form.secondary_contact_address} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" /></div>
								<div><label class="block text-sm font-medium text-gray-700">Address 2</label><input type="text" bind:value={form.secondary_contact_address2} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" /></div>
								<div><label class="block text-sm font-medium text-gray-700">City</label><input type="text" bind:value={form.secondary_contact_city} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" /></div>
								<div><label class="block text-sm font-medium text-gray-700">State</label><input type="text" maxlength="2" bind:value={form.secondary_contact_state} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" /></div>
								<div><label class="block text-sm font-medium text-gray-700">Zip</label><input type="text" bind:value={form.secondary_contact_zipcode} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" /></div>
							</div>
						</div>

						<!-- Login / Username -->
						<div>
							<h4 class="text-lg font-medium text-gray-900 mb-3">Login & Username</h4>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label class="block text-sm font-medium text-gray-700">Username Format</label>
									<input type="text" bind:value={form.username_format} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" />
									<p class="mt-1 text-xs text-gray-500">{usernameExample(form.username_format, 'John', 'Doe')}</p>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Initial Password</label>
									<input type="text" bind:value={form.user_initial_password} class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" />
								</div>
							</div>
						</div>

						<div class="flex justify-end gap-3 pt-2">
							<button type="button" onclick={closeEdit} class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
							<button type="submit" disabled={isSaving} class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60 inline-flex items-center gap-2">
								<Save class="w-4 h-4" />
								<span>{isSaving ? 'Saving…' : 'Save Changes'}</span>
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	{/if}
</RoleGuard>
