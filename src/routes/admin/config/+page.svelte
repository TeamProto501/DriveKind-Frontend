<!-- src/routes/admin/config/+page.svelte -->
<script lang="ts">
	import RoleGuard from '$lib/components/RoleGuard.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import { Save, RotateCcw, Globe, Shield, Bell, Database } from '@lucide/svelte';
	import { supabase } from '$lib/supabase';

	interface PageData {
		session?: { user: { id: string } | null } | null;
		profile?: { org_id?: number | null } | null;
		roles?: string[] | null;
	}
	let { data }: { data?: PageData } = $props();

	interface Organization {
		org_id: number;
		name: string | null;
		org_email: string | null;
		org_phone: string | null;
		org_address: string | null;
		org_address2?: string | null;
		org_city: string | null;
		org_state: string | null;
		org_zip_code: string | null;
		working_hours: string | null;
		days_off: string | null;
		org_website: string | null;
		primary_contact_name: string | null;
		primary_contact_address: string | null;
		primary_contact_address2: string | null;
		primary_contact_city: string | null;
		primary_contact_state: string | null;
		primary_contact_zipcode: string | null;
		primary_contact_email: string | null;
		secondary_contact_name: string | null;
		secondary_contact_address: string | null;
		secondary_contact_address2: string | null;
		secondary_contact_city: string | null;
		secondary_contact_state: string | null;
		secondary_contact_zipcode: string | null;
		secondary_contact_email: string | null;
		rides_phone_number: string | null;
		username_format: string | null;
		user_initial_password: string | null;
		client_min_age: number | null;
		min_days_in_advance_for_ride_requests: number | null;
		org_status?: string | null;
		org_creation?: string | null;
		first_ride_date?: string | null;
		last_activity?: string | null;
	}

	let orgId = $state<number | null>(null);
	let org = $state<Organization | null>(null);
	let originalOrg = $state<Organization | null>(null);

	let isLoading = $state(true);
	let isSaving = $state(false);
	let toast = $state('');
	let toastOk = $state(true);

	function notify(msg: string, ok = true) {
		console.log('[CONFIG]', msg);
		toast = msg;
		toastOk = ok;
		setTimeout(() => (toast = ''), 3500);
	}

	// --- Robust organization load ---
	async function init() {
		try {
			isLoading = true;

			// resolve uid
			const serverUid = data?.session?.user?.id ?? null;
			let uid = serverUid;
			if (!uid) {
				const { data: auth, error: au } = await supabase.auth.getUser();
				if (au) console.warn('auth.getUser error:', au);
				uid = auth?.user?.id ?? null;
			}
			if (!uid) {
				notify('No active session. Cannot resolve user.', false);
				return;
			}

			// 1) Try explicit FK join staff_profiles -> organizations
			// Adjust the constraint name if yours differs:
			//   organizations:organizations!staff_profiles_org_id_fkey(*)
			// If your FK is named differently (check Supabase table editor), update the !constraint part.
			const { data: joined, error: joinErr } = await supabase
				.from('staff_profiles')
				.select(`
					org_id,
					organizations:organizations!staff_profiles_org_id_fkey(*)
				`)
				.eq('user_id', uid)
				.maybeSingle();

			if (joinErr) {
				console.warn('Join error (step 1):', joinErr);
			}

			if (joined?.org_id) {
				orgId = joined.org_id;
				const orgData = Array.isArray((joined as any).organizations)
					? (joined as any).organizations[0]
					: (joined as any).organizations;

				if (orgData) {
					org = orgData as Organization;
					originalOrg = JSON.parse(JSON.stringify(org));
					console.log('Loaded via join (step 1).');
					return;
				}
			}

			// 2) Fallback: get org_id from staff_profiles directly
			const { data: sp, error: spErr } = await supabase
				.from('staff_profiles')
				.select('org_id')
				.eq('user_id', uid)
				.single();

			if (spErr) {
				console.error('staff_profiles fetch failed (step 2):', spErr);
				notify('Failed to load organization (cannot read your staff profile).', false);
				return;
			}
			if (!sp?.org_id) {
				notify('No organization linked to your profile.', false);
				return;
			}
			orgId = sp.org_id as number;

			// 3) Fetch organization by org_id
			const { data: orgRow, error: orgErr } = await supabase
				.from('organizations')
				.select('*')
				.eq('org_id', orgId)
				.single();

			if (orgErr) {
				console.error('organizations fetch by org_id failed (step 3):', orgErr);
				notify('Failed to load organization (cannot read organizations).', false);
				return;
			}

			org = orgRow as Organization;
			originalOrg = JSON.parse(JSON.stringify(org));
			console.log('Loaded via fallback (step 3).');
		} catch (e: any) {
			console.error('Init fatal:', e?.message ?? e);
			notify('Failed to load organization (unexpected).', false);
		} finally {
			isLoading = false;
		}
	}

	// runes-safe effect
	let initialized = $state(false);
	$effect(() => {
		if (initialized) return;
		initialized = true;
		void init();
	});

	function resetChanges() {
		if (!originalOrg) return;
		org = JSON.parse(JSON.stringify(originalOrg));
		notify('Changes reset.');
	}

	function emptyToNull(obj: Record<string, any>) {
		const o: Record<string, any> = {};
		for (const k in obj) o[k] = obj[k] === '' ? null : obj[k];
		return o;
	}

	async function saveOrg() {
		if (!org || !orgId) return;
		isSaving = true;
		try {
			const { org_id, ...rest } = org as any;
			const payload = emptyToNull(rest);
			const { error } = await supabase.from('organizations').update(payload).eq('org_id', orgId);
			if (error) throw error;
			originalOrg = JSON.parse(JSON.stringify(org));
			notify('Organization settings saved.', true);
		} catch (e: any) {
			console.error('Save error:', e?.message ?? e);
			notify(e?.message ?? 'Failed to save.', false);
		} finally {
			isSaving = false;
		}
	}

	// typed number coercion (fixes "never" error)
	function handleNumber<K extends keyof Organization>(key: K, ev: Event) {
		if (!org) return;
		const el = ev.currentTarget as HTMLInputElement;
		const value = el.value === '' ? null : Number(el.value);
		(org as any)[key] = value;
	}
