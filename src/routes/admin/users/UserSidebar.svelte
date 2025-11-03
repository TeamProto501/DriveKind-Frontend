<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { updateStaffProfile } from '$lib/api';
  import type { AuthInfo } from '$lib/types';
  import { browser } from '$app/environment';
  import { supabase } from '$lib/supabase';
  import { X } from '@lucide/svelte';  // Add this import
  import { toastStore } from '$lib/toast';  // Add this import

  export let user: StaffProfile | null = null;
  export let createMode: boolean = false;
  export let session: any = undefined;
  export let orgId: number;  // ADD THIS LINE

  const dispatch = createEventDispatcher();

  type StaffForm = {
    first_name: string;
    last_name: string;
    email?: string;
    primary_phone?: string;
    primary_is_cell: boolean
    primary_can_text: boolean;
    secondary_phone?: string;
    role: string[];
    dob?: string;
    address?: string;
    address2?: string;
    city?: string;
    state?: string;
    zipcode?: string;
    contact_pref_enum?: 'Phone'|'Email'|'Text';
    emergency_contact?: string;
    emergency_reln?: string;
    emergency_phone?: string;
    training_completed?: boolean;
    mileage_reimbursement?: boolean;
    can_accept_service_animals?: boolean;
    destination_limitation?: string;
    town_preference?: string;
    allergens?: string;
    driver_other_limitations?: string;
  };

  type StaffProfile = StaffForm & { user_id: string; org_id?: number; role: string[] | string; last_drove?: string|null; active_vehicle?: number|null; };

  const roles = ['Admin','Dispatcher','Driver','Volunteer','Super Admin'];
  const contactPrefs = ['Phone','Email','Text'];

  let mode: 'view'|'edit' = createMode ? 'edit' : 'view';
  let step = 1;

  let form: StaffForm = initForm();
  let saving = false;
  let errorMessage: string | null = null;
  let tempPassword = '';

  function initForm(): StaffForm {
    if (!user || createMode) {
      return {
        first_name: '', last_name: '', email: '', primary_phone: '', secondary_phone: '',
        role: [], dob: '', address: '', address2: '', city: '', state: '', zipcode: '',
        contact_pref_enum: 'Phone', emergency_contact: '', emergency_reln: '', emergency_phone: '',
        training_completed: false, mileage_reimbursement: false, can_accept_service_animals: true,
        destination_limitation: '', town_preference: '', allergens: '', driver_other_limitations: '',
        primary_is_cell: true, primary_can_text: true,
      };
    }
    const r = Array.isArray(user.role) ? user.role : (user.role ? [user.role] : []);
    return {
      first_name: user.first_name||'', last_name: user.last_name||'',
      email: user.email||'', primary_phone: user.primary_phone||'', secondary_phone: user.secondary_phone||'',
      role: r, dob: user.dob||'', address: user.address||'', address2: user.address2||'',
      city: user.city||'', state: user.state||'', zipcode: user.zipcode||'',
      contact_pref_enum: (user as any).contact_pref_enum || 'Phone',
      emergency_contact: user.emergency_contact||'', emergency_reln: user.emergency_reln||'', emergency_phone: user.emergency_phone||'',
      training_completed: user.training_completed ?? false,
      mileage_reimbursement: user.mileage_reimbursement ?? false,
      can_accept_service_animals: user.can_accept_service_animals ?? true,
      destination_limitation: user.destination_limitation||'',
      town_preference: user.town_preference||'',
      allergens: user.allergens||'',
      driver_other_limitations: user.driver_other_limitations||'',
      primary_is_cell: user.primary_is_cell, 
      primary_can_text: user.primary_can_text
    };
  }
  $: form = initForm(); // keep in sync when prop changes

  function validateStep(s:number): string[] {
    const errs:string[]=[];
    if (s===1){
      if(!form.first_name?.trim()) errs.push('First name is required.');
      if(!form.last_name?.trim()) errs.push('Last name is required.');
      if(createMode && !form.email?.trim()) errs.push('Email is required for new users.');
      if(createMode && !tempPassword) errs.push('Temporary password is required for new users.');
      if(createMode && tempPassword && tempPassword.length<6) errs.push('Password must be at least 6 characters.');
      if(!form.role || form.role.length===0) errs.push('Select at least one role.');
    }
    if (s===2){
      if(form.zipcode && !/^\d{5}(-\d{4})?$/.test(form.zipcode)) errs.push('ZIP code looks invalid.');
      if(form.state && form.state.length>2) errs.push('Use 2-letter state code.');
    }
    return errs;
  }
  function next(){ const e = validateStep(step); if(e.length){ errorMessage=e.join(' '); return; } errorMessage=null; step=Math.min(3, step+1); }
  function back(){ step=Math.max(1, step-1); errorMessage=null; }

  async function saveUser(){
  const allErrs=[...validateStep(1),...validateStep(2)]; 
  if(allErrs.length){ 
    errorMessage=allErrs.join(' '); 
    toastStore.error(errorMessage);
    return; 
  }
  
  saving=true; 
  errorMessage=null;
  
  try{
    if (createMode){
      console.log('Creating user with email:', form.email);
      
      const payload = {
        email: form.email || '',
        password: tempPassword,
        first_name: form.first_name,
        last_name: form.last_name,
        profileData: { 
          ...form, 
          role: form.role,
          // orgId will be set server-side from admin's profile
        }
      };
      
      console.log('Creating user with payload:', payload);
      
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/create-auth-user`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      });
      
      console.log('Create user response status:', res.status);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to create user' }));
        console.error('Create user failed:', errorData);
        throw new Error(errorData.error || 'Failed to create user');
      }
      
      const data = await res.json();
      console.log('Create user response data:', data);
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to create user');
      }
      
      toastStore.success('User created successfully');
      dispatch('updated'); 
      dispatch('close');
      
    } else if (user){
      // update existing user
      let auth: AuthInfo;
      if (session) {
        auth = { 
          token: session.access_token, 
          access_token: session.access_token, 
          refresh_token: session.refresh_token, 
          user: session.user, 
          userId: session.user?.id 
        };
      } else if (browser) {
        const { data: { session: s } } = await supabase.auth.getSession();
        if(!s) throw new Error('No session');
        auth = { 
          token: s.access_token, 
          access_token: s.access_token, 
          refresh_token: s.refresh_token, 
          user: s.user, 
          userId: s.user?.id 
        };
      } else { 
        throw new Error('No session'); 
      }
      
      await updateStaffProfile(user.user_id, { ...form, role: form.role }, auth);
      toastStore.success('User updated successfully');
      dispatch('updated'); 
      dispatch('close');
    }
  } catch(e:any){ 
    console.error('Save user error:', e);
    errorMessage = e.message || 'Failed to save user';
    toastStore.error(errorMessage);
  } finally{ 
    saving=false; 
  }
}
</script>

<div class="fixed top-0 right-0 w-[28rem] max-w-[92vw] h-full bg-white shadow-xl border-l border-gray-200 flex flex-col z-50">
  <!-- Header -->
  <div class="px-6 py-4 border-b flex items-center justify-between">
    <h2 class="text-lg md:text-xl font-semibold text-gray-900">
      {createMode ? 'Add New User' : mode==='view' ? 'User Profile' : 'Edit User'}
    </h2>
    <button on:click={() => dispatch('close')} class="text-gray-500 hover:text-gray-700">✕</button>
  </div>

  <!-- Body -->
  <div class="flex-1 overflow-y-auto p-6 space-y-4">
    {#if errorMessage}
      <div class="rounded-md bg-red-50 p-3 text-sm text-red-700">{errorMessage}</div>
    {/if}

    {#if !createMode && mode==='view' && user}
      <!-- READ-ONLY PROFILE -->
      <div class="space-y-4 text-[15px] leading-6">
        <div class="bg-gray-50 rounded-lg p-3">
          <div class="font-semibold text-gray-900 text-lg">{user.first_name} {user.last_name}</div>
          <div class="text-gray-600">{Array.isArray(user.role)?user.role.join(', '):user.role}</div>
        </div>

        <div class="grid grid-cols-1 gap-3">
          <div><div class="text-xs text-gray-500">Email</div><div class="font-medium">{user.email || '—'}</div></div>
          <div class="grid grid-cols-2 gap-3">
            <div><div class="text-xs text-gray-500">Primary Phone</div><div class="font-medium">{user.primary_phone || '—'}</div></div>
            <div><div class="text-xs text-gray-500">Secondary Phone</div><div class="font-medium">{user.secondary_phone || '—'}</div></div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><div class="text-xs text-gray-500">DOB</div><div class="font-medium">{user.dob || '—'}</div></div>
            <div><div class="text-xs text-gray-500">Contact Preference</div><div class="font-medium">{(user as any).contact_pref_enum || '—'}</div></div>
          </div>
          <div><div class="text-xs text-gray-500">Address</div>
            <div class="font-medium">{[user.address, user.address2].filter(Boolean).join(' ') || '—'}</div>
            <div class="font-medium">{[user.city,user.state,user.zipcode].filter(Boolean).join(', ') || ''}</div>
          </div>

          <div class="grid grid-cols-1 gap-2">
            <div><div class="text-xs text-gray-500">Emergency Contact</div><div class="font-medium">{user.emergency_contact || '—'}{user.emergency_reln ? ` (${user.emergency_reln})` : ''}</div></div>
            <div><div class="text-xs text-gray-500">Emergency Phone</div><div class="font-medium">{user.emergency_phone || '—'}</div></div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div><div class="text-xs text-gray-500">Training Completed</div><div class="font-medium">{user.training_completed ? 'Yes' : 'No'}</div></div>
            <div><div class="text-xs text-gray-500">Mileage Reimbursement</div><div class="font-medium">{user.mileage_reimbursement ? 'Yes' : 'No'}</div></div>
          </div>

          <div class="grid grid-cols-1 gap-2">
            <div><div class="text-xs text-gray-500">Destination Limitation</div><div class="font-medium">{user.destination_limitation || '—'}</div></div>
            <div><div class="text-xs text-gray-500">Town Preference</div><div class="font-medium">{user.town_preference || '—'}</div></div>
            <div><div class="text-xs text-gray-500">Allergens</div><div class="font-medium">{user.allergens || '—'}</div></div>
            <div><div class="text-xs text-gray-500">Other Driver Limitations</div><div class="font-medium">{user.driver_other_limitations || '—'}</div></div>
          </div>
        </div>
      </div>

      <div class="px-6 pb-6 pt-2">
        <button on:click={() => { mode='edit'; step=1; }} class="w-full rounded-lg bg-blue-600 text-white py-3 text-base">
          Edit Information
        </button>
      </div>
    {:else}
      <!-- EDIT / CREATE WIZARD -->
      <div class="flex items-center justify-center gap-3 mb-2">
        {#each [1,2,3] as s}
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm {step===s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}">{s}</div>
            {#if s<3}<div class="w-8 h-[2px] {step>s ? 'bg-blue-600' : 'bg-gray-200'}"></div>{/if}
          </div>
        {/each}
      </div>

      {#if step===1}
        <div class="space-y-3">
          <div><label class="block text-base font-medium">First Name *</label><input class="mt-1 w-full border rounded px-3 py-2 text-base" bind:value={form.first_name} /></div>
          <div><label class="block text-base font-medium">Last Name *</label><input class="mt-1 w-full border rounded px-3 py-2 text-base" bind:value={form.last_name} /></div>
          <div><label class="block text-base font-medium">Email {createMode ? '*' : ''}</label>
            <input class="mt-1 w-full border rounded px-3 py-2 text-base" type="email" bind:value={form.email} disabled={!createMode && !!user} />
            {#if !createMode && user}<p class="text-xs text-gray-500 mt-1">Email cannot be changed after creation</p>{/if}
          </div>
          {#if createMode}
            <div><label class="block text-base font-medium">Temporary Password *</label>
              <input class="mt-1 w-full border rounded px-3 py-2 text-base" type="password" bind:value={tempPassword} placeholder="User can change later" />
            </div>
          {/if}
          <div><label class="block text-base font-medium">Primary Phone</label><input class="mt-1 w-full border rounded px-3 py-2 text-base" bind:value={form.primary_phone} /></div>
          <div><label class="block text-base font-medium">Secondary Phone</label><input class="mt-1 w-full border rounded px-3 py-2 text-base" bind:value={form.secondary_phone} /></div>

          <div>
            <label class="block text-base font-medium">Roles *</label>
            <div class="mt-2 grid grid-cols-2 gap-2">
              {#each roles as r}
                <label class="flex items-center gap-2 text-base">
                  <input type="checkbox" checked={form.role.includes(r)} on:change={()=>{
                    form.role = form.role.includes(r) ? form.role.filter(x=>x!==r) : [...form.role, r];
                  }} />
                  <span>{r}</span>
                </label>
              {/each}
            </div>
          </div>
        </div>
      {/if}

      {#if step===2}
        <div class="space-y-3">
          <div><label class="block text-base font-medium">DOB</label><input class="mt-1 w-full border rounded px-3 py-2 text-base" type="date" bind:value={form.dob} /></div>
          <div><label class="block text-base font-medium">Contact Preference</label>
            <select class="mt-1 w-full border rounded px-3 py-2 text-base" bind:value={form.contact_pref_enum}>
              {#each contactPrefs as p}<option value={p}>{p}</option>{/each}
            </select>
          </div>
          <div><label class="block text-base font-medium">Street Address</label><input class="mt-1 w-full border rounded px-3 py-2 text-base" bind:value={form.address} /></div>
          <div><label class="block text-base font-medium">Address Line 2</label><input class="mt-1 w-full border rounded px-3 py-2 text-base" bind:value={form.address2} /></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="block text-base font-medium">City</label><input class="mt-1 w-full border rounded px-3 py-2 text-base" bind:value={form.city} /></div>
            <div><label class="block text-base font-medium">State</label><input class="mt-1 w-full border rounded px-3 py-2 text-base uppercase" maxlength="2" bind:value={form.state} placeholder="NY" /></div>
          </div>
          <div><label class="block text-base font-medium">ZIP</label><input class="mt-1 w-full border rounded px-3 py-2 text-base" bind:value={form.zipcode} /></div>
        </div>
      {/if}

      {#if step===3}
        <div class="space-y-3">
          <div class="grid grid-cols-1 gap-3">
            <div><label class="block text-base font-medium">Emergency Contact</label><input class="mt-1 w-full border rounded px-3 py-2 text-base" bind:value={form.emergency_contact} /></div>
            <div class="grid grid-cols-2 gap-3">
              <div><label class="block text-base font-medium">Relationship</label><input class="mt-1 w-full border rounded px-3 py-2 text-base" bind:value={form.emergency_reln} /></div>
              <div><label class="block text-base font-medium">Phone</label><input class="mt-1 w-full border rounded px-3 py-2 text-base" bind:value={form.emergency_phone} /></div>
            </div>
          </div>
          <div class="grid grid-cols-1 gap-2">
            <label class="flex items-center gap-2 text-base"><input type="checkbox" bind:checked={form.training_completed} /> Training Completed</label>
            <label class="flex items-center gap-2 text-base"><input type="checkbox" bind:checked={form.mileage_reimbursement} /> Mileage Reimbursement</label>
            <label class="flex items-center gap-2 text-base"><input type="checkbox" bind:checked={form.can_accept_service_animals} /> Can accept service animals</label>
          </div>
          <div><label class="block text-base font-medium">Destination Limitation</label><textarea rows="2" class="mt-1 w-full border rounded px-3 py-2 text-base" bind:value={form.destination_limitation} /></div>
          <div><label class="block text-base font-medium">Town Preference</label><input class="mt-1 w-full border rounded px-3 py-2 text-base" bind:value={form.town_preference} /></div>
          <div><label class="block text-base font-medium">Allergens</label><textarea rows="2" class="mt-1 w-full border rounded px-3 py-2 text-base" bind:value={form.allergens} /></div>
          <div><label class="block text-base font-medium">Other Driver Limitations</label><textarea rows="2" class="mt-1 w-full border rounded px-3 py-2 text-base" bind:value={form.driver_other_limitations} /></div>
        </div>
      {/if}
    {/if}
  </div>

  <!-- Footer -->
  {#if createMode || mode==='edit'}
    <div class="px-6 py-4 border-t flex items-center justify-between">
      <div>
        {#if step>1}<button on:click={back} class="px-4 py-2 rounded-lg border">Back</button>{/if}
      </div>
      <div class="flex gap-2">
        <button on:click={() => dispatch('close')} class="px-4 py-2 rounded-lg border">Cancel</button>
        {#if step<3}
          <button on:click={next} class="px-4 py-2 rounded-lg bg-blue-600 text-white">Next</button>
        {:else}
          <button on:click={saveUser} disabled={saving}
                  class="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50">
            {saving ? 'Saving...' : (createMode ? 'Create User' : 'Save Changes')}
          </button>
        {/if}
      </div>
    </div>
  {/if}
</div>