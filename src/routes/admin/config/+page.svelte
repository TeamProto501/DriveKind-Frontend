<script lang="ts">
	import RoleGuard from '$lib/components/RoleGuard.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import { supabase } from '$lib/supabase';
	import { Save, RotateCcw, Building2, ChevronDown, ChevronRight } from '@lucide/svelte';

	// Optional +layout data
	interface PageData {
		session?: { user: { id: string } | null } | null;
		roles?: string[] | null;
		profile?: { org_id?: number | null } | null;
	}
	let { data }: { data?: PageData } = $props();

	// Your "organization" table (singular)
	type OrgRow = Record<string, any> & { org_id: number };

	let orgId = $state<number | null>(null);
	let org    = $state<OrgRow | null>(null);
	let originalOrg = $state<OrgRow | null>(null);

	let isLoading = $state(true);
	let isSaving  = $state(false);
	let toast     = $state('');
	let toastOk   = $state(true);

	function notify(msg: string, ok = true) {
		toast = msg;
		toastOk = ok;
		setTimeout(() => (toast = ''), 3500);
	}

	/** --- Load the user's org row --- */
	async function init() {
		try {
			isLoading = true;

			// resolve uid
			let uid = data?.session?.user?.id ?? null;
			if (!uid) {
				const { data: auth, error } = await supabase.auth.getUser();
				if (error) console.warn('auth.getUser error:', error);
				uid = auth?.user?.id ?? null;
			}
			if (!uid) {
				notify('No active session.', false);
				return;
			}

			// get org_id from staff_profiles(user_id)
			const { data: sp, error: spErr } = await supabase
				.from('staff_profiles')
				.select('org_id')
				.eq('user_id', uid)
				.single();

			if (spErr) {
				console.error(spErr);
				notify('Failed to read your staff profile.', false);
				return;
			}
			if (!sp?.org_id) {
				notify('Your profile is not linked to any organization.', false);
				return;
			}
			orgId = sp.org_id as number;

			// fetch organization row (singular table: organization)
			const { data: row, error: orgErr } = await supabase
				.from('organization')
				.select('*')
				.eq('org_id', orgId)
				.single();

			if (orgErr) {
				console.error(orgErr);
				notify('Unable to read your organization.', false);
				return;
			}

			org = row as OrgRow;
			originalOrg = JSON.parse(JSON.stringify(row));
		} catch (e: any) {
			console.error('init fatal:', e?.message ?? e);
			notify('Unexpected error loading organization.', false);
		} finally {
			isLoading = false;
		}
	}

	// run once
	let booted = $state(false);
	$effect(() => {
		if (booted) return;
		booted = true;
		void init();
	});

	/** --------- Form helpers ---------- */

	// Order keys you care about most; anything else goes to "Other fields"
	const preferredOrder = [
		// Core info
		'name','org_email','org_phone','org_website',
		// Address
		'org_address','org_address2','org_city','org_state','org_zip_code',
		// Ops
		'working_hours','days_off',
		// Dates / status
		'org_status','org_creation','first_ride_date','last_activity',
		// Primary contact
		'primary_contact_name','primary_contact_email','primary_contact_phone',
		'primary_contact_address','primary_contact_address2',
		'primary_contact_city','primary_contact_state','primary_contact_zipcode',
		// Secondary contact
		'secondary_contact_name','secondary_contact_email','secondary_contact_phone',
		'secondary_contact_address','secondary_contact_address2',
		'secondary_contact_city','secondary_contact_state','secondary_contact_zipcode',
		// Misc operational
		'rides_phone_number','username_format','user_initial_password',
		'client_min_age','min_days_in_advance_for_ride_requests'
	];

	const orderedKeys = $derived(
		org ? preferredOrder.filter((k) => k in org && k !== 'org_id') : []
	);

	const otherKeys = $derived(
		org
			? Object.keys(org).filter((k) => k !== 'org_id' && !preferredOrder.includes(k))
			: []
	);

	function labelFor(key: string) {
		const map: Record<string,string> = {
			org_id: 'Organization ID',
			org_email: 'Organization Email',
			org_phone: 'Organization Phone',
			org_address: 'Address',
			org_address2: 'Address 2',
			org_city: 'City',
			org_state: 'State',
			org_zip_code: 'Zip Code',
			org_website: 'Website',
			org_status: 'Status',
			org_creation: 'Creation Date',
			first_ride_date: 'First Ride Date',
			last_activity: 'Last Activity',
			working_hours: 'Working Hours',
			days_off: 'Days Off',
			primary_contact_name: 'Primary Contact Name',
			primary_contact_email: 'Primary Contact Email',
			primary_contact_phone: 'Primary Contact Phone',
			primary_contact_address: 'Primary Contact Address',
			primary_contact_address2: 'Primary Contact Address 2',
			primary_contact_city: 'Primary Contact City',
			primary_contact_state: 'Primary Contact State',
			primary_contact_zipcode: 'Primary Contact Zip',
			secondary_contact_name: 'Secondary Contact Name',
			secondary_contact_email: 'Secondary Contact Email',
			secondary_contact_phone: 'Secondary Contact Phone',
			secondary_contact_address: 'Secondary Contact Address',
			secondary_contact_address2: 'Secondary Contact Address 2',
			secondary_contact_city: 'Secondary Contact City',
			secondary_contact_state: 'Secondary Contact State',
			secondary_contact_zipcode: 'Secondary Contact Zip',
			rides_phone_number: 'Rides Phone',
			username_format: 'Username Format',
			user_initial_password: 'Initial Password',
			client_min_age: 'Client Minimum Age',
			min_days_in_advance_for_ride_requests: 'Min Days in Advance'
		};
		if (map[key]) return map[key];
		return key.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
	}

	function inputTypeFor(key: string, val: any): 'email'|'tel'|'date'|'number'|'textarea'|'text' {
		const k = key.toLowerCase();
		if (k.includes('email')) return 'email';
		if (k.includes('phone')) return 'tel';
		if (k.includes('date') || k.includes('creation') || k.includes('activity')) return 'date';
		if (typeof val === 'number' || /(_age|_days|count|min|max|_id)$/.test(k)) return 'number';
		if (k.includes('hours') || k.includes('days_off')) return 'textarea';
		return 'text';
	}

	function coerceValue(key: string, raw: string, type: string) {
		if (raw === '') return null;
		if (type === 'number') {
			const n = Number(raw);
			return isNaN(n) ? null : n;
		}
		return raw; // date/email/text/tel
	}

	function updateField(key: string, ev: Event) {
		if (!org) return;
		const el = ev.currentTarget as HTMLInputElement | HTMLTextAreaElement;
		const type = el.getAttribute('data-type') || 'text';
		(org as any)[key] = coerceValue(key, el.value, type);
	}

	function emptyToNull(obj: Record<string, any>) {
		const out: Record<string, any> = {};
		for (const k in obj) out[k] = obj[k] === '' ? null : obj[k];
		return out;
	}

	async function saveOrg() {
		if (!org || !orgId) return;
		isSaving = true;
		try {
			const { org_id, ...rest } = org;
			const payload = emptyToNull(rest);

			const { error } = await supabase
				.from('organization')
				.update(payload)
				.eq('org_id', orgId);

			if (error) throw error;

			originalOrg = JSON.parse(JSON.stringify(org));
			notify('Organization saved.', true);
		} catch (e: any) {
			console.error('save error:', e?.message ?? e);
			notify(e?.message ?? 'Failed to save.', false);
		} finally {
			isSaving = false;
		}
	}

	function resetChanges() {
		if (!originalOrg) return;
		org = JSON.parse(JSON.stringify(originalOrg));
		notify('Changes reset.');
	}

	// UI helpers
	let showOther = $state(false);
