<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Card } from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import Textarea from "$lib/components/ui/textarea.svelte";
  // import Label from "$lib/components/ui/label.svelte"; // removed
  import {
    Car, Clock, MapPin, User, Phone, Calendar, Search, Plus, Edit,
    AlertCircle, UserCheck, CheckCircle
  } from "@lucide/svelte";
  import { invalidateAll } from '$app/navigation';
  import { onMount } from 'svelte';
  import type { PageData } from './$types';
  import DriverMatchModal from '$lib/components/DriverMatchModal.svelte';
  import RideCompletionModal from '$lib/components/RideCompletionModal.svelte';
  import {
    validateAddress, validateCity, validateState, validateZipCode,
    validateRequired, validateDateTime, sanitizeInput, combineValidations
  } from '$lib/utils/validation';
  import { page } from '$app/stores';

  let { data }: { data: PageData } = $props();

  let searchTerm = $state("");
  let activeTab  = $state("requested");
  onMount(() => {});

  let isUpdating = $state(false);
  let showCreateModal = $state(false);
  let showEditModal   = $state(false);
  let showConfirmModal = $state(false);
  let showDriverMatchModal = $state(false);
  let selectedRide: any = null;
  let selectedRideForMatch: any = null;
  let editRideIdFromUrl = $state<number | null>(null);

  const dispatcherName = $derived(
    () => (data?.profile ? `${data.profile.first_name} ${data.profile.last_name}` : '')
  );

  const isEditing = $derived(() => !!selectedRide && showEditModal);
  const userOrgId: number | null = data?.profile?.org_id ?? null;

  const filteredCalls = $derived(() => {
    const all = data?.calls ?? [];
    return userOrgId ? all.filter((c: any) => c.org_id === userOrgId) : all;
  });

  const STATUS_OPTIONS = ["Requested","Scheduled","In Progress","Completed","Cancelled","Reported","Pending"];
  const COMPLETION_STATUS_OPTIONS = [
    "Completed Round Trip","Completed One Way To","Completed One Way From","Cancelled by Client","Cancelled by Driver"
  ];

  const filteredClients = $derived(() => {
    const all = data?.clients ?? [];
    return userOrgId ? all.filter((c: any) => c.org_id === userOrgId) : all;
  });

  let filteredRides = $derived(() => {
    if (!data.rides) return [];
    return data.rides.filter((ride: any) => {
      const clientName = ride.clients ? `${ride.clients.first_name} ${ride.clients.last_name}` : 'Unknown Client';
      const driverName = ride.drivers ? `${ride.drivers.first_name} ${ride.drivers.last_name}` : '';
      const matches = (
        clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ride.destination_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ride.alt_pickup_address && ride.alt_pickup_address.toLowerCase().includes(searchTerm.toLowerCase())) ||
        driverName.toLowerCase().includes(searchTerm.toLowerCase())
      );
      let matchesTab = false;
      if (activeTab === "requested") matchesTab = ride.status === "Requested";
      else if (activeTab === "active")   matchesTab = ["Scheduled","Assigned","In Progress"].includes(ride.status);
      else if (activeTab === "reported") matchesTab = ride.status === "Reported";
      else if (activeTab === "completed")matchesTab = ["Completed","Cancelled"].includes(ride.status);
      return matches && matchesTab;
    });
  });

  let rideCounts = $derived(() => {
    if (!data.rides) return { requested: 0, active: 0, reported: 0, completed: 0 };
    return {
      requested: data.rides.filter((r: any) => r.status === "Requested").length,
      active:    data.rides.filter((r: any) => ["Scheduled","Assigned","In Progress"].includes(r.status)).length,
      reported:  data.rides.filter((r: any) => r.status === "Reported").length,
      completed: data.rides.filter((r: any) => ["Completed","Cancelled"].includes(r.status)).length
    };
  });

  function getStatusColor(status: string) {
    switch (status) {
      case "Requested": return "bg-gray-100 text-gray-800";
      case "Scheduled": return "bg-blue-100 text-blue-800";
      case "Assigned":  return "bg-yellow-100 text-yellow-800";
      case "In Progress": return "bg-orange-100 text-orange-800";
      case "Reported":  return "bg-purple-100 text-purple-800";
      case "Completed": return "bg-green-100 text-green-800";
      case "Cancelled": return "bg-red-100 text-red-800";
      default:          return "bg-gray-100 text-gray-800";
    }
  }
  const formatDate = (ts: string) => new Date(ts).toLocaleDateString();
  const formatTime = (ts: string) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const getClientName  = (ride: any) => ride.clients ? `${ride.clients.first_name} ${ride.clients.last_name}` : 'Unknown Client';
  const getClientPhone = (ride: any) => ride.clients?.primary_phone || 'No phone';
  const getDriverName  = (ride: any) => ride.drivers ? `${ride.drivers.first_name} ${ride.drivers.last_name}` : 'Unassigned';

  /* ---------------- Form model ---------------- */
  type RideForm = {
    org_id: string;
    client_id: string;
    dispatcher_user_id: string;
    alt_pickup_address: string;
    alt_pickup_address2: string;
    alt_pickup_city: string;
    alt_pickup_state: string;
    alt_pickup_zipcode: string;
    dropoff_address: string;
    dropoff_address2: string;
    dropoff_city: string;
    dropoff_state: string;
    dropoff_zipcode: string;
    appointment_time: string;
    pickup_time: string;
    status: string;
    notes: string;
    miles_driven: string;
    hours: string;
    donation: boolean;
    donation_amount: string;
    riders: string;
    round_trip: boolean;
    purpose: string;
    estimated_appointment_length: string;
    destination_name: string;
    pickup_from_home: boolean;
    call_id: string;
    completion_status: string;
  };

  let rideForm = $state<RideForm>({
    org_id: userOrgId ? String(userOrgId) : '',
    client_id: '',
    dispatcher_user_id: data?.profile?.user_id ?? '',
    alt_pickup_address: '',
    alt_pickup_address2: '',
    alt_pickup_city: '',
    alt_pickup_state: '',
    alt_pickup_zipcode: '',
    dropoff_address: '',
    dropoff_address2: '',
    dropoff_city: '',
    dropoff_state: '',
    dropoff_zipcode: '',
    appointment_time: '',
    pickup_time: '',
    status: 'Requested',
    notes: '',
    miles_driven: '',
    hours: '',
    donation: false,
    donation_amount: '',
    riders: '0',
    round_trip: false,
    purpose: '',
    estimated_appointment_length: '',
    destination_name: '',
    pickup_from_home: true,
    call_id: '',
    completion_status: ''
  });

  /* ---------- Destinations (saved locations) ---------- */
  type Destination = {
    destination_id: number;
    org_id: number;
    location_name: string | null;
    address: string | null;
    address2: string | null;
    city: string | null;
    state: string | null;
    zipcode: string | null;
  };

  // Replace the Destination block’s derived with this:
  const filteredDestinations = $derived(() => {
    const all = (data as any)?.destinations ?? [];
    return userOrgId ? all.filter((d: any) => d.org_id === userOrgId) : all;
  });

  // One selection state (only one modal is open at a time)
  let selectedDestinationId = $state<string>("");

  function applyDestinationToDropoff(destIdStr: string) {
    selectedDestinationId = destIdStr;
    const id = parseInt(destIdStr || '0', 10);
    if (!id) return;

    const dest = filteredDestinations().find(d => d.destination_id === id);
    if (!dest) return;

    rideForm.destination_name = dest.location_name ?? '';
    rideForm.dropoff_address  = dest.address ?? '';
    rideForm.dropoff_address2 = dest.address2 ?? '';
    rideForm.dropoff_city     = dest.city ?? '';
    rideForm.dropoff_state    = dest.state ?? '';
    rideForm.dropoff_zipcode  = dest.zipcode ?? '';
  }
  function resetDestinationSelection() { selectedDestinationId = ""; }

  let createStep = $state(1);
  let editStep   = $state(1);
  let stepErrors = $state<string[]>([]);

  function resetRideForm() {
    rideForm = {
      org_id: userOrgId ? String(userOrgId) : '',
      client_id: '',
      dispatcher_user_id: data?.profile?.user_id ?? '',
      alt_pickup_address: '',
      alt_pickup_address2: '',
      alt_pickup_city: '',
      alt_pickup_state: '',
      alt_pickup_zipcode: '',
      dropoff_address: '',
      dropoff_address2: '',
      dropoff_city: '',
      dropoff_state: '',
      dropoff_zipcode: '',
      appointment_time: '',
      pickup_time: '',
      status: 'Requested',
      notes: '',
      miles_driven: '',
      hours: '',
      donation: false,
      donation_amount: '',
      riders: '0',
      round_trip: false,
      purpose: '',
      estimated_appointment_length: '',
      destination_name: '',
      pickup_from_home: true,
      call_id: '',
      completion_status: ''
    };
    stepErrors = [];
  }

  /* donation amount lock */
  $effect(() => { if (!rideForm.donation) rideForm.donation_amount = '0.00'; });

  /* pickup-from-home autofill */
  function applyClientAddressToPickup() {
    const cid = parseInt(rideForm.client_id || '0', 10);
    if (!cid) return;
    const client = filteredClients().find((c: any) => c.client_id === cid);
    if (!client) return;
    rideForm.alt_pickup_address  = client.street_address ?? '';
    rideForm.alt_pickup_address2 = client.address2 ?? '';
    rideForm.alt_pickup_city     = client.city ?? '';
    rideForm.alt_pickup_state    = client.state ?? '';
    rideForm.alt_pickup_zipcode  = client.zip_code ?? '';
  }
  $effect(() => { if (rideForm.pickup_from_home && rideForm.client_id) applyClientAddressToPickup(); });

  function onClientChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value;
    rideForm.client_id = val;
    if (rideForm.pickup_from_home) applyClientAddressToPickup();
  }

  function openCreateModal() { resetRideForm(); resetDestinationSelection(); createStep = 1; showCreateModal = true; }

  function toLocalDateTimeInput(ts: string | null | undefined) {
    if (!ts) return '';
    const d = new Date(ts);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  const toISOorNull = (v: string) => (v ? new Date(v).toISOString() : null);

  function openEditModal(ride: any) {
    selectedRide = ride;
    resetDestinationSelection();
    rideForm = {
      org_id: userOrgId ? String(userOrgId) : (ride.org_id ?? '').toString(),
      client_id: (ride.client_id ?? '').toString(),
      dispatcher_user_id: data?.profile?.user_id ?? '',
      alt_pickup_address: ride.alt_pickup_address ?? '',
      alt_pickup_address2: ride.alt_pickup_address2 ?? '',
      alt_pickup_city: ride.alt_pickup_city ?? '',
      alt_pickup_state: ride.alt_pickup_state ?? '',
      alt_pickup_zipcode: ride.alt_pickup_zipcode ?? '',
      dropoff_address: ride.dropoff_address ?? '',
      dropoff_address2: ride.dropoff_address2 ?? '',
      dropoff_city: ride.dropoff_city ?? '',
      dropoff_state: ride.dropoff_state ?? '',
      dropoff_zipcode: ride.dropoff_zipcode ?? '',
      appointment_time: toLocalDateTimeInput(ride.appointment_time) || '',
      pickup_time: toLocalDateTimeInput(ride.pickup_time) || '',
      status: ride.status ?? 'Requested',
      notes: ride.notes ?? '',
      miles_driven: ride.miles_driven?.toString?.() ?? '',
      hours: ride.hours?.toString?.() ?? '',
      donation: !!ride.donation,
      donation_amount: ride.donation_amount?.toString?.() ?? (ride.donation ? '0.00' : '0.00'),
      riders: (ride.riders ?? 0).toString(),
      round_trip: !!ride.round_trip,
      purpose: ride.purpose ?? '',
      estimated_appointment_length: ride.estimated_appointment_length ?? '',
      destination_name: ride.destination_name ?? '',
      pickup_from_home: !!ride.pickup_from_home,
      call_id: (ride.call_id ?? '').toString(),
      completion_status: ride.completion_status ?? ''
    };
    if (rideForm.pickup_from_home && rideForm.client_id) applyClientAddressToPickup();
    stepErrors = [];
    editStep = 1;
    showEditModal = true;
  }

  function openDriverMatchModal(ride: any) {
    if (!data.session?.access_token) { alert('Session expired. Please refresh and try again.'); return; }
    selectedRideForMatch = ride;
    showDriverMatchModal = true;
  }

  /* ---------------- diagnostics + payload helpers ---------------- */
  const DEBUG = true;
  function isBlank(v: any) {
    if (v === 0 || v === '0') return false;
    if (v === null || v === undefined) return true;
    if (typeof v === 'number') return Number.isNaN(v);
    return String(v).trim() === '';
  }
  function has(v: any) { return !isBlank(v); }
  function numFromStr(s: string, fallback: number | null): number | null {
    if (!has(s)) return fallback;
    const n = parseFloat(s as any);
    return Number.isFinite(n) ? n : fallback;
  }

  function buildPayload(form: RideForm) {
    const base = selectedRide ?? {};
    const _org   = has(form.org_id)           ? String(form.org_id)          : String(base.org_id ?? '');
    const _client= has(form.client_id)        ? String(form.client_id)       : String(base.client_id ?? '');
    const _dest  = has(form.destination_name) ? form.destination_name        : String(base.destination_name ?? '');
    const _addr  = has(form.dropoff_address)  ? form.dropoff_address         : String(base.dropoff_address ?? '');
    const _city  = has(form.dropoff_city)     ? form.dropoff_city            : String(base.dropoff_city ?? '');
    const _state = has(form.dropoff_state)    ? form.dropoff_state           : String(base.dropoff_state ?? '');
    const _zip   = has(form.dropoff_zipcode)  ? form.dropoff_zipcode         : String(base.dropoff_zipcode ?? '');
    const apptLocal = has(form.appointment_time)
      ? form.appointment_time
      : (base.appointment_time ? toLocalDateTimeInput(base.appointment_time) : '');

    const payload = {
      org_id: parseInt(_org, 10),
      client_id: parseInt(_client, 10),
      dispatcher_user_id: has(form.dispatcher_user_id) ? form.dispatcher_user_id : (base.dispatcher_user_id ?? null),

      alt_pickup_address:   has(form.alt_pickup_address)  ? sanitizeInput(form.alt_pickup_address)  : (base.alt_pickup_address  ?? null),
      alt_pickup_address2:  has(form.alt_pickup_address2) ? sanitizeInput(form.alt_pickup_address2) : (base.alt_pickup_address2 ?? null),
      alt_pickup_city:      has(form.alt_pickup_city)     ? sanitizeInput(form.alt_pickup_city)     : (base.alt_pickup_city     ?? null),
      alt_pickup_state:     has(form.alt_pickup_state)    ? sanitizeInput(form.alt_pickup_state)    : (base.alt_pickup_state    ?? null),
      alt_pickup_zipcode:   has(form.alt_pickup_zipcode)  ? sanitizeInput(form.alt_pickup_zipcode)  : (base.alt_pickup_zipcode  ?? null),

      dropoff_address:  sanitizeInput(_addr),
      dropoff_address2: has(form.dropoff_address2) ? sanitizeInput(form.dropoff_address2) : (base.dropoff_address2 ?? null),
      dropoff_city:     sanitizeInput(_city),
      dropoff_state:    sanitizeInput(_state),
      dropoff_zipcode:  sanitizeInput(_zip),

      appointment_time: toISOorNull(apptLocal),
      pickup_time:      toISOorNull(form.pickup_time),

      status: has(form.status) ? form.status : (base.status ?? 'Requested'),
      notes:  has(form.notes)  ? sanitizeInput(form.notes)  : (base.notes ?? null),

      miles_driven: numFromStr(form.miles_driven, base.miles_driven ?? null),
      hours:        numFromStr(form.hours,        base.hours ?? null),

      donation: !!form.donation,
      donation_amount: form.donation
        ? (has(form.donation_amount) ? parseFloat(form.donation_amount) : Number(base.donation_amount ?? 0))
        : 0,

      riders: (() => {
        if (has(form.riders)) {
          const n = parseInt(form.riders, 10);
          return Number.isFinite(n) ? n : 0;
        }
        return Number(base.riders ?? 0);
      })(),

      round_trip: !!form.round_trip,
      purpose: has(form.purpose) ? sanitizeInput(form.purpose) : (base.purpose ?? null),
      estimated_appointment_length: has(form.estimated_appointment_length)
        ? sanitizeInput(form.estimated_appointment_length)
        : (base.estimated_appointment_length ?? null),

      destination_name: sanitizeInput(_dest),
      pickup_from_home: has(form.pickup_from_home) ? !!form.pickup_from_home : !!base.pickup_from_home,
      call_id: has(form.call_id) ? parseInt(form.call_id, 10) : (base.call_id ?? null),
      completion_status: has(form.completion_status) ? form.completion_status : (base.completion_status ?? null),
    };

    if (DEBUG) console.debug('🧾 Payload:', payload);
    return payload;
  }

  function listMissingRequiredFields(payload: any, requireAppt: boolean) {
    const miss: string[] = [];
    if (isBlank(payload.org_id)) miss.push('Organization');
    if (isBlank(payload.client_id)) miss.push('Client');
    if (isBlank(payload.destination_name)) miss.push('Destination name');
    if (isBlank(payload.dropoff_address)) miss.push('Dropoff address');
    if (isBlank(payload.dropoff_city)) miss.push('Dropoff city');
    if (isBlank(payload.dropoff_state)) miss.push('Dropoff state');
    if (isBlank(payload.dropoff_zipcode)) miss.push('Dropoff ZIP');
    if (requireAppt && isBlank(payload.appointment_time)) miss.push('Appointment time');
    return miss;
  }

  /* ---------------- validation (per-step) ---------------- */
  function validateStep(step: number): boolean {
    stepErrors = [];
    if (step === 1) {
      const needAppt = !isEditing();
      const validators = [
        validateRequired(rideForm.org_id || (isEditing() ? String(selectedRide?.org_id ?? '') : ''), 'Organization'),
        validateRequired(rideForm.client_id || (isEditing() ? String(selectedRide?.client_id ?? '') : ''), 'Client'),
      ];
      if (needAppt) validators.push(validateDateTime(rideForm.appointment_time, 'Appointment time'));
      const v = combineValidations(...validators);
      if (!v.valid) stepErrors = v.errors;
      return v.valid;
    }
    if (step === 2) {
      const v = combineValidations(
        validateRequired(rideForm.destination_name || (isEditing() ? String(selectedRide?.destination_name ?? '') : ''), 'Destination name'),
        validateRequired(rideForm.dropoff_address  || (isEditing() ? String(selectedRide?.dropoff_address  ?? '') : ''), 'Dropoff address'),
        validateCity(rideForm.dropoff_city    || (isEditing() ? String(selectedRide?.dropoff_city    ?? '') : '')),
        validateState(rideForm.dropoff_state  || (isEditing() ? String(selectedRide?.dropoff_state  ?? '') : '')),
        validateZipCode(rideForm.dropoff_zipcode || (isEditing() ? String(selectedRide?.dropoff_zipcode ?? '') : '')),
        !rideForm.pickup_from_home && rideForm.alt_pickup_address ? validateAddress(rideForm.alt_pickup_address, 'Alternative pickup address') : { valid: true, errors: [] },
        !rideForm.pickup_from_home && rideForm.alt_pickup_city ? validateCity(rideForm.alt_pickup_city) : { valid: true, errors: [] },
        !rideForm.pickup_from_home && rideForm.alt_pickup_state ? validateState(rideForm.alt_pickup_state) : { valid: true, errors: [] },
        !rideForm.pickup_from_home && rideForm.alt_pickup_zipcode ? validateZipCode(rideForm.alt_pickup_zipcode) : { valid: true, errors: [] },
      );
      if (!v.valid) stepErrors = v.errors;
      return v.valid;
    }
    if (step === 3) {
      const errs: string[] = [];
      if (rideForm.donation && rideForm.donation_amount && isNaN(Number(rideForm.donation_amount))) {
        errs.push('Donation amount must be a number like 10 or 10.00');
      }
      stepErrors = errs; return errs.length === 0;
    }
    if (step === 4) {
      const errs: string[] = [];
      if (rideForm.miles_driven && isNaN(Number(rideForm.miles_driven))) errs.push('Miles driven must be a number.');
      if (rideForm.hours && isNaN(Number(rideForm.hours))) errs.push('Hours must be a number.');
      stepErrors = errs; return errs.length === 0;
    }
    return true;
  }

  function nextCreate() { if (validateStep(createStep)) createStep = Math.min(3, createStep + 1); }
  function prevCreate() { createStep = Math.max(1, createStep - 1); stepErrors = []; }
  function nextEdit()   { if (validateStep(editStep))   editStep   = Math.min(4, editStep + 1); }
  function prevEdit()   { editStep   = Math.max(1, editStep - 1);   stepErrors = []; }

  /* ---------------- submit ---------------- */
  async function createRide() {
    const payload = buildPayload(rideForm);
    const missing = listMissingRequiredFields(payload, true);
    if (missing.length) {
      alert(`Cannot create ride:\n• ${missing.join('\n• ')}`);
      return;
    }

    isUpdating = true;
    try {
      const r = await fetch('/dispatcher/rides/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (r.ok) {
        showCreateModal = false;
        await invalidateAll();
        alert('Ride created successfully!');
      } else {
        let err: any = {};
        try { err = await r.json(); } catch {}
        if ((err.error || '').toLowerCase().includes('missing')) {
          alert(`Failed to create ride:\n• ${listMissingRequiredFields(payload, true).join('\n• ') || 'Unknown fields'}`);
        } else {
          alert(`Failed to create ride: ${err.error || 'Unknown error'}`);
        }
      }
    } catch (e) {
      console.error(e); alert('Error creating ride.');
    } finally { isUpdating = false; }
  }

  async function updateRide() {
    if (!selectedRide) return;

    const payload = buildPayload(rideForm);
    const missing = listMissingRequiredFields(payload, false);
    if (missing.length) {
      alert(`Cannot update ride:\n• ${missing.join('\n• ')}`);
      return;
    }

    isUpdating = true;
    try {
      const r = await fetch(`/dispatcher/rides/update/${selectedRide.ride_id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (r.ok) {
        showEditModal = false;
        selectedRide = null;
        await invalidateAll();
        alert('Ride updated successfully!');
      } else {
        let err: any = {};
        try { err = await r.json(); } catch {}
        const msg = (err.error || '').toLowerCase();
        if (msg.includes('missing')) {
          alert(`Failed to update ride:\n• ${listMissingRequiredFields(payload, false).join('\n• ') || 'Unknown fields'}`);
        } else {
          alert(`Failed to update ride: ${err.error || 'Unknown error'}`);
        }
      }
    } catch (e) {
      console.error(e); alert('Error updating ride.');
    } finally { isUpdating = false; }
  }

  function openConfirmModal(ride: any) { selectedRide = ride; showConfirmModal = true; }

  async function confirmRideCompletion(formData: any) {
    if (!selectedRide) return;
    isUpdating = true;
    try {
      const token = data.session?.access_token;
      const response = await fetch(`${import.meta.env.VITE_API_URL}/rides/${selectedRide.ride_id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json','Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          hours: formData.hours ? parseFloat(formData.hours) : null,
          miles_driven: formData.miles_driven ? parseFloat(formData.miles_driven) : null,
          donation_received: formData.donation_received || false,
          donation_amount: formData.donation_received && formData.donation_amount ? parseFloat(formData.donation_amount) : null,
          completion_status: formData.completion_status,
          comments: formData.comments
        })
      });
      const result = await response.json();
      if (response.ok && result.success) {
        showConfirmModal = false;
        selectedRide = null;
        await invalidateAll();
        alert('Ride confirmed as completed!');
      } else {
        alert(`Failed to confirm ride: ${result.error || 'Unknown error'}`);
      }
    } catch (e) {
      console.error(e); alert('Error confirming ride.');
    } finally { isUpdating = false; }
  }

  async function sendRideRequest(driverId: string) {
    if (!selectedRideForMatch) return;
    isUpdating = true;
    try {
      const token = data.session?.access_token;
      const response = await fetch(`${import.meta.env.VITE_API_URL}/rides/${selectedRideForMatch.ride_id}/send-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ driver_user_id: driverId })
      });
      const result = await response.json();
      if (response.ok && result.success) {
        showDriverMatchModal = false;
        selectedRideForMatch = null;
        await invalidateAll();
        alert('Ride request sent to driver!');
      } else {
        alert(`Failed to send request: ${result.error || 'Unknown error'}`);
      }
    } catch (e) {
      console.error(e); alert('Error sending ride request.');
    } finally { isUpdating = false; }
  }

  onMount(() => {
    const editParam = $page.url.searchParams.get('edit');
    if (editParam) {
      const rideId = parseInt(editParam);
      if (!isNaN(rideId)) {
        const rideToEdit = data.rides?.find(r => r.ride_id === rideId);
        if (rideToEdit) {
          openEditModal(rideToEdit);
          
          // Clear the URL parameter after opening
          const url = new URL(window.location.href);
          url.searchParams.delete('edit');
          window.history.replaceState({}, '', url);
        }
      }
    }
  });
</script>

<svelte:head>
  <title>Ride Management - DriveKind</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 p-6">
  <div class="max-w-7xl mx-auto space-y-6">
    <!-- Header -->
    <div class="bg-white rounded-lg shadow-sm border p-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Ride Management</h1>
          <p class="text-gray-600 mt-1">Manage and track ride requests and assignments</p>
        </div>
        <button
          onclick={openCreateModal}
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus class="w-4 h-4" />
          New Ride
        </button>
      </div>
    </div>

    <!-- Error -->
    {#if data.error}
      <div class="bg-red-50 border border-red-200 rounded-lg p-4">
        <p class="text-red-800">{data.error}</p>
      </div>
    {/if}

    <!-- Tabs -->
    <div class="bg-white rounded-lg shadow-sm border">
      <div class="border-b border-gray-200">
        <div class="flex space-x-8 px-6">
          <button onclick={() => activeTab = "requested"} class="py-4 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'requested' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}">
            Requested {#if rideCounts().requested > 0}<span class="ml-2 py-0.5 px-2 rounded-full text-xs bg-gray-100 text-gray-600">{rideCounts().requested}</span>{/if}
          </button>
          <button onclick={() => activeTab = "active"} class="py-4 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'active' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}">
            Scheduled/In Progress {#if rideCounts().active > 0}<span class="ml-2 py-0.5 px-2 rounded-full text-xs bg-blue-100 text-blue-600">{rideCounts().active}</span>{/if}
          </button>
          <button onclick={() => activeTab = "reported"} class="py-4 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'reported' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}">
            Reported Rides {#if rideCounts().reported > 0}<span class="ml-2 py-0.5 px-2 rounded-full text-xs bg-purple-100 text-purple-600">{rideCounts().reported}</span>{/if}
          </button>
          <button onclick={() => activeTab = "completed"} class="py-4 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'completed' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}">
            Completed {#if rideCounts().completed > 0}<span class="ml-2 py-0.5 px-2 rounded-full text-xs bg-green-100 text-green-600">{rideCounts().completed}</span>{/if}
          </button>
        </div>
      </div>

      <!-- Search -->
      <div class="p-6 border-b border-gray-200">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search rides..."
            bind:value={searchTerm}
            class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <!-- Rides List -->
      <div class="divide-y divide-gray-200">
        {#each filteredRides() as ride}
          <div class="p-6 hover:bg-gray-50 transition-colors">
            <div class="flex items-start justify-between">
              <div class="space-y-3 flex-1">
                <div class="flex items-center gap-3">
                  <h3 class="text-lg font-semibold text-gray-900">{getClientName(ride)}</h3>
                  <span class="px-2 py-1 text-xs font-medium rounded-full {getStatusColor(ride.status)}">{ride.status.toUpperCase()}</span>
                  <span class="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">{ride.purpose}</span>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                  <div class="flex items-center gap-2">
                    <Phone class="w-4 h-4 text-gray-400" /> {getClientPhone(ride)}
                  </div>
                  <div class="flex items-center gap-2">
                    <Calendar class="w-4 h-4 text-gray-400" /> {formatDate(ride.appointment_time)} at {formatTime(ride.appointment_time)}
                  </div>
                  <div class="flex items-center gap-2">
                    <User class="w-4 h-4 text-gray-400" /> Driver: {getDriverName(ride)}
                  </div>
                  <div class="flex items-center gap-2">
                    <MapPin class="w-4 h-4 text-gray-400" /> Destination: {ride.destination_name}
                  </div>
                </div>

                {#if ride.notes}
                  <div class="text-sm"><span class="font-medium">Notes:</span> {ride.notes}</div>
                {/if}

                {#if ride.status === "Reported"}
                  <div class="bg-purple-50 border border-purple-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle class="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div class="text-sm text-purple-800">
                      <div class="font-medium">Pending Confirmation</div>
                      <div class="text-purple-700">Driver has reported this ride as complete. Please review and confirm.</div>
                    </div>
                  </div>
                {/if}
              </div>

              <div class="flex gap-2 ml-4">
                {#if ride.status === "Requested"}
                  <button onclick={() => openDriverMatchModal(ride)} disabled={isUpdating} class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-colors disabled:opacity-50">
                    <UserCheck class="w-4 h-4" /> Send Request
                  </button>
                {:else if ride.status === "Reported"}
                  <button onclick={() => openConfirmModal(ride)} disabled={isUpdating} class="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-colors disabled:opacity-50">
                    <CheckCircle class="w-4 h-4" /> Confirm Complete
                  </button>
                {/if}
                <button onclick={() => openEditModal(ride)} disabled={isUpdating} class="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-colors disabled:opacity-50">
                  <Edit class="w-4 h-4" /> Edit
                </button>
              </div>
            </div>
          </div>
        {/each}
      </div>

      {#if filteredRides().length === 0}
        <div class="p-12 text-center">
          <Car class="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 class="text-lg font-semibold text-gray-900 mb-2">No rides found</h3>
          <p class="text-gray-600">No rides match your current tab and filters.</p>
        </div>
      {/if}
    </div>
  </div>
</div>

<!-- ======= CREATE MODAL ======= -->
{#if showCreateModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div class="bg-white rounded-lg p-6 max-w-3xl max-h-[90vh] overflow-y-auto w-full mx-4">
      <div class="mb-4">
        <h2 class="text-xl font-semibold">Create New Ride</h2>
        <p class="text-sm text-gray-600">Fill in the details below. Items marked * are required.</p>
      </div>

      <!-- Stepper -->
      <div class="flex items-center justify-center gap-3 mb-4">
        {#each [1,2,3] as s}
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm {createStep===s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}">{s}</div>
            {#if s < 3}<div class="w-8 h-[2px] {createStep> s ? 'bg-blue-600' : 'bg-gray-200'}"></div>{/if}
          </div>
        {/each}
      </div>

      {#if stepErrors.length}
        <div class="mb-4 bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm">
          <div class="font-medium mb-1">Please fix the following:</div>
          <ul class="list-disc ml-5">
            {#each stepErrors as e}<li>{e}</li>{/each}
          </ul>
        </div>
      {/if}

      {#if createStep === 1}
      <!-- Who & When -->
      <div class="border rounded-lg p-4 mb-2">
        <h3 class="font-semibold mb-3">Who &amp; When</h3>

        <div class="grid gap-3 md:grid-cols-3">
          <div class="md:col-span-2">
            <label for="client_id">Client *</label>
            <select
              id="client_id"
              bind:value={rideForm.client_id}
              onchange={onClientChange}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Select client…</option>
              {#each filteredClients() as c}
                <option value={String(c.client_id)}>{c.first_name} {c.last_name}</option>
              {/each}
            </select>
            <p class="text-xs text-gray-500 mt-1">Only clients in your organization are shown.</p>
          </div>

          <div>
            <label for="dispatcher_display">Dispatcher</label>
            <Input id="dispatcher_display" value={dispatcherName()} disabled class="bg-gray-100" />
            <p class="text-xs text-gray-500 mt-1">Auto-set to you.</p>
          </div>

          <div class="md:col-span-3">
            <label for="call_id">Linked Call</label>
            <select
              id="call_id"
              bind:value={rideForm.call_id}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Select a call (optional)…</option>
              {#each filteredCalls() as call}
                <option value={String(call.call_id)}>
                  {call.call_id} • {new Date(call.call_time).toLocaleString()} • {call.call_type} • {call.caller_first_name} {call.caller_last_name}
                </option>
              {/each}
            </select>
          </div>
        </div>

        <div class="grid gap-3 md:grid-cols-2 mt-3">
          <div>
            <label for="appointment_time">Appointment Time *</label>
            <Input id="appointment_time" type="datetime-local" bind:value={rideForm.appointment_time} aria-label="Appointment Time" />
            <p class="text-xs text-gray-500 mt-1">Date &amp; time of the appointment.</p>
          </div>
          <div>
            <label for="pickup_time">Pickup Time</label>
            <Input id="pickup_time" type="datetime-local" bind:value={rideForm.pickup_time} aria-label="Pickup Time" />
            <p class="text-xs text-gray-500 mt-1">Optional pickup date &amp; time.</p>
          </div>
        </div>
      </div>
      {/if}

      {#if createStep === 2}
      <!-- ===== CREATE • Step 2: Pickup & Dropoff ===== -->
      <div class="border rounded-lg p-4 mb-2">
        <h3 class="font-semibold mb-3">Pickup &amp; Dropoff</h3>

        <!-- Pickup controls -->
        <div class="mb-3">
          <div class="flex items-center gap-2">
            <input id="pickup_from_home" type="checkbox" bind:checked={rideForm.pickup_from_home} />
            <label for="pickup_from_home">Pickup from client's home</label>
          </div>
          <p class="text-xs text-gray-500 mt-1">
            If checked, pickup address is auto-filled from the client and locked.
          </p>
        </div>

        <!-- PICKUP (disabled when from home) -->
        <div class="grid gap-3">
          <div>
            <label for="alt_pickup_address">Pickup Street Address</label>
            <Input
              id="alt_pickup_address"
              bind:value={rideForm.alt_pickup_address}
              class={rideForm.pickup_from_home ? 'bg-gray-100' : ''}
              disabled={rideForm.pickup_from_home}
              placeholder="561 Timber Glen Trail"
            />
          </div>

          <div class="grid gap-3 md:grid-cols-3">
            <div>
              <label for="alt_pickup_city">Pickup City</label>
              <Input
                id="alt_pickup_city"
                bind:value={rideForm.alt_pickup_city}
                class={rideForm.pickup_from_home ? 'bg-gray-100' : ''}
                disabled={rideForm.pickup_from_home}
                placeholder="Penfield"
              />
            </div>
            <div>
              <label for="alt_pickup_state">Pickup State</label>
              <Input
                id="alt_pickup_state"
                bind:value={rideForm.alt_pickup_state}
                class={rideForm.pickup_from_home ? 'bg-gray-100' : ''}
                disabled={rideForm.pickup_from_home}
                placeholder="NY"
              />
            </div>
            <div>
              <label for="alt_pickup_zipcode">Pickup ZIP</label>
              <Input
                id="alt_pickup_zipcode"
                bind:value={rideForm.alt_pickup_zipcode}
                class={rideForm.pickup_from_home ? 'bg-gray-100' : ''}
                disabled={rideForm.pickup_from_home}
                placeholder="14625"
              />
            </div>
          </div>

          <div>
            <label for="alt_pickup_address2">Pickup Address 2</label>
            <Input
              id="alt_pickup_address2"
              bind:value={rideForm.alt_pickup_address2}
              class={rideForm.pickup_from_home ? 'bg-gray-100' : ''}
              disabled={rideForm.pickup_from_home}
              placeholder="Apt, Suite, etc."
            />
          </div>
        </div>

        <!-- Saved destination (fills DROPOFF) -->
        <div class="mt-6">
          <label for="saved_destination_create">Use a saved destination</label>
          <select
            id="saved_destination_create"
            bind:value={selectedDestinationId}
            onchange={(e) => applyDestinationToDropoff((e.target as HTMLSelectElement).value)}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">— Select saved destination (optional) —</option>
            {#each filteredDestinations() as d}
              <option value={String(d.destination_id)}>
                {d.location_name || '(No name)'} • {d.address}
                {d.city ? `, ${d.city}` : ''}{d.state ? `, ${d.state}` : ''}{d.zipcode ? ` ${d.zipcode}` : ''}
              </option>
            {/each}
          </select>
          <p class="text-xs text-gray-500 mt-1">Choosing one fills the dropoff fields below.</p>
        </div>

        <!-- DROPOFF -->
        <div class="mt-6">
          <label class="text-sm font-semibold text-gray-700">Dropoff Location</label>
          <p class="text-xs text-gray-500">Where the client will be dropped off.</p>
        </div>

        <div class="mt-3 grid gap-3">
          <div>
            <label for="destination_name">Destination Name *</label>
            <Input id="destination_name" bind:value={rideForm.destination_name} placeholder="e.g., RGH Medical Center" />
          </div>

          <div class="grid gap-3 md:grid-cols-2">
            <div>
              <label for="dropoff_address">Dropoff Street Address *</label>
              <Input id="dropoff_address" bind:value={rideForm.dropoff_address} placeholder="1000 South Ave" />
            </div>
            <div>
              <label for="dropoff_address2">Dropoff Address 2</label>
              <Input id="dropoff_address2" bind:value={rideForm.dropoff_address2} placeholder="Suite, Floor, etc." />
            </div>
          </div>

          <div class="grid gap-3 md:grid-cols-3">
            <div><label for="dropoff_city">Dropoff City *</label><Input id="dropoff_city" bind:value={rideForm.dropoff_city} placeholder="e.g., Rochester" /></div>
            <div><label for="dropoff_state">Dropoff State *</label><Input id="dropoff_state" bind:value={rideForm.dropoff_state} placeholder="e.g., NY" /></div>
            <div><label for="dropoff_zipcode">Dropoff ZIP *</label><Input id="dropoff_zipcode" bind:value={rideForm.dropoff_zipcode} placeholder="e.g., 14620" /></div>
          </div>
        </div>
      </div>
      {/if}

      {#if createStep === 3}
      <!-- Ride Details -->
      <div class="border rounded-lg p-4 mb-2">
        <h3 class="font-semibold mb-3">Ride Details</h3>

        <div class="grid gap-3 md:grid-cols-3">
          <div>
            <label for="purpose" class="block text-sm font-medium text-gray-700">Purpose</label>
            <Input id="purpose" bind:value={rideForm.purpose} placeholder="e.g., Medical" />
          </div>
          <div>
            <label for="estimated_appointment_length" class="block text-sm font-medium text-gray-700">Estimated appointment length</label>
            <Input id="estimated_appointment_length" bind:value={rideForm.estimated_appointment_length} placeholder="e.g., 30 min" />
          </div>
          <div>
            <label for="riders" class="block text-sm font-medium text-gray-700"># of additional passengers (excluding client)</label>
            <Input id="riders" type="number" min="0" bind:value={rideForm.riders} />
          </div>
        </div>

        <div class="mt-3 grid gap-3 md:grid-cols-3">
          <label for="round_trip" class="inline-flex items-center gap-2 cursor-pointer select-none">
            <input id="round_trip" type="checkbox" class="h-4 w-4 text-blue-600 border-gray-300 rounded" bind:checked={rideForm.round_trip} />
            <span class="text-sm font-medium text-gray-700">Round trip</span>
          </label>

          <label for="donation" class="inline-flex items-center gap-2 cursor-pointer select-none">
            <input id="donation" type="checkbox" class="h-4 w-4 text-blue-600 border-gray-300 rounded" bind:checked={rideForm.donation} />
            <span class="text-sm font-medium text-gray-700">Donation?</span>
          </label>

          <div>
            <label for="donation_amount" class="block text-sm font-medium text-gray-700">Donation amount (USD)</label>
            <Input id="donation_amount" type="number" step="0.01" bind:value={rideForm.donation_amount} placeholder="0.00" disabled={!rideForm.donation} class={!rideForm.donation ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''} />
          </div>
        </div>

        <div class="mt-3 grid gap-3 md:grid-cols-2">
          <div>
            <label for="status" class="block text-sm font-medium text-gray-700">Status</label>
            <select id="status" bind:value={rideForm.status} class="w-full px-3 py-2 border border-gray-300 rounded-lg">
              {#each STATUS_OPTIONS as s}<option value={s}>{s}</option>{/each}
            </select>
          </div>
        </div>

        <div class="mt-3">
          <label for="notes" class="block text-sm font-medium text-gray-700">Notes for driver</label>
          <Textarea id="notes" bindvalue={rideForm.notes} placeholder="Anything special the driver should know" />
        </div>
      </div>
      {/if}

      <div class="flex items-center justify-between mt-6">
        <div>
          {#if createStep > 1}
            <button onclick={prevCreate} class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">Back</button>
          {/if}
        </div>
        <div class="flex gap-2">
          <button onclick={() => (showCreateModal = false)} class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
          {#if createStep < 3}
            <button onclick={nextCreate} class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
              Next
            </button>
          {:else}
            <button onclick={createRide} disabled={isUpdating} class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50">
              {isUpdating ? 'Creating...' : 'Create Ride'}
            </button>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- ======= EDIT MODAL ======= -->
{#if showEditModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div class="bg-white rounded-lg p-6 max-w-3xl max-h-[90vh] overflow-y-auto w-full mx-4">
      <div class="mb-4">
        <h2 class="text-xl font-semibold">Edit Ride</h2>
        <p class="text-sm text-gray-600">Update the ride information. Items marked * are required.</p>
      </div>

      <!-- Stepper -->
      <div class="flex items-center justify-center gap-3 mb-4">
        {#each [1,2,3,4] as s}
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm {editStep===s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}">{s}</div>
            {#if s < 4}<div class="w-8 h-[2px] {editStep> s ? 'bg-blue-600' : 'bg-gray-200'}"></div>{/if}
          </div>
        {/each}
      </div>

      {#if stepErrors.length}
        <div class="mb-4 bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm">
          <div class="font-medium mb-1">Please fix the following:</div>
          <ul class="list-disc ml-5">
            {#each stepErrors as e}<li>{e}</li>{/each}
          </ul>
        </div>
      {/if}

      {#if editStep === 1}
      <div class="border rounded-lg p-4 mb-2">
        <h3 class="font-semibold mb-3">Who &amp; When</h3>

        <div class="grid gap-3 md:grid-cols-3">
          <div class="md:col-span-2">
            <label for="e_client_id">Client *</label>
            <select
              id="e_client_id"
              bind:value={rideForm.client_id}
              onchange={onClientChange}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Select client…</option>
              {#each filteredClients() as c}
                <option value={String(c.client_id)}>{c.first_name} {c.last_name}</option>
              {/each}
            </select>
          </div>

          <div>
            <label for="e_dispatcher_display">Dispatcher</label>
            <Input id="e_dispatcher_display" value={dispatcherName()} disabled class="bg-gray-100" />
          </div>

          <div class="md:col-span-3">
            <label for="e_call_id">Linked Call</label>
            <select
              id="e_call_id"
              bind:value={rideForm.call_id}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Select a call (optional)…</option>
              {#each filteredCalls() as call}
                <option value={String(call.call_id)}>
                  {call.call_id} • {new Date(call.call_time).toLocaleString()} • {call.call_type} • {call.caller_first_name} {call.caller_last_name}
                </option>
              {/each}
            </select>
          </div>
        </div>

        <div class="grid gap-3 md:grid-cols-2 mt-3">
          <div>
            <label for="e_appointment_time">Appointment Time *</label>
            <Input id="e_appointment_time" type="datetime-local" bind:value={rideForm.appointment_time} aria-label="Appointment Time" />
            <p class="text-xs text-gray-500 mt-1">Date &amp; time of the appointment.</p>
          </div>
          <div>
            <label for="e_pickup_time">Pickup Time</label>
            <Input id="e_pickup_time" type="datetime-local" bind:value={rideForm.pickup_time} aria-label="Pickup Time" />
            <p class="text-xs text-gray-500 mt-1">Optional pickup date &amp; time.</p>
          </div>
        </div>
      </div>
      {/if}

      {#if editStep === 2}
        <!-- ===== EDIT • Step 2: Pickup & Dropoff ===== -->
        <div class="border rounded-lg p-4 mb-2">
          <h3 class="font-semibold mb-3">Pickup &amp; Dropoff</h3>

          <!-- Pickup controls -->
          <div class="mb-3">
            <div class="flex items-center gap-2">
              <input id="e_pickup_from_home" type="checkbox" bind:checked={rideForm.pickup_from_home} />
              <label for="e_pickup_from_home">Pickup from client's home</label>
            </div>
            <p class="text-xs text-gray-500 mt-1">
              If checked, pickup address is auto-filled from the client and locked.
            </p>
          </div>

          <!-- PICKUP (disabled when from home) -->
          <div class="grid gap-3">
            <div>
              <label for="e_alt_pickup_address">Pickup Street Address</label>
              <Input
                id="e_alt_pickup_address"
                bind:value={rideForm.alt_pickup_address}
                class={rideForm.pickup_from_home ? 'bg-gray-100' : ''}
                disabled={rideForm.pickup_from_home}
                placeholder="561 Timber Glen Trail"
              />
            </div>

            <div class="grid gap-3 md:grid-cols-3">
              <div>
                <label for="e_alt_pickup_city">Pickup City</label>
                <Input
                  id="e_alt_pickup_city"
                  bind:value={rideForm.alt_pickup_city}
                  class={rideForm.pickup_from_home ? 'bg-gray-100' : ''}
                  disabled={rideForm.pickup_from_home}
                  placeholder="Penfield"
                />
              </div>
              <div>
                <label for="e_alt_pickup_state">Pickup State</label>
                <Input
                  id="e_alt_pickup_state"
                  bind:value={rideForm.alt_pickup_state}
                  class={rideForm.pickup_from_home ? 'bg-gray-100' : ''}
                  disabled={rideForm.pickup_from_home}
                  placeholder="NY"
                />
              </div>
              <div>
                <label for="e_alt_pickup_zipcode">Pickup ZIP</label>
                <Input
                  id="e_alt_pickup_zipcode"
                  bind:value={rideForm.alt_pickup_zipcode}
                  class={rideForm.pickup_from_home ? 'bg-gray-100' : ''}
                  disabled={rideForm.pickup_from_home}
                  placeholder="14625"
                />
              </div>
            </div>

            <div>
              <label for="e_alt_pickup_address2">Pickup Address 2</label>
              <Input
                id="e_alt_pickup_address2"
                bind:value={rideForm.alt_pickup_address2}
                class={rideForm.pickup_from_home ? 'bg-gray-100' : ''}
                disabled={rideForm.pickup_from_home}
                placeholder="Apt, Suite, etc."
              />
            </div>
          </div>

          <!-- Saved destination (fills DROPOFF) -->
          <div class="mt-6">
            <label for="saved_destination_edit">Use a saved destination</label>
            <select
              id="saved_destination_edit"
              bind:value={selectedDestinationId}
              onchange={(e) => applyDestinationToDropoff((e.target as HTMLSelectElement).value)}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">— Select saved destination (optional) —</option>
              {#each filteredDestinations() as d}
                <option value={String(d.destination_id)}>
                  {d.location_name || '(No name)'} • {d.address}
                  {d.city ? `, ${d.city}` : ''}{d.state ? `, ${d.state}` : ''}{d.zipcode ? ` ${d.zipcode}` : ''}
                </option>
              {/each}
            </select>
            <p class="text-xs text-gray-500 mt-1">Choosing one fills the dropoff fields below.</p>
          </div>

          <!-- DROPOFF -->
          <div class="mt-6">
            <label class="text-sm font-semibold text-gray-700">Dropoff Location</label>
            <p class="text-xs text-gray-500">Where the client will be dropped off.</p>
          </div>

          <div class="mt-3 grid gap-3">
            <div><label for="e_destination_name">Destination Name *</label><Input id="e_destination_name" bind:value={rideForm.destination_name} placeholder="e.g., RGH Medical Center" /></div>
            <div class="grid gap-3 md:grid-cols-2">
              <div><label for="e_dropoff_address">Dropoff Street Address *</label><Input id="e_dropoff_address" bind:value={rideForm.dropoff_address} placeholder="1000 South Ave" /></div>
              <div><label for="e_dropoff_address2">Dropoff Address 2</label><Input id="e_dropoff_address2" bind:value={rideForm.dropoff_address2} placeholder="Suite, Floor, etc." /></div>
            </div>
            <div class="grid gap-3 md:grid-cols-3">
              <div><label for="e_dropoff_city">Dropoff City *</label><Input id="e_dropoff_city" bind:value={rideForm.dropoff_city} placeholder="e.g., Rochester" /></div>
              <div><label for="e_dropoff_state">Dropoff State *</label><Input id="e_dropoff_state" bind:value={rideForm.dropoff_state} placeholder="e.g., NY" /></div>
              <div><label for="e_dropoff_zipcode">Dropoff ZIP *</label><Input id="e_dropoff_zipcode" bind:value={rideForm.dropoff_zipcode} placeholder="e.g., 14620" /></div>
            </div>
          </div>
        </div>
      {/if}

      {#if editStep === 3}
      <div class="border rounded-lg p-4 mb-2">
        <h3 class="font-semibold mb-3">Ride Details</h3>

        <div class="grid gap-3 md:grid-cols-3">
          <div>
            <label for="e_purpose" class="block text-sm font-medium text-gray-700">Purpose</label>
            <Input id="e_purpose" bind:value={rideForm.purpose} placeholder="e.g., Medical" />
          </div>
          <div>
            <label for="e_est_len" class="block text-sm font-medium text-gray-700">Estimated appointment length</label>
            <Input id="e_est_len" bind:value={rideForm.estimated_appointment_length} placeholder="e.g., 30 min" />
          </div>
          <div>
            <label for="e_riders" class="block text-sm font-medium text-gray-700"># of additional passengers (excluding client)</label>
            <Input id="e_riders" type="number" min="0" bind:value={rideForm.riders} />
          </div>
        </div>

        <div class="mt-3 grid gap-3 md:grid-cols-3">
          <label for="e_round_trip" class="inline-flex items-center gap-2 cursor-pointer select-none">
            <input id="e_round_trip" type="checkbox"
                  class="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  bind:checked={rideForm.round_trip} />
            <span class="text-sm font-medium text-gray-700">Round trip</span>
          </label>

          <label for="e_donation" class="inline-flex items-center gap-2 cursor-pointer select-none">
            <input id="e_donation" type="checkbox"
                  class="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  bind:checked={rideForm.donation} />
            <span class="text-sm font-medium text-gray-700">Donation?</span>
          </label>

          <div>
            <label for="e_donation_amount" class="block text-sm font-medium text-gray-700">Donation amount (USD)</label>
            <Input
              id="e_donation_amount"
              type="number"
              step="0.01"
              bind:value={rideForm.donation_amount}
              placeholder="0.00"
              disabled={!rideForm.donation}
              class={!rideForm.donation ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}
            />
          </div>
        </div>

        <div class="mt-3 grid gap-3 md:grid-cols-2">
          <div>
            <label for="e_status" class="block text-sm font-medium text-gray-700">Status</label>
            <select id="e_status" bind:value={rideForm.status} class="w-full px-3 py-2 border border-gray-300 rounded-lg">
              {#each STATUS_OPTIONS as s}<option value={s}>{s}</option>{/each}
            </select>
          </div>
          <div>
            <label for="e_completion_status" class="block text-sm font-medium text-gray-700">Completion status</label>
            <select id="e_completion_status" bind:value={rideForm.completion_status} class="w-full px-3 py-2 border border-gray-300 rounded-lg">
              <option value="">—</option>
              {#each COMPLETION_STATUS_OPTIONS as s}<option value={s}>{s}</option>{/each}
            </select>
          </div>
        </div>

        <div class="mt-3">
          <label for="e_notes" class="block text-sm font-medium text-gray-700">Notes for driver</label>
          <Textarea id="e_notes" bindvalue={rideForm.notes} placeholder="Anything special the driver should know" />
        </div>
      </div>
      {/if}

      {#if editStep === 4}
      <div class="border rounded-lg p-4 mb-2">
        <h3 class="font-semibold mb-3">Completion / Metrics (Optional)</h3>

        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label for="e_miles" class="block text-sm font-medium text-gray-700">Miles driven</label>
            <Input id="e_miles" type="number" step="0.1" bind:value={rideForm.miles_driven} placeholder="e.g., 12.5" />
            <p class="text-xs text-gray-500 mt-1">Total miles for this ride.</p>
          </div>

          <div>
            <label for="e_hours" class="block text-sm font-medium text-gray-700">Hours worked</label>
            <Input id="e_hours" type="number" step="0.1" bind:value={rideForm.hours} placeholder="e.g., 1.5" />
            <p class="text-xs text-gray-500 mt-1">Driving and waiting time combined.</p>
          </div>
        </div>
      </div>
      {/if}

      <div class="flex items-center justify-between mt-6">
        <div>
          {#if editStep > 1}
            <button onclick={prevEdit} class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">Back</button>
          {/if}
        </div>
        <div class="flex gap-2">
          <button onclick={() => (showEditModal = false)} class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
          {#if editStep < 4}
            <button onclick={nextEdit} class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
              Next
            </button>
          {:else}
            <button onclick={updateRide} disabled={isUpdating} class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50">
              {isUpdating ? 'Updating...' : 'Update Ride'}
            </button>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Existing modals -->
<RideCompletionModal
  bind:show={showConfirmModal}
  ride={selectedRide}
  isDriver={false}
  onSubmit={confirmRideCompletion}
  isSubmitting={isUpdating}
/>
<DriverMatchModal
  bind:show={showDriverMatchModal}
  ride={selectedRideForMatch}
  token={data.session?.access_token}
  onSelectDriver={sendRideRequest}
  isLoading={isUpdating}
/>