</script>

<RoleGuard requiredRoles={['Admin']}>
	<div class="min-h-screen bg-gray-50">
		<Breadcrumbs />

		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			<h1 class="text-3xl font-bold text-gray-900 mb-2">Organization Settings</h1>
			<p class="text-gray-600 mb-6">Edit configuration for your organization.</p>

			{#if toast}
				<div class={toastOk ? 'bg-green-50 border border-green-200 p-3 rounded-md mb-4' : 'bg-red-50 border border-red-200 p-3 rounded-md mb-4'}>
					<p class={toastOk ? 'text-green-800 text-sm' : 'text-red-800 text-sm'}>{toast}</p>
				</div>
			{/if}

			{#if isLoading}
				<div class="p-8 text-center bg-white rounded-lg shadow">
					<div class="animate-spin h-8 w-8 border-b-2 border-blue-600 mx-auto rounded-full"></div>
					<p class="mt-3 text-gray-500">Loading...</p>
				</div>
			{:else if !org}
				<div class="p-6 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
					No organization record found for your account.
				</div>
			{:else}
				<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
					<!-- main -->
					<div class="lg:col-span-2 space-y-6">
						<!-- Basic Info -->
						<div class="bg-white shadow rounded-lg">
							<div class="border-b border-gray-200 px-6 py-4 flex items-center gap-3">
								<Globe class="w-5 h-5 text-blue-600" />
								<h2 class="text-lg font-semibold text-gray-900">Organization</h2>
								<span class="ml-auto text-sm text-gray-500">Org ID: {org.org_id}</span>
							</div>
							<div class="px-6 py-4 space-y-4">
								<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
									<label for="org-name" class="block text-sm font-medium text-gray-700">Name</label>
									<input id="org-name" class="border-gray-300 rounded-md w-full" type="text" bind:value={org.name} />

									<label for="org-website" class="block text-sm font-medium text-gray-700">Website</label>
									<input id="org-website" class="border-gray-300 rounded-md w-full" type="text" bind:value={org.org_website} />

									<label for="org-email" class="block text-sm font-medium text-gray-700">Email</label>
									<input id="org-email" class="border-gray-300 rounded-md w-full" type="email" bind:value={org.org_email} />

									<label for="org-phone" class="block text-sm font-medium text-gray-700">Phone</label>
									<input id="org-phone" class="border-gray-300 rounded-md w-full" type="text" bind:value={org.org_phone} />

									<label for="org-address" class="block text-sm font-medium text-gray-700">Address</label>
									<input id="org-address" class="border-gray-300 rounded-md w-full" type="text" bind:value={org.org_address} />

									<label for="org-address2" class="block text-sm font-medium text-gray-700">Address 2</label>
									<input id="org-address2" class="border-gray-300 rounded-md w-full" type="text" bind:value={org.org_address2} />

									<label for="org-city" class="block text-sm font-medium text-gray-700">City</label>
									<input id="org-city" class="border-gray-300 rounded-md w-full" type="text" bind:value={org.org_city} />

									<label for="org-state" class="block text-sm font-medium text-gray-700">State</label>
									<input id="org-state" class="border-gray-300 rounded-md w-full" type="text" bind:value={org.org_state} />

									<label for="org-zip" class="block text-sm font-medium text-gray-700">Zip</label>
									<input id="org-zip" class="border-gray-300 rounded-md w-full" type="text" bind:value={org.org_zip_code} />

									<label for="org-hours" class="block text-sm font-medium text-gray-700">Working Hours</label>
									<input id="org-hours" class="border-gray-300 rounded-md w-full" type="text" bind:value={org.working_hours} />

									<label for="org-days" class="block text-sm font-medium text-gray-700">Days Off</label>
									<input id="org-days" class="border-gray-300 rounded-md w-full" type="text" bind:value={org.days_off} />
								</div>
							</div>
						</div>

						<!-- Primary Contact -->
						<div class="bg-white shadow rounded-lg">
							<div class="border-b border-gray-200 px-6 py-4 flex items-center gap-3">
								<Shield class="w-5 h-5 text-green-600" />
								<h2 class="text-lg font-semibold text-gray-900">Primary Contact</h2>
							</div>
							<div class="px-6 py-4 space-y-4">
								<label for="pc-name" class="block text-sm font-medium text-gray-700">Name</label>
								<input id="pc-name" class="border-gray-300 rounded-md w-full" type="text" bind:value={org.primary_contact_name} />

								<label for="pc-email" class="block text-sm font-medium text-gray-700">Email</label>
								<input id="pc-email" class="border-gray-300 rounded-md w-full" type="email" bind:value={org.primary_contact_email} />

								<label for="pc-addr" class="block text-sm font-medium text-gray-700">Address</label>
								<input id="pc-addr" class="border-gray-300 rounded-md w-full" type="text" bind:value={org.primary_contact_address} />

								<label for="pc-addr2" class="block text-sm font-medium text-gray-700">Address 2</label>
								<input id="pc-addr2" class="border-gray-300 rounded-md w-full" type="text" bind:value={org.primary_contact_address2} />

								<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
									<div>
										<label for="pc-city" class="block text-sm font-medium text-gray-700">City</label>
										<input id="pc-city" class="border-gray-300 rounded-md w-full" type="text" bind:value={org.primary_contact_city} />
									</div>
									<div>
										<label for="pc-state" class="block text-sm font-medium text-gray-700">State</label>
										<input id="pc-state" class="border-gray-300 rounded-md w-full" type="text" bind:value={org.primary_contact_state} />
									</div>
									<div>
										<label for="pc-zip" class="block text-sm font-medium text-gray-700">Zip</label>
										<input id="pc-zip" class="border-gray-300 rounded-md w-full" type="text" bind:value={org.primary_contact_zipcode} />
									</div>
								</div>
							</div>
						</div>

						<!-- Secondary Contact -->
						<div class="bg-white shadow rounded-lg">
							<div class="border-b border-gray-200 px-6 py-4 flex items-center gap-3">
								<Bell class="w-5 h-5 text-purple-600" />
								<h2 class="text-lg font-semibold text-gray-900">Secondary Contact</h2>
							</div>
							<div class="px-6 py-4 space-y-4">
								<label for="sc-name" class="block text-sm font-medium text-gray-700">Name</label>
								<input id="sc-name" class="border-gray-300 rounded-md w-full" type="text" bind:value={org.secondary_contact_name} />

								<label for="sc-email" class="block text-sm font-medium text-gray-700">Email</label>
								<input id="sc-email" class="border-gray-300 rounded-md w-full" type="email" bind:value={org.secondary_contact_email} />

								<label for="sc-addr" class="block text-sm font-medium text-gray-700">Address</label>
								<input id="sc-addr" class="border-gray-300 rounded-md w-full" type="text" bind:value={org.secondary_contact_address} />

								<label for="sc-addr2" class="block text-sm font-medium text-gray-700">Address 2</label>
								<input id="sc-addr2" class="border-gray-300 rounded-md w-full" type="text" bind:value={org.secondary_contact_address2} />

								<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
									<div>
										<label for="sc-city" class="block text-sm font-medium text-gray-700">City</label>
										<input id="sc-city" class="border-gray-300 rounded-md w-full" type="text" bind:value={org.secondary_contact_city} />
									</div>
									<div>
										<label for="sc-state" class="block text-sm font-medium text-gray-700">State</label>
										<input id="sc-state" class="border-gray-300 rounded-md w-full" type="text" bind:value={org.secondary_contact_state} />
									</div>
									<div>
										<label for="sc-zip" class="block text-sm font-medium text-gray-700">Zip</label>
										<input id="sc-zip" class="border-gray-300 rounded-md w-full" type="text" bind:value={org.secondary_contact_zipcode} />
									</div>
								</div>
							</div>
						</div>

						<!-- Operations -->
						<div class="bg-white shadow rounded-lg">
							<div class="border-b border-gray-200 px-6 py-4 flex items-center gap-3">
								<Database class="w-5 h-5 text-orange-500" />
								<h2 class="text-lg font-semibold text-gray-900">Operations</h2>
							</div>
							<div class="px-6 py-4 space-y-4">
								<label for="org-rides" class="block text-sm font-medium text-gray-700">Rides Phone</label>
								<input id="org-rides" class="border-gray-300 rounded-md w-full" type="text" bind:value={org.rides_phone_number} />

								<label for="org-userfmt" class="block text-sm font-medium text-gray-700">Username Format</label>
								<input id="org-userfmt" class="border-gray-300 rounded-md w-full" type="text" bind:value={org.username_format} />

								<label for="org-pass" class="block text-sm font-medium text-gray-700">Initial Password</label>
								<input id="org-pass" class="border-gray-300 rounded-md w-full" type="text" bind:value={org.user_initial_password} />

								<label for="org-age" class="block text-sm font-medium text-gray-700">Client Minimum Age</label>
								<input id="org-age" class="border-gray-300 rounded-md w-full" type="number" value={org.client_min_age ?? ''} oninput={(e) => handleNumber('client_min_age', e)} />

								<label for="org-days-adv" class="block text-sm font-medium text-gray-700">Min Days in Advance</label>
								<input id="org-days-adv" class="border-gray-300 rounded-md w-full" type="number" value={org.min_days_in_advance_for_ride_requests ?? ''} oninput={(e) => handleNumber('min_days_in_advance_for_ride_requests', e)} />
							</div>
						</div>
					</div>

					<!-- Sidebar -->
					<div class="space-y-6">
						<div class="bg-white p-6 shadow rounded-lg">
							<h3 class="text-lg font-medium text-gray-900 mb-4">Actions</h3>
							<button onclick={saveOrg} class="w-full mb-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700" disabled={isSaving}>
								<Save class="w-4 h-4 mr-2 inline" /> {isSaving ? 'Saving…' : 'Save Changes'}
							</button>
							<button onclick={resetChanges} class="w-full px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
								<RotateCcw class="w-4 h-4 mr-2 inline" /> Reset
							</button>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
</RoleGuard>