</script>

<RoleGuard requiredRoles={['Admin', 'Super Admin']}>
	<div class="min-h-screen bg-gray-50">
		<Breadcrumbs />

		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			<div class="mb-6 flex items-center gap-3">
				<div class="p-2 bg-blue-100 rounded-lg">
					<Building2 class="w-6 h-6 text-blue-600" />
				</div>
				<div>
					<h1 class="text-2xl font-bold text-gray-900">Organization Configuration</h1>
					<p class="text-sm text-gray-600">Edit all fields for your organization.</p>
				</div>
			</div>

			{#if toast}
				<div class={toastOk ? 'bg-green-50 border border-green-200 p-3 rounded-md mb-4' : 'bg-red-50 border border-red-200 p-3 rounded-md mb-4'}>
					<p class={toastOk ? 'text-green-800 text-sm' : 'text-red-800 text-sm'}>{toast}</p>
				</div>
			{/if}

			{#if isLoading}
				<div class="p-8 text-center bg-white rounded-lg shadow">
					<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
					<p class="mt-2 text-gray-500">Loading organization…</p>
				</div>
			{:else if !org}
				<div class="p-6 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
					No organization record found for your account.
				</div>
			{:else}
				<!-- Card -->
				<div class="bg-white rounded-lg shadow border border-gray-200">
					<div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
						<div class="flex items-center gap-3">
							<Building2 class="w-5 h-5 text-blue-600" />
							<h2 class="text-lg font-medium text-gray-900">Organization Details</h2>
						</div>
						<span class="text-sm text-gray-500">Org ID: {org.org_id}</span>
					</div>

					<div class="px-6 py-6">
						<!-- Preferred fields (render only those that exist in row) -->
						<div class="grid grid-cols-1 md:grid-cols-2 gap-5">
							{#each orderedKeys as key}
								{@const val = org[key]}
								{@const type = inputTypeFor(key, val)}
								<div class={type === 'textarea' ? 'md:col-span-2' : ''}>
									<label for={"f-"+key} class="block text-sm font-medium text-gray-700">{labelFor(key)}</label>

									{#if type === 'textarea'}
										<textarea
											id={"f-"+key}
											data-type="textarea"
											class="mt-1 block w-full border-gray-300 rounded-md min-h-24"
											oninput={(e) => updateField(key, e)}
										>{val ?? ''}</textarea>
									{:else if type === 'date'}
										<input
											id={"f-"+key}
											data-type="date"
											type="date"
											value={(val ?? '') && String(val).slice(0,10)}
											oninput={(e) => updateField(key, e)}
											class="mt-1 block w-full border-gray-300 rounded-md"
										/>
									{:else}
										<input
											id={"f-"+key}
											data-type={type}
											type={type === 'number' ? 'number' : (type === 'email' ? 'email' : (type === 'tel' ? 'tel' : 'text'))}
											value={val ?? ''}
											oninput={(e) => updateField(key, e)}
											class="mt-1 block w-full border-gray-300 rounded-md"
										/>
									{/if}
								</div>
							{/each}
						</div>

						<!-- Other fields (anything not in preferredOrder & not org_id) -->
						{#if otherKeys.length}
							<div class="mt-8">
								<button
									type="button"
									class="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
									onclick={() => (showOther = !showOther)}
								>
									{#if showOther}
										<ChevronDown class="w-4 h-4" />
									{:else}
										<ChevronRight class="w-4 h-4" />
									{/if}
									<span>Other Fields ({otherKeys.length})</span>
								</button>

								{#if showOther}
									<div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-5">
										{#each otherKeys as key}
											{@const val = org[key]}
											{@const type = inputTypeFor(key, val)}
											<div class={type === 'textarea' ? 'md:col-span-2' : ''}>
												<label for={"f-"+key} class="block text-sm font-medium text-gray-700">{labelFor(key)}</label>

												{#if type === 'textarea'}
													<textarea
														id={"f-"+key}
														data-type="textarea"
														class="mt-1 block w-full border-gray-300 rounded-md min-h-24"
														oninput={(e) => updateField(key, e)}
													>{val ?? ''}</textarea>
												{:else if type === 'date'}
													<input
														id={"f-"+key}
														data-type="date"
														type="date"
														value={(val ?? '') && String(val).slice(0,10)}
														oninput={(e) => updateField(key, e)}
														class="mt-1 block w-full border-gray-300 rounded-md"
													/>
												{:else}
													<input
														id={"f-"+key}
														data-type={type}
														type={type === 'number' ? 'number' : (type === 'email' ? 'email' : (type === 'tel' ? 'tel' : 'text'))}
														value={val ?? ''}
														oninput={(e) => updateField(key, e)}
														class="mt-1 block w-full border-gray-300 rounded-md"
													/>
												{/if}
											</div>
										{/each}
									</div>
								{/if}
							</div>
						{/if}

						<!-- Actions -->
						<div class="mt-8 flex items-center gap-3">
							<button
								onclick={saveOrg}
								class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60"
								disabled={isSaving}
							>
								<Save class="w-4 h-4 mr-2" />
								{isSaving ? 'Saving…' : 'Save Changes'}
							</button>
							<button
								onclick={resetChanges}
								class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
							>
								<RotateCcw class="w-4 h-4 mr-2" />
								Reset
							</button>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
</RoleGuard>