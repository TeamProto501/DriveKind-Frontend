<!-- src/routes/dispatcher/rides/CreateRideModal.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { X, Users, MapPin, Calendar, Clock, AlertCircle } from '@lucide/svelte';
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Badge } from "$lib/components/ui/badge";
  
  let {
    clients,
    drivers,
    orgId,
    onClose
  }: {
    clients: any[];
    drivers: any[];
    orgId: number;
    onClose: () => void;
  } = $props();
  
  const dispatch = createEventDispatcher();
  
  let step = $state(1);
  let selectedClient = $state<any>(null);
  let pickupFromHome = $state(true);
  let roundTrip = $state(false);
  let appointmentTime = $state('');
  let pickupTime = $state('');
  let destination = $state('');
  let dropoffAddress = $state('');
  let purpose = $state('');
  let notes = $state('');
  let riders = $state(1);
  let selectedDriver = $state<any>(null);
  let selectedVehicle = $state<any>(null);
  let availableDrivers = $state<any[]>([]);
  let altPickupAddress = $state('');
  
  async function checkDriverAvailability() {
    if (!appointmentTime) return;
    
    const matched = drivers.filter(driver => {
      if (!driver.vehicles || driver.vehicles.length === 0) return false;
      
      const hasMatchingVehicle = driver.vehicles.some((vehicle: any) => {
        if (vehicle.driver_status !== 'active') return false;
        if (selectedClient.service_animal && vehicle.max_passengers < 2) return false;
        if (selectedClient.car_height_needed_enum === 'high' && vehicle.seat_height_enum !== 'high') return false;
        if (riders > vehicle.max_passengers) return false;
        
        return true;
      });
      
      return hasMatchingVehicle;
    });
    
    availableDrivers = matched;
  }
  
  function selectDriver(driver: any, vehicle: any) {
    selectedDriver = driver;
    selectedVehicle = vehicle;
  }
  
  async function submitRide() {
    const formData = new FormData();
    formData.append('org_id', orgId.toString());
    formData.append('client_id', selectedClient.client_id.toString());
    formData.append('driver_user_id', selectedDriver?.user_id || '');
    formData.append('vehicle_id', selectedVehicle?.vehicle_id?.toString() || '');
    formData.append('pickup_from_home', pickupFromHome.toString());
    
    if (!pickupFromHome) {
      formData.append('alt_pickup_address', altPickupAddress);
    }
    
    formData.append('destination_name', destination);
    formData.append('dropoff_address', dropoffAddress);
    formData.append('appointment_time', appointmentTime);
    formData.append('pickup_time', pickupTime);
    formData.append('round_trip', roundTrip.toString());
    formData.append('purpose', purpose);
    formData.append('riders', riders.toString());
    formData.append('notes', notes);
    
    const response = await fetch('?/createRide', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (result.type === 'success') {
      dispatch('created');
      onClose();
    }
  }
  
  $effect(() => {
    if (appointmentTime && selectedClient) {
      checkDriverAvailability();
    }
  });
</script>

<div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
  <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
    <!-- Header -->
    <div class="px-6 py-4 border-b flex items-center justify-between">
      <h2 class="text-xl font-semibold">Create New Ride - Step {step} of 3</h2>
      <button onclick={onClose} class="p-2 hover:bg-gray-100 rounded-lg">
        <X class="w-5 h-5" />
      </button>
    </div>
    
    <!-- Body -->
    <div class="flex-1 overflow-auto p-6">
      {#if step === 1}
        <!-- Step 1: Select Client -->
        <div class="space-y-4">
          <h3 class="text-lg font-medium">Select Client</h3>
          <div class="grid gap-3">
            {#each clients as client}
              <button
                onclick={() => { selectedClient = client; step = 2; }}
                class="p-4 border rounded-lg text-left hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <div class="font-medium">{client.first_name} {client.last_name}</div>
                <div class="text-sm text-gray-600">{client.primary_phone}</div>
                <div class="text-xs text-gray-500 mt-1">
                  {client.street_address}, {client.city}, {client.state}
                </div>
                {#if client.mobility_assistance_enum || client.service_animal}
                  <div class="flex gap-2 mt-2">
                    {#if client.mobility_assistance_enum}
                      <Badge variant="outline">{client.mobility_assistance_enum}</Badge>
                    {/if}
                    {#if client.service_animal}
                      <Badge variant="outline">Service Animal</Badge>
                    {/if}
                  </div>
                {/if}
              </button>
            {/each}
          </div>
        </div>
      {:else if step === 2}
        <!-- Step 2: Ride Details -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-medium">Ride Details</h3>
            <Button variant="outline" size="sm" onclick={() => step = 1}>Change Client</Button>
          </div>
          
          <div class="p-4 bg-gray-50 rounded-lg">
            <div class="font-medium">{selectedClient.first_name} {selectedClient.last_name}</div>
            <div class="text-sm text-gray-600">{selectedClient.primary_phone}</div>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Appointment Date & Time *</label>
              <Input type="datetime-local" bind:value={appointmentTime} required />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Pickup Time (if different)</label>
              <Input type="datetime-local" bind:value={pickupTime} />
            </div>
          </div>
          
          <div>
            <label class="flex items-center gap-2 text-sm">
              <input type="checkbox" bind:checked={pickupFromHome} />
              Pickup from home address
            </label>
          </div>
          
          {#if !pickupFromHome}
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Alternate Pickup Address *</label>
              <Input bind:value={altPickupAddress} placeholder="Enter pickup address" required />
            </div>
          {/if}
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Destination Name *</label>
            <Input bind:value={destination} placeholder="e.g., Strong Memorial Hospital" required />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Dropoff Address *</label>
            <Input bind:value={dropoffAddress} placeholder="Enter dropoff address" required />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Purpose of Trip *</label>
            <Input bind:value={purpose} placeholder="e.g., Medical appointment" required />
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Number of Riders</label>
              <Input type="number" bind:value={riders} min="1" />
            </div>
            <div class="flex items-center">
              <label class="flex items-center gap-2 text-sm">
                <input type="checkbox" bind:checked={roundTrip} />
                Round Trip
              </label>
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea bind:value={notes} class="w-full border rounded-lg px-3 py-2" rows="3"></textarea>
          </div>
        </div>
      {:else if step === 3}
        <!-- Step 3: Select Driver -->
        <div class="space-y-4">
          <h3 class="text-lg font-medium">Select Driver & Vehicle</h3>
          
          {#if availableDrivers.length === 0}
            <div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
              <AlertCircle class="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p class="font-medium text-yellow-900">No drivers available</p>
                <p class="text-sm text-yellow-700">No drivers with appropriate vehicles are available for this time slot.</p>
              </div>
            </div>
          {/if}
          
          <div class="grid gap-3">
            {#each availableDrivers as driver}
              {#each driver.vehicles.filter((v: any) => v.driver_status === 'active') as vehicle}
                <button
                  onclick={() => selectDriver(driver, vehicle)}
                  class="p-4 border rounded-lg text-left hover:border-blue-500 hover:bg-blue-50 transition-colors {selectedDriver?.user_id === driver.user_id && selectedVehicle?.vehicle_id === vehicle.vehicle_id ? 'border-blue-500 bg-blue-50' : ''}"
                >
                  <div class="font-medium">{driver.first_name} {driver.last_name}</div>
                  <div class="text-sm text-gray-600">{driver.primary_phone}</div>
                  <div class="flex gap-2 mt-2">
                    <Badge>{vehicle.type_of_vehicle_enum}</Badge>
                    <Badge variant="outline">{vehicle.seat_height_enum} seat</Badge>
                    <Badge variant="outline">{vehicle.max_passengers} passengers</Badge>
                    <Badge variant="outline">{vehicle.vehicle_color}</Badge>
                  </div>
                </button>
              {/each}
            {/each}
          </div>
        </div>
      {/if}
    </div>
    
    <!-- Footer -->
    <div class="px-6 py-4 border-t flex justify-between">
      <Button variant="outline" onclick={onClose}>Cancel</Button>
      <div class="flex gap-2">
        {#if step > 1}
          <Button variant="outline" onclick={() => step--}>Back</Button>
        {/if}
        {#if step < 3}
          <Button onclick={() => step++} disabled={step === 1 && !selectedClient || step === 2 && (!appointmentTime || !destination || !dropoffAddress || !purpose)}>
            Next
          </Button>
        {:else}
          <Button onclick={submitRide} disabled={!selectedDriver}>Create Ride</Button>
        {/if}
      </div>
    </div>
  </div>
</div>