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

	// Days Off helpers
	const MONTHS = [
		'January','February','March','April','May','June',
		'July','August','September','October','November','December'
	];
	function ordinal(n: number) {
		const s = ['th', 'st', 'nd', 'rd'];
		const v = n % 100;
		return n + (s[(v - 20) % 10] || s[v] || s[0]);
	}
	/** Accepts "7/14, 12/25" -> ["July 14th","December 25th"] */
	function formatDaysOff(str?: string | null): string[] {
		if (!str) return [];
		return String(str)
			.split(',')
			.map(s => s.trim())
			.filter(Boolean)
			.map(tok => {
				const m = tok.match(/^(\d{1,2})\/(\d{1,2})$/);
				if (!m) return '';
				const mm = Math.max(1, Math.min(12, parseInt(m[1], 10)));
				const dd = Math.max(1, Math.min(31, parseInt(m[2], 10)));
				return `${MONTHS[mm - 1]} ${ordinal(dd)}`;
			})
			.filter(Boolean);
	}

	/**
	 * Username hint generator.
	 * Supports:
	 * - "F1L" => first initial + full last (lowercased) e.g., John Doe -> "jdoe"
	 * - "F{n}L{m}" => first n chars of first (original casing) + first m chars of last (lowercased)
	 *   e.g., F2L3 for John Doe -> "Jodoe"
	 */
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

	// ---- Derived via state+effect (TS-safe in runes mode) ----
	type HoursRow = { day: string; open: string; close: string };
	let workingHoursRows = $state<HoursRow[]>([]);
	let daysOffList = $state<string[]>([]);
	let statusLabel = $state<'Active' | 'Inactive'>('Inactive');
	let statusPillClasses = $state('bg-red-100 text-red-800'); // default red (inactive)

	$effect(() => {
		workingHoursRows = org ? formatWorkingHours(org.working_hours) : [];
		// Days Off: support snake_case or hyphenated column name
		const rawDays = (org && (org.days_off ?? org['days-off'])) as string | null | undefined;
		daysOffList = formatDaysOff(rawDays);

		// Status: accept org_status, org_status_enum, status (robust + trim + case-insensitive)
		const rawStatus =
			(org && (org.org_status ?? org.org_status_enum ?? org.status)) ?? '';
		const s = String(rawStatus).trim().toLowerCase();
		statusLabel = s === 'active' ? 'Active' : s === 'inactive' ? 'Inactive' : 'Inactive';
		statusPillClasses =
			statusLabel === 'Active'
				? 'bg-green-100 text-green-800'
				: 'bg-red-100 text-red-800';
	});

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
		// Meta (read only)
		org_creation_date: '',
		first_ride_date: '',
		last_activity_in_portal: ''
	});

	// ---- Required fields logic ----
	// User said NOT required: "days-off", org_address2, first_ride_date, last_activity_in_portal,
	// primary_contact_address2, and ALL secondary_contact* fields. Everything else required.
	const OPTIONAL_KEYS = new Set<string>([
		'days_off',               // maps to DB "days-off"
		'org_address2',
		'first_ride_date',
		'last_activity_in_portal',
		'primary_contact_address2',
		'secondary_contact_name',
		'secondary_contact_email',
		'secondary_contact_address',
		'secondary_contact_address2',
		'secondary_contact_city',
		'secondary_contact_state',
		'secondary_contact_zipcode'
	]);
	function isRequired(key: string) { return !OPTIONAL_KEYS.has(key); }

	// Human labels for popup
	const FIELD_LABELS: Record<string,string> = {
		name: 'Name',
		org_status: 'Organization Status',
		org_email: 'Organization Email',
		org_phone: 'Organization Phone',
		org_website: 'Website',
		org_address: 'Street',
		org_address2: 'Street 2',
		org_city: 'City',
		org_state: 'State',
		org_zip_code: 'Zip Code',
		working_hours: 'Working Hours',
		days_off: 'Days Off',
		rides_phone_number: 'Rides Phone',
		client_min_age: 'Client Minimum Age',
		min_days_in_advance_for_ride_requests: 'Min Days in Advance',
		primary_contact_name: 'Primary Contact Name',
		primary_contact_email: 'Primary Contact Email',
		primary_contact_address: 'Primary Contact Address',
		primary_contact_address2: 'Primary Contact Address 2',
		primary_contact_city: 'Primary Contact City',
		primary_contact_state: 'Primary Contact State',
		primary_contact_zipcode: 'Primary Contact Zip',
		secondary_contact_name: 'Secondary Contact Name',
		secondary_contact_email: 'Secondary Contact Email',
		secondary_contact_address: 'Secondary Contact Address',
		secondary_contact_address2: 'Secondary Contact Address 2',
		secondary_contact_city: 'Secondary Contact City',
		secondary_contact_state: 'Secondary Contact State',
		secondary_contact_zipcode: 'Secondary Contact Zip',
		username_format: 'Username Format',
		user_initial_password: 'Initial Password'
	};

	let fieldErrors = $state<Record<string, string>>({});

	function validateRequired(): string[] {
		fieldErrors = {};
		const missing: string[] = [];
		for (const key of Object.keys(form)) {
			if (!isRequired(key)) continue;
			// ignore meta fields (they're not edited)
			if (key === 'org_creation_date' || key === 'first_ride_date' || key === 'last_activity_in_portal') continue;

			const val = (form as any)[key];
			const empty = val == null || String(val).trim() === '';
			if (empty) {
				missing.push(key);
				fieldErrors[key] = 'Required';
			}
		}
		return missing;
	}

	function labelWithRequired(label: string, key: string) {
		return isRequired(key) ? `${label} *` : label;
	}

	function openEdit() {
		if (!org) return;

		for (const k of Object.keys(form)) {
			let v = (org as any)[k];
			// special-case: DB uses "days-off"
			if (k === 'days_off' && (v == null || v === '')) {
				v = (org as any)['days-off'];
			}
			(form as any)[k] = v == null ? '' : String(v);
		}

		// Ensure status default matches current DB value
		const rawStatus =
			((org as any).org_status ??
			(org as any).org_status_enum ??
			(org as any).status ??
			'') as string;

		const s = String(rawStatus).trim().toLowerCase();
		form.org_status = s === 'active' ? 'Active' : s === 'inactive' ? 'Inactive' : 'Inactive';

		fieldErrors = {};
		showEditModal = true;
	}

	function closeEdit() {
		showEditModal = false;
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

		// Client-side required validation
		const missing = validateRequired();
		if (missing.length) {
			const names = missing.map(k => FIELD_LABELS[k] ?? k).join(', ');
			alert(`Please fill in the required field(s): ${names}.`);
			return;
		}

		isSaving = true;
		try {
			const payload: Record<string, any> = emptyToNull({ ...form });

			// numeric fields (ZIPs remain strings)
			coerceNumbers(payload, ['client_min_age', 'min_days_in_advance_for_ride_requests']);

			// map "days_off" (form) to DB column "days-off"
			if ('days_off' in payload) {
				payload['days-off'] = payload.days_off;
				delete payload.days_off;
			}

			// map org_status (form) to org_status_enum (DB)
			if ('org_status' in payload) {
				payload.org_status_enum = payload.org_status; // 'Active' | 'Inactive'
				delete payload.org_status;
			}

			// do not allow meta to overwrite
			delete payload.org_creation_date;
			delete payload.first_ride_date;
			delete payload.last_activity_in_portal;

			const { error } = await supabase
				.from('organization')
				.update(payload)
				.eq('org_id', orgId);

			if (error) throw error;

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
						on:click={openEdit}
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
										<span class={"inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium " + statusPillClasses}>
											{statusLabel}
										</span>
									</p>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Website</label>
									{#if org.org_website}
										<a
											href={/^https?:\/\//.test(org.org_website) ? org.org_website : `https://${org.org_website}`}
											class="mt-1 text-blue-600 hover:underline flex items-center"
											target="_blank" rel="noopener noreferrer"
										>
											<LinkIcon class="w-4 h-4 mr-1 text-gray-400" />
											{org.org_website}
										</a>
									{:else}
										<p class="mt-1 text-gray-900">-</p>
									{/if}
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
									{#if workingHoursRows.length}
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
													{#each workingHoursRows as row}
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

								<!-- Days Off rendered as a list of month+ordinal -->
								<div>
									<label class="block text-sm font-medium text-gray-700">Days Off</label>
									{#if daysOffList.length}
										<ul class="mt-1 text-gray-900 list-disc list-inside space-y-0.5">
											{#each daysOffList as d}
												<li>{d}</li>
											{/each}
										</ul>
									{:else}
										<p class="mt-1 text-gray-900">-</p>
									{/if}
									<p class="mt-2 text-xs text-gray-500">Format: <code>MM/DD, MM/DD</code></p>
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

					<!-- Primary Contact (no phone) -->
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
								<div class="md:col-span-2">
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

					<!-- Secondary Contact (no phone) -->
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
								<div class="md:col-span-2">
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
									<p class="mt-1 text-gray-900">{org.org_creation_date ?? '-'}</p>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">First Ride Date</label>
									<p class="mt-1 text-gray-900">{org.first_ride_date ?? '-'}</p>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">Last Activity</label>
									<p class="mt-1 text-gray-900">{org.last_activity_in_portal ?? '-'}</p>
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
					<div class="flex items-center justify-between mb-2">
						<h3 class="text-xl font-medium text-gray-900">Edit Organization</h3>
						<button on:click={closeEdit} class="text-gray-400 hover:text-gray-600">
							<X class="w-5 h-5" />
						</button>
					</div>

					<!-- Required hint -->
					<p class="text-sm text-gray-500 mb-6">
						<span class="text-red-600">*</span> indicates required fields.
					</p>

					<form on:submit={saveOrg} class="space-y-8">
						<!-- Overview -->
						<div>
							<h4 class="text-lg font-medium text-gray-900 mb-3">Overview</h4>
							<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
								<div>
									<label class="block text-sm font-medium text-gray-700">
										{labelWithRequired('Name','name')}
									</label>
									<input
										type="text" bind:value={form.name} required
										class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.name ? 'border-red-500' : 'border-gray-300')}
										aria-invalid={!!fieldErrors.name} aria-describedby="err-name" />
									{#if fieldErrors.name}<p id="err-name" class="text-xs text-red-600 mt-1">{fieldErrors.name}</p>{/if}
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">
										{labelWithRequired('Organization Status','org_status')}
									</label>
									<select
										bind:value={form.org_status} required
										class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.org_status ? 'border-red-500' : 'border-gray-300')}
										aria-invalid={!!fieldErrors.org_status} aria-describedby="err-status">
										<option value="">—</option>
										<option value="Active">Active</option>
										<option value="Inactive">Inactive</option>
									</select>
									{#if fieldErrors.org_status}<p id="err-status" class="text-xs text-red-600 mt-1">{fieldErrors.org_status}</p>{/if}
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">
										{labelWithRequired('Website','org_website')}
									</label>
									<input type="text" bind:value={form.org_website} required
										class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.org_website ? 'border-red-500' : 'border-gray-300')}
										aria-invalid={!!fieldErrors.org_website} />
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">
										{labelWithRequired('Organization Email','org_email')}
									</label>
									<input type="email" bind:value={form.org_email} required
										class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.org_email ? 'border-red-500' : 'border-gray-300')}
										aria-invalid={!!fieldErrors.org_email} />
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">
										{labelWithRequired('Organization Phone','org_phone')}
									</label>
									<input type="tel" bind:value={form.org_phone} required
										class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.org_phone ? 'border-red-500' : 'border-gray-300')}
										aria-invalid={!!fieldErrors.org_phone} />
								</div>
							</div>
						</div>

						<!-- Address -->
						<div>
							<h4 class="text-lg font-medium text-gray-900 mb-3">Address</h4>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label class="block text-sm font-medium text-gray-700">
										{labelWithRequired('Street','org_address')}
									</label>
									<input type="text" bind:value={form.org_address} required
										class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.org_address ? 'border-red-500' : 'border-gray-300')}
										aria-invalid={!!fieldErrors.org_address} />
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">
										{labelWithRequired('Street 2','org_address2')}
									</label>
									<input type="text" bind:value={form.org_address2}
										class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" />
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">
										{labelWithRequired('City','org_city')}
									</label>
									<input type="text" bind:value={form.org_city} required
										class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.org_city ? 'border-red-500' : 'border-gray-300')}
										aria-invalid={!!fieldErrors.org_city} />
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">
										{labelWithRequired('State','org_state')}
									</label>
									<input type="text" maxlength="2" bind:value={form.org_state} required
										class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.org_state ? 'border-red-500' : 'border-gray-300')}
										aria-invalid={!!fieldErrors.org_state} />
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">
										{labelWithRequired('Zip Code','org_zip_code')}
									</label>
									<input type="text" bind:value={form.org_zip_code} required
										class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.org_zip_code ? 'border-red-500' : 'border-gray-300')}
										aria-invalid={!!fieldErrors.org_zip_code} />
								</div>
							</div>
						</div>

						<!-- Operations -->
						<div>
							<h4 class="text-lg font-medium text-gray-900 mb-3">Operations</h4>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div class="md:col-span-2">
									<label class="block text-sm font-medium text-gray-700">
										{labelWithRequired('Working Hours (short form)','working_hours')}
									</label>
									<textarea rows="3" bind:value={form.working_hours} required
										class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.working_hours ? 'border-red-500' : 'border-gray-300')}
										aria-invalid={!!fieldErrors.working_hours}></textarea>
									<p class="mt-1 text-xs text-gray-500">Example: <code>Su07-18, Mo08-17</code></p>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">
										{labelWithRequired('Days Off','days_off')}
									</label>
									<input type="text" bind:value={form.days_off} placeholder="MM/DD, MM/DD"
										class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" />
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">
										{labelWithRequired('Rides Phone','rides_phone_number')}
									</label>
									<input type="tel" bind:value={form.rides_phone_number} required
										class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.rides_phone_number ? 'border-red-500' : 'border-gray-300')}
										aria-invalid={!!fieldErrors.rides_phone_number} />
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">
										{labelWithRequired('Client Minimum Age','client_min_age')}
									</label>
									<input type="number" bind:value={form.client_min_age} required
										class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.client_min_age ? 'border-red-500' : 'border-gray-300')}
										aria-invalid={!!fieldErrors.client_min_age} />
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">
										{labelWithRequired('Min Days in Advance','min_days_in_advance_for_ride_requests')}
									</label>
									<input type="number" bind:value={form.min_days_in_advance_for_ride_requests} required
										class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.min_days_in_advance_for_ride_requests ? 'border-red-500' : 'border-gray-300')}
										aria-invalid={!!fieldErrors.min_days_in_advance_for_ride_requests} />
								</div>
							</div>
						</div>

						<!-- Primary Contact (no phone) -->
						<div>
							<h4 class="text-lg font-medium text-gray-900 mb-3">Primary Contact</h4>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label class="block text-sm font-medium text-gray-700">
										{labelWithRequired('Name','primary_contact_name')}
									</label>
									<input type="text" bind:value={form.primary_contact_name} required
										class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.primary_contact_name ? 'border-red-500' : 'border-gray-300')}
										aria-invalid={!!fieldErrors.primary_contact_name} />
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">
										{labelWithRequired('Email','primary_contact_email')}
									</label>
									<input type="email" bind:value={form.primary_contact_email} required
										class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.primary_contact_email ? 'border-red-500' : 'border-gray-300')}
										aria-invalid={!!fieldErrors.primary_contact_email} />
								</div>
								<div class="md:col-span-2">
									<label class="block text-sm font-medium text-gray-700">
										{labelWithRequired('Address','primary_contact_address')}
									</label>
									<input type="text" bind:value={form.primary_contact_address} required
										class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.primary_contact_address ? 'border-red-500' : 'border-gray-300')}
										aria-invalid={!!fieldErrors.primary_contact_address} />
								</div>
								<div class="md:col-span-2">
									<label class="block text-sm font-medium text-gray-700">
										{labelWithRequired('Address 2','primary_contact_address2')}
									</label>
									<input type="text" bind:value={form.primary_contact_address2}
										class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" />
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">
										{labelWithRequired('City','primary_contact_city')}
									</label>
									<input type="text" bind:value={form.primary_contact_city} required
										class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.primary_contact_city ? 'border-red-500' : 'border-gray-300')}
										aria-invalid={!!fieldErrors.primary_contact_city} />
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">
										{labelWithRequired('State','primary_contact_state')}
									</label>
									<input type="text" maxlength="2" bind:value={form.primary_contact_state} required
										class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.primary_contact_state ? 'border-red-500' : 'border-gray-300')}
										aria-invalid={!!fieldErrors.primary_contact_state} />
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">
										{labelWithRequired('Zip','primary_contact_zipcode')}
									</label>
									<input type="text" bind:value={form.primary_contact_zipcode} required
										class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.primary_contact_zipcode ? 'border-red-500' : 'border-gray-300')}
										aria-invalid={!!fieldErrors.primary_contact_zipcode} />
								</div>
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
									<label class="block text-sm font-medium text-gray-700">
										{labelWithRequired('Username Format','username_format')}
									</label>
									<input type="text" bind:value={form.username_format} required
										class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.username_format ? 'border-red-500' : 'border-gray-300')}
										aria-invalid={!!fieldErrors.username_format} />
									<p class="mt-1 text-xs text-gray-500">{usernameExample(form.username_format, 'John', 'Doe')}</p>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700">
										{labelWithRequired('Initial Password','user_initial_password')}
									</label>
									<input type="text" bind:value={form.user_initial_password} required
										class={"mt-1 block w-full border rounded-md px-3 py-2 " + (fieldErrors.user_initial_password ? 'border-red-500' : 'border-gray-300')}
										aria-invalid={!!fieldErrors.user_initial_password} />
								</div>
							</div>
						</div>

						<div class="flex justify-end gap-3 pt-2">
							<button type="button" on:click={closeEdit} class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
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