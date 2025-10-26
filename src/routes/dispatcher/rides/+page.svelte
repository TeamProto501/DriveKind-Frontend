<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import { Select, SelectContent, SelectItem, SelectTrigger } from "$lib/components/ui/select";
  import Textarea from "$lib/components/ui/textarea.svelte";
  // Removed Dialog import - using simple modal approach
  import Label from "$lib/components/ui/label.svelte";
  import { Car, Clock, MapPin, User, Phone, Calendar, Filter, Search, Navigation, Plus, Edit, Trash2, UserCheck } from "@lucide/svelte";
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import type { PageData } from './$types';
  import { 
    validateAddress, 
    validateCity, 
    validateState, 
    validateZipCode, 
    validateText, 
    validateRequired,
    validateDateTime,
    sanitizeInput,
    combineValidations
  } from '$lib/utils/validation';

  let { data }: { data: PageData } = $props();

  let searchTerm = $state("");
  let statusFilter = $state("all");
  let isUpdating = $state(false);
  let showCreateModal = $state(false);
  let showEditModal = $state(false);
  let selectedRide = $state(null);
  let showAssignDriverModal = $state(false);

  // Form data for creating/editing rides
  let rideForm = $state({
    client_id: '',
    client_search: '',
    purpose: '',
    destination_name: '',
    dropoff_address: '',
    dropoff_address2: '',
    dropoff_city: '',
    dropoff_state: '',
    dropoff_zipcode: '',
    appointment_time: '',
    pickup_from_home: true,
    alt_pickup_address: '',
    alt_pickup_address2: '',
    alt_pickup_city: '',
    alt_pickup_state: '',
    alt_pickup_zipcode: '',
    round_trip: false,
    riders: 1,
    estimated_appointment_length: '',
    notes: '',
    donation: false,
    miles_driven: '',
    hours: '',
    status: ''
  });

  // Client search functionality
  let showClientDropdown = $state(false);
  let filteredClients = $derived(() => {
    if (!rideForm.client_search) return data.clients || [];
    return (data.clients || []).filter(client => 
      `${client.first_name} ${client.last_name}`.toLowerCase().includes(rideForm.client_search.toLowerCase()) ||
      client.primary_phone?.includes(rideForm.client_search)
    );
  });

  // Driver search functionality
  let driverSearch = $state('');
  let filteredDrivers = $derived(() => {
    if (!driverSearch) return data.drivers || [];
    return (data.drivers || []).filter(driver => 
      `${driver.first_name} ${driver.last_name}`.toLowerCase().includes(driverSearch.toLowerCase())
    );
  });

  // Filter rides based on search and status
  let filteredRides = $derived(() => {
    if (!data.rides) return [];
    
    return data.rides.filter(ride => {
      const clientName = ride.clients ? `${ride.clients.first_name} ${ride.clients.last_name}` : 'Unknown Client';
      const driverName = ride.drivers ? `${ride.drivers.first_name} ${ride.drivers.last_name}` : '';
      const matchesSearch = clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           ride.destination_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (ride.alt_pickup_address && ride.alt_pickup_address.toLowerCase().includes(searchTerm.toLowerCase())) ||
                           driverName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || ride.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  });

  function getStatusColor(status: string) {
    switch (status) {
      case "Requested": return "bg-gray-100 text-gray-800";
      case "Scheduled": return "bg-blue-100 text-blue-800";
      case "Assigned": return "bg-yellow-100 text-yellow-800";
      case "In Progress": return "bg-orange-100 text-orange-800";
      case "Completed": return "bg-green-100 text-green-800";
      case "Cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  }

  function formatDateTime(timestamp: string) {
    return new Date(timestamp).toLocaleString();
  }

  function formatDate(timestamp: string) {
    return new Date(timestamp).toLocaleDateString();
  }

  function formatTime(timestamp: string) {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function getClientName(ride: any) {
    if (ride.clients) {
      return `${ride.clients.first_name} ${ride.clients.last_name}`;
    }
    return 'Unknown Client';
  }

  function getClientPhone(ride: any) {
    return ride.clients?.primary_phone || 'No phone';
  }

  function getDriverName(ride: any) {
    if (ride.drivers) {
      return `${ride.drivers.first_name} ${ride.drivers.last_name}`;
    }
    return 'Unassigned';
  }

  function openCreateModal() {
    rideForm = {
      client_id: '',
      client_search: '',
      purpose: '',
      destination_name: '',
      dropoff_address: '',
      dropoff_address2: '',
      dropoff_city: '',
      dropoff_state: '',
      dropoff_zipcode: '',
      appointment_time: '',
      pickup_from_home: true,
      alt_pickup_address: '',
      alt_pickup_address2: '',
      alt_pickup_city: '',
      alt_pickup_state: '',
      alt_pickup_zipcode: '',
      round_trip: false,
      riders: 1,
      estimated_appointment_length: '',
      notes: '',
      donation: false,
      miles_driven: '',
      hours: '',
      status: ''
    };
    showClientDropdown = false;
    showCreateModal = true;
  }

  function selectClient(client) {
    rideForm.client_id = client.client_id.toString();
    rideForm.client_search = `${client.first_name} ${client.last_name}`;
    
    // Auto-populate pickup address if "pickup from home" is checked
    if (rideForm.pickup_from_home) {
      rideForm.alt_pickup_address = client.address || '';
      rideForm.alt_pickup_address2 = client.address2 || '';
      rideForm.alt_pickup_city = client.city || '';
      rideForm.alt_pickup_state = client.state || '';
      rideForm.alt_pickup_zipcode = client.zipcode || '';
    }
    
    showClientDropdown = false;
  }

  function clearClient() {
    rideForm.client_id = '';
    rideForm.client_search = '';
    showClientDropdown = false;
  }
  
  // Auto-populate address when checkbox changes
  function handlePickupHomeChange() {
    if (rideForm.pickup_from_home && rideForm.client_id) {
      const selectedClient = data.clients.find(c => c.client_id.toString() === rideForm.client_id);
      if (selectedClient) {
        rideForm.alt_pickup_address = selectedClient.address || '';
        rideForm.alt_pickup_address2 = selectedClient.address2 || '';
        rideForm.alt_pickup_city = selectedClient.city || '';
        rideForm.alt_pickup_state = selectedClient.state || '';
        rideForm.alt_pickup_zipcode = selectedClient.zipcode || '';
      }
    }
  }

  function openEditModal(ride: any) {
    selectedRide = ride;
    rideForm = {
      client_id: ride.client_id?.toString() || '',
      purpose: ride.purpose || '',
      destination_name: ride.destination_name || '',
      dropoff_address: ride.dropoff_address || '',
      dropoff_address2: ride.dropoff_address2 || '',
      dropoff_city: ride.dropoff_city || '',
      dropoff_state: ride.dropoff_state || '',
      dropoff_zipcode: ride.dropoff_zipcode || '',
      appointment_time: ride.appointment_time ? new Date(ride.appointment_time).toISOString().slice(0, 16) : '',
      pickup_from_home: ride.pickup_from_home || false,
      alt_pickup_address: ride.alt_pickup_address || '',
      alt_pickup_address2: ride.alt_pickup_address2 || '',
      alt_pickup_city: ride.alt_pickup_city || '',
      alt_pickup_state: ride.alt_pickup_state || '',
      alt_pickup_zipcode: ride.alt_pickup_zipcode || '',
      round_trip: ride.round_trip || false,
      riders: ride.riders || 1,
      estimated_appointment_length: ride.estimated_appointment_length || '',
      notes: ride.notes || '',
      donation: ride.donation || false,
      miles_driven: ride.miles_driven?.toString() || '',
      hours: ride.hours?.toString() || '',
      status: ride.status || ''
    };
    showEditModal = true;
  }

  function openAssignDriverModal(ride: any) {
    selectedRide = ride;
    showAssignDriverModal = true;
  }

  async function createRide() {
    // Validate all required fields and formats
    const validations = combineValidations(
      validateRequired(rideForm.client_id, 'Client'),
      validateRequired(rideForm.purpose, 'Purpose'),
      validateRequired(rideForm.destination_name, 'Destination name'),
      validateText(rideForm.destination_name, 'Destination name', 200, true),
      validateAddress(rideForm.dropoff_address, 'Dropoff address'),
      validateCity(rideForm.dropoff_city),
      validateState(rideForm.dropoff_state),
      validateZipCode(rideForm.dropoff_zipcode),
      validateDateTime(rideForm.appointment_time, 'Appointment time'),
      // Validate alternative pickup address if provided
      rideForm.alt_pickup_address ? validateAddress(rideForm.alt_pickup_address, 'Alternative pickup address') : { valid: true, errors: [] },
      rideForm.alt_pickup_city ? validateCity(rideForm.alt_pickup_city) : { valid: true, errors: [] },
      rideForm.alt_pickup_state ? validateState(rideForm.alt_pickup_state) : { valid: true, errors: [] },
      rideForm.alt_pickup_zipcode ? validateZipCode(rideForm.alt_pickup_zipcode) : { valid: true, errors: [] },
      rideForm.notes ? validateText(rideForm.notes, 'Notes', 500, false) : { valid: true, errors: [] }
    );

    if (!validations.valid) {
      alert('Please fix the following errors:\n• ' + validations.errors.join('\n• '));
      return;
    }

    isUpdating = true;
    try {
      // Sanitize all text inputs before sending
      const sanitizedForm = {
        ...rideForm,
        destination_name: sanitizeInput(rideForm.destination_name),
        dropoff_address: sanitizeInput(rideForm.dropoff_address),
        dropoff_address2: sanitizeInput(rideForm.dropoff_address2),
        dropoff_city: sanitizeInput(rideForm.dropoff_city),
        dropoff_state: sanitizeInput(rideForm.dropoff_state),
        dropoff_zipcode: sanitizeInput(rideForm.dropoff_zipcode),
        alt_pickup_address: sanitizeInput(rideForm.alt_pickup_address),
        alt_pickup_address2: sanitizeInput(rideForm.alt_pickup_address2),
        alt_pickup_city: sanitizeInput(rideForm.alt_pickup_city),
        alt_pickup_state: sanitizeInput(rideForm.alt_pickup_state),
        alt_pickup_zipcode: sanitizeInput(rideForm.alt_pickup_zipcode),
        notes: sanitizeInput(rideForm.notes)
      };
      
      const response = await fetch('/dispatcher/rides/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sanitizedForm)
      });

      if (response.ok) {
        showCreateModal = false;
        await invalidateAll();
        alert('Ride created successfully!');
      } else {
        const error = await response.json();
        alert(`Failed to create ride: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating ride:', error);
      alert('Error creating ride. Please try again.');
    } finally {
      isUpdating = false;
    }
  }

  async function updateRide() {
    // Validate all fields using the same validation as create
    const validations = combineValidations(
      validateRequired(rideForm.client_id, 'Client'),
      validateRequired(rideForm.purpose, 'Purpose'),
      validateRequired(rideForm.destination_name, 'Destination name'),
      validateText(rideForm.destination_name, 'Destination name', 200, true),
      validateAddress(rideForm.dropoff_address, 'Dropoff address'),
      validateCity(rideForm.dropoff_city),
      validateState(rideForm.dropoff_state),
      validateZipCode(rideForm.dropoff_zipcode),
      validateDateTime(rideForm.appointment_time, 'Appointment time'),
      // Validate alternative pickup address if provided
      rideForm.alt_pickup_address ? validateAddress(rideForm.alt_pickup_address, 'Alternative pickup address') : { valid: true, errors: [] },
      rideForm.alt_pickup_city ? validateCity(rideForm.alt_pickup_city) : { valid: true, errors: [] },
      rideForm.alt_pickup_state ? validateState(rideForm.alt_pickup_state) : { valid: true, errors: [] },
      rideForm.alt_pickup_zipcode ? validateZipCode(rideForm.alt_pickup_zipcode) : { valid: true, errors: [] },
      rideForm.notes ? validateText(rideForm.notes, 'Notes', 500, false) : { valid: true, errors: [] }
    );

    if (!validations.valid) {
      alert('Please fix the following errors:\n• ' + validations.errors.join('\n• '));
      return;
    }

    isUpdating = true;
    try {
      // Sanitize all text inputs before sending
      const sanitizedForm = {
        ...rideForm,
        destination_name: sanitizeInput(rideForm.destination_name),
        dropoff_address: sanitizeInput(rideForm.dropoff_address),
        dropoff_address2: sanitizeInput(rideForm.dropoff_address2),
        dropoff_city: sanitizeInput(rideForm.dropoff_city),
        dropoff_state: sanitizeInput(rideForm.dropoff_state),
        dropoff_zipcode: sanitizeInput(rideForm.dropoff_zipcode),
        alt_pickup_address: sanitizeInput(rideForm.alt_pickup_address),
        alt_pickup_address2: sanitizeInput(rideForm.alt_pickup_address2),
        alt_pickup_city: sanitizeInput(rideForm.alt_pickup_city),
        alt_pickup_state: sanitizeInput(rideForm.alt_pickup_state),
        alt_pickup_zipcode: sanitizeInput(rideForm.alt_pickup_zipcode),
        notes: sanitizeInput(rideForm.notes),
        miles_driven: rideForm.miles_driven ? parseFloat(rideForm.miles_driven) : null,
        hours: rideForm.hours ? parseFloat(rideForm.hours) : null
      };
      
      const response = await fetch(`/dispatcher/rides/update/${selectedRide.ride_id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sanitizedForm)
      });

      if (response.ok) {
        showEditModal = false;
        selectedRide = null;
        await invalidateAll();
        alert('Ride updated successfully!');
      } else {
        const error = await response.json();
        alert(`Failed to update ride: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating ride:', error);
      alert('Error updating ride. Please try again.');
    } finally {
      isUpdating = false;
    }
  }

  async function assignDriver(driverId: string) {
  console.log('Assigning driver:', driverId, 'to ride:', selectedRide.ride_id);
  
  isUpdating = true;
  try {
    // Call your Express API endpoint
    const url = `${import.meta.env.VITE_API_URL}/rides/${selectedRide.ride_id}/assign`;
    const payload = { driver_user_id: driverId };
    
    console.log('Fetching:', url);
    console.log('Payload:', payload);
    
    // Get the auth token from your session
    const token = data.session?.access_token;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    console.log('Response status:', response.status);
    const result = await response.json();
    console.log('Response body:', result);

    if (response.ok && result.success) {
      showAssignDriverModal = false;
      selectedRide = null;
      await invalidateAll();
      alert('Driver assigned successfully!');
    } else {
      console.error('Failed to assign driver:', result);
      alert(`Failed to assign driver: ${result.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error assigning driver:', error);
    alert('Error assigning driver. Check console for details.');
  } finally {
    isUpdating = false;
  }
}

  async function updateRideStatus(rideId: number, newStatus: string) {
    isUpdating = true;
    try {
      const response = await fetch(`/dispatcher/rides/status/${rideId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        await invalidateAll();
      } else {
        console.error('Failed to update ride status');
      }
    } catch (error) {
      console.error('Error updating ride status:', error);
    } finally {
      isUpdating = false;
    }
  }
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

    <!-- Error Message -->
    {#if data.error}
      <div class="bg-red-50 border border-red-200 rounded-lg p-4">
        <p class="text-red-800">{data.error}</p>
  </div>
    {/if}

  <!-- Filters -->
    <div class="bg-white rounded-lg shadow-sm border p-6">
      <div class="flex items-center gap-2 mb-4">
        <Filter class="w-5 h-5 text-gray-600" />
        <h2 class="text-lg font-semibold text-gray-900">Filters</h2>
      </div>
      <div class="flex gap-4">
        <div class="flex-1">
          <div class="relative">
            <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text"
              placeholder="Search rides..." 
              bind:value={searchTerm}
              class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <div class="w-48">
          <select 
            bind:value={statusFilter}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="Requested">Requested</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>
    </div>

  <!-- Rides List -->
    <div class="space-y-4">
    {#each filteredRides() as ride}
        <div class="bg-white rounded-lg shadow-sm border p-6">
          <div class="flex items-start justify-between">
            <div class="space-y-3">
              <div class="flex items-center gap-3">
                <h3 class="text-lg font-semibold text-gray-900">{getClientName(ride)}</h3>
                <span class="px-2 py-1 text-xs font-medium rounded-full {getStatusColor(ride.status)}">
                  {ride.status.toUpperCase()}
                </span>
                <span class="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                  {ride.purpose}
                </span>
              </div>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div class="flex items-center gap-2">
                  <Phone class="w-4 h-4 text-gray-400" />
                  {getClientPhone(ride)}
                </div>
                <div class="flex items-center gap-2">
                  <Calendar class="w-4 h-4 text-gray-400" />
                  {formatDate(ride.appointment_time)} at {formatTime(ride.appointment_time)}
                </div>
                <div class="flex items-center gap-2">
                  <User class="w-4 h-4 text-gray-400" />
                  Driver: {getDriverName(ride)}
                </div>
                <div class="flex items-center gap-2">
                  <MapPin class="w-4 h-4 text-gray-400" />
                  <div>
                    <div class="font-medium text-gray-900">Pickup:</div>
                    {#if ride.pickup_from_home}
                      <div class="text-gray-600">Client's Home</div>
                    {:else if ride.alt_pickup_address}
                      <div class="text-gray-600">{ride.alt_pickup_address}</div>
                      {#if ride.alt_pickup_address2}
                        <div class="text-gray-600">{ride.alt_pickup_address2}</div>
                      {/if}
                      <div class="text-gray-600">{ride.alt_pickup_city}, {ride.alt_pickup_state} {ride.alt_pickup_zipcode}</div>
                    {:else}
                      <div class="text-gray-600">Client's Home</div>
                    {/if}
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <MapPin class="w-4 h-4 text-gray-400" />
                  <div>
                    <div class="font-medium text-gray-900">Dropoff:</div>
                    <div class="text-gray-600">{ride.destination_name}</div>
                    <div class="text-gray-600">{ride.dropoff_address}</div>
                    {#if ride.dropoff_address2}
                      <div class="text-gray-600">{ride.dropoff_address2}</div>
                    {/if}
                    <div class="text-gray-600">{ride.dropoff_city}, {ride.dropoff_state} {ride.dropoff_zipcode}</div>
                  </div>
                </div>
                {#if ride.estimated_appointment_length}
                  <div class="flex items-center gap-2">
                    <Clock class="w-4 h-4" />
                    Estimated: {ride.estimated_appointment_length}
                  </div>
                {/if}
                {#if ride.round_trip}
                <div class="flex items-center gap-2">
                  <Car class="w-4 h-4" />
                    Round trip
                  </div>
                {/if}
                {#if ride.riders > 0}
                  <div class="flex items-center gap-2">
                    <User class="w-4 h-4" />
                    {ride.riders} passenger{ride.riders > 1 ? 's' : ''}
                </div>
                {/if}
              </div>
              
              {#if ride.notes}
                <div class="text-sm">
                  <span class="font-medium">Notes:</span> {ride.notes}
                </div>
              {/if}
            </div>
            
            <div class="flex gap-2">
              {#if ride.status === "Requested" || ride.status === "Scheduled"}
                <button 
                  onclick={() => openAssignDriverModal(ride)}
                  disabled={isUpdating}
                  class="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-colors disabled:opacity-50"
                >
                  <UserCheck class="w-4 h-4" />
                  Assign Driver
                </button>
              {/if}
              
              <button 
                onclick={() => openEditModal(ride)}
                disabled={isUpdating}
                class="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                <Edit class="w-4 h-4" />
                Edit
              </button>
              
              {#if ride.status === "Requested"}
                <button 
                  onclick={() => updateRideStatus(ride.ride_id, 'Scheduled')}
                  disabled={isUpdating}
                  class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  Schedule
                </button>
              {:else if ride.status === "Scheduled"}
                <button 
                  onclick={() => updateRideStatus(ride.ride_id, 'Requested')}
                  disabled={isUpdating}
                  class="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  Unschedule
                </button>
              {:else if ride.status === "Assigned"}
                <button 
                  onclick={() => updateRideStatus(ride.ride_id, 'In Progress')}
                  disabled={isUpdating}
                  class="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  Start Ride
                </button>
              {:else if ride.status === "In Progress"}
                <button 
                  onclick={() => updateRideStatus(ride.ride_id, 'Completed')}
                  disabled={isUpdating}
                  class="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  Complete
                </button>
              {/if}
            </div>
          </div>
        </div>
    {/each}
  </div>

  {#if filteredRides().length === 0}
      <div class="bg-white rounded-lg shadow-sm border p-12 text-center">
        <Car class="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <h3 class="text-lg font-semibold text-gray-900 mb-2">No rides found</h3>
        <p class="text-gray-600">
          {#if data.rides && data.rides.length === 0}
            No rides have been created yet.
          {:else}
            No rides match your current filters.
          {/if}
        </p>
      </div>
  {/if}
  </div>
</div>

<!-- Create Ride Modal -->
{#if showCreateModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div class="bg-white rounded-lg p-6 max-w-2xl max-h-[90vh] overflow-y-auto w-full mx-4">
      <div class="mb-4">
        <h2 class="text-xl font-semibold">Create New Ride</h2>
        <p class="text-sm text-gray-600">Create a new ride request for a client.</p>
      </div>
    
    <div class="grid gap-4 py-4">
      <div class="grid grid-cols-2 gap-4">
        <div class="relative">
          <Label for="client_search">Client *</Label>
          <div class="relative">
            <input 
              id="client_search"
              type="text"
              bind:value={rideForm.client_search}
              onfocus={() => showClientDropdown = true}
              placeholder="Search for client..."
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {#if rideForm.client_id}
              <button 
                onclick={clearClient}
                class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            {/if}
          </div>
          
          {#if showClientDropdown && filteredClients().length > 0}
            <div class="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {#each filteredClients() as client}
                <button
                  onclick={() => selectClient(client)}
                  class="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center justify-between"
                >
                  <div>
                    <div class="font-medium">{client.first_name} {client.last_name}</div>
                    <div class="text-sm text-gray-500">{client.primary_phone}</div>
                  </div>
                </button>
              {/each}
            </div>
          {/if}
        </div>
        
        <div>
          <Label for="purpose">Purpose *</Label>
          <select 
            id="purpose"
            bind:value={rideForm.purpose}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select purpose</option>
            <option value="Medical">Medical</option>
            <option value="Shopping">Shopping</option>
            <option value="Social">Social</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>
      
      <div>
        <Label for="destination_name">Destination Name *</Label>
        <input 
          id="destination_name" 
          type="text"
          bind:value={rideForm.destination_name} 
          placeholder="e.g., Strong Memorial Hospital"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      
      <div>
        <Label for="dropoff_address">Dropoff Address *</Label>
        <input 
          id="dropoff_address" 
          type="text"
          bind:value={rideForm.dropoff_address} 
          placeholder="Street address"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      
      <div class="grid grid-cols-3 gap-4">
        <div>
          <Label for="dropoff_city">City *</Label>
          <input 
            id="dropoff_city" 
            type="text"
            bind:value={rideForm.dropoff_city}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <Label for="dropoff_state">State *</Label>
          <input 
            id="dropoff_state" 
            type="text"
            bind:value={rideForm.dropoff_state}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <Label for="dropoff_zipcode">ZIP Code *</Label>
          <input 
            id="dropoff_zipcode" 
            type="text"
            bind:value={rideForm.dropoff_zipcode}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
      
      <div>
        <Label for="appointment_time">Appointment Time *</Label>
        <input 
          id="appointment_time" 
          type="datetime-local" 
          bind:value={rideForm.appointment_time}
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      
      <div class="flex items-center space-x-2">
        <input type="checkbox" id="pickup_from_home" bind:checked={rideForm.pickup_from_home} onchange={handlePickupHomeChange} />
        <Label for="pickup_from_home">Pickup from client's home</Label>
      </div>
      
      {#if !rideForm.pickup_from_home}
        <div>
          <Label for="alt_pickup_address">Alternative Pickup Address</Label>
          <Input id="alt_pickup_address" bind:value={rideForm.alt_pickup_address} />
        </div>
        
        <div class="grid grid-cols-3 gap-4">
          <div>
            <Label for="alt_pickup_city">City</Label>
            <Input id="alt_pickup_city" bind:value={rideForm.alt_pickup_city} />
          </div>
          <div>
            <Label for="alt_pickup_state">State</Label>
            <Input id="alt_pickup_state" bind:value={rideForm.alt_pickup_state} />
          </div>
          <div>
            <Label for="alt_pickup_zipcode">ZIP Code</Label>
            <Input id="alt_pickup_zipcode" bind:value={rideForm.alt_pickup_zipcode} />
          </div>
        </div>
      {/if}
      
      <div class="grid grid-cols-2 gap-4">
        <div>
          <Label for="riders">Number of Passengers</Label>
          <Input id="riders" type="number" min="1" bind:value={rideForm.riders} />
        </div>
        
        <div>
          <Label for="estimated_appointment_length">Estimated Duration</Label>
          <Input id="estimated_appointment_length" bind:value={rideForm.estimated_appointment_length} placeholder="e.g., 2 hours" />
        </div>
      </div>
      
      <div class="flex items-center space-x-2">
        <input type="checkbox" id="round_trip" bind:checked={rideForm.round_trip} />
        <Label for="round_trip">Round trip</Label>
      </div>
      
      <div class="flex items-center space-x-2">
        <input type="checkbox" id="donation" bind:checked={rideForm.donation} />
        <Label for="donation">Donation ride</Label>
      </div>
      
      <div>
        <Label for="notes">Notes</Label>
        <Textarea id="notes" bind:value={rideForm.notes} placeholder="Additional notes or special requirements" />
      </div>
    </div>
    
      <div class="flex justify-end gap-2 mt-6">
        <button 
          onclick={() => showCreateModal = false}
          class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button 
          onclick={createRide} 
          disabled={isUpdating}
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {isUpdating ? 'Creating...' : 'Create Ride'}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Edit Ride Modal -->
{#if showEditModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div class="bg-white rounded-lg p-6 max-w-2xl max-h-[90vh] overflow-y-auto w-full mx-4">
      <div class="mb-4">
        <h2 class="text-xl font-semibold">Edit Ride</h2>
        <p class="text-sm text-gray-600">Update ride information.</p>
      </div>
    
    <div class="grid gap-4 py-4">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <Label for="edit_client_id">Client</Label>
          <Select bind:value={rideForm.client_id}>
            <SelectTrigger>
              <span>Select client</span>
            </SelectTrigger>
            <SelectContent>
              {#each data.clients as client}
                <SelectItem value={client.client_id.toString()}>
                  {client.first_name} {client.last_name}
                </SelectItem>
              {/each}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label for="edit_purpose">Purpose</Label>
          <Select bind:value={rideForm.purpose}>
            <SelectTrigger>
              <span>Select purpose</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Medical">Medical</SelectItem>
              <SelectItem value="Shopping">Shopping</SelectItem>
              <SelectItem value="Social">Social</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div>
        <Label for="edit_destination_name">Destination Name</Label>
        <Input id="edit_destination_name" bind:value={rideForm.destination_name} />
      </div>
      
      <div>
        <Label for="edit_dropoff_address">Dropoff Address</Label>
        <Input id="edit_dropoff_address" bind:value={rideForm.dropoff_address} />
      </div>
      
      <div class="grid grid-cols-3 gap-4">
        <div>
          <Label for="edit_dropoff_city">City</Label>
          <Input id="edit_dropoff_city" bind:value={rideForm.dropoff_city} />
        </div>
        <div>
          <Label for="edit_dropoff_state">State</Label>
          <Input id="edit_dropoff_state" bind:value={rideForm.dropoff_state} />
        </div>
        <div>
          <Label for="edit_dropoff_zipcode">ZIP Code</Label>
          <Input id="edit_dropoff_zipcode" bind:value={rideForm.dropoff_zipcode} />
        </div>
      </div>
      
      <div>
        <Label for="edit_appointment_time">Appointment Time</Label>
        <Input id="edit_appointment_time" type="datetime-local" bind:value={rideForm.appointment_time} />
      </div>
      
      <div class="flex items-center space-x-2">
        <input type="checkbox" id="edit_pickup_from_home" bind:checked={rideForm.pickup_from_home} />
        <Label for="edit_pickup_from_home">Pickup from client's home</Label>
      </div>
      
      {#if !rideForm.pickup_from_home}
        <div>
          <Label for="edit_alt_pickup_address">Alternative Pickup Address</Label>
          <Input id="edit_alt_pickup_address" bind:value={rideForm.alt_pickup_address} />
        </div>
        
        <div class="grid grid-cols-3 gap-4">
          <div>
            <Label for="edit_alt_pickup_city">City</Label>
            <Input id="edit_alt_pickup_city" bind:value={rideForm.alt_pickup_city} />
          </div>
          <div>
            <Label for="edit_alt_pickup_state">State</Label>
            <Input id="edit_alt_pickup_state" bind:value={rideForm.alt_pickup_state} />
          </div>
          <div>
            <Label for="edit_alt_pickup_zipcode">ZIP Code</Label>
            <Input id="edit_alt_pickup_zipcode" bind:value={rideForm.alt_pickup_zipcode} />
          </div>
        </div>
      {/if}
      
      <div class="grid grid-cols-2 gap-4">
        <div>
          <Label for="edit_riders">Number of Passengers</Label>
          <Input id="edit_riders" type="number" min="1" bind:value={rideForm.riders} />
        </div>
        
        <div>
          <Label for="edit_estimated_appointment_length">Estimated Duration</Label>
          <Input id="edit_estimated_appointment_length" bind:value={rideForm.estimated_appointment_length} />
        </div>
      </div>
      
      <div class="flex items-center space-x-2">
        <input type="checkbox" id="edit_round_trip" bind:checked={rideForm.round_trip} />
        <Label for="edit_round_trip">Round trip</Label>
      </div>
      
      <div class="flex items-center space-x-2">
        <input type="checkbox" id="edit_donation" bind:checked={rideForm.donation} />
        <Label for="edit_donation">Donation ride</Label>
      </div>
      
      <!-- Ride Completion Data (for completed rides) -->
      {#if rideForm.status === 'Completed'}
        <div class="border-t border-gray-200 pt-4 mt-4">
          <h3 class="text-lg font-semibold mb-4">Ride Completion Details</h3>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <Label for="edit_miles_driven">Miles Driven</Label>
              <Input 
                id="edit_miles_driven" 
                type="number" 
                step="0.1" 
                bind:value={rideForm.miles_driven} 
                placeholder="0.0"
              />
            </div>
            
            <div>
              <Label for="edit_hours">Hours</Label>
              <Input 
                id="edit_hours" 
                type="number" 
                step="0.1" 
                bind:value={rideForm.hours} 
                placeholder="0.0"
              />
            </div>
          </div>
        </div>
      {/if}
      
      <div>
        <Label for="edit_notes">Notes</Label>
        <Textarea id="edit_notes" bind:value={rideForm.notes} />
      </div>
    </div>
    
      <div class="flex justify-end gap-2 mt-6">
        <button 
          onclick={() => showEditModal = false}
          class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button 
          onclick={updateRide} 
          disabled={isUpdating}
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {isUpdating ? 'Updating...' : 'Update Ride'}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Assign Driver Modal -->
{#if showAssignDriverModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
      <div class="mb-4">
        <h2 class="text-xl font-semibold">Assign Driver</h2>
        <p class="text-sm text-gray-600">Select a driver for this ride.</p>
      </div>
      
      <!-- Driver Search -->
      <div class="mb-4">
        <input 
          type="text"
          bind:value={driverSearch}
          placeholder="Search drivers..."
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      
      <div class="space-y-2 mb-6 max-h-64 overflow-y-auto">
        {#each filteredDrivers() as driver}
          <div class="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
            <div>
              <div class="font-medium text-gray-900">{driver.first_name} {driver.last_name}</div>
              <div class="text-sm text-gray-500">Driver</div>
            </div>
            <button 
              onclick={() => assignDriver(driver.user_id)}
              disabled={isUpdating}
              class="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              Assign
            </button>
          </div>
        {/each}
        
        {#if filteredDrivers().length === 0}
          <div class="text-center py-4 text-gray-500">
            No drivers found
          </div>
        {/if}
      </div>
      
      <div class="flex justify-end">
        <button 
          onclick={() => showAssignDriverModal = false}
          class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
{/if}