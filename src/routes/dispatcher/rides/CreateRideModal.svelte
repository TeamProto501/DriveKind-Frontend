<!-- src/routes/dispatcher/rides/CreateRideModal.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { X, AlertCircle, CheckCircle, Clock, Car, Users, Heart, Wind } from '@lucide/svelte';
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
  
  type MatchedDriver = {
    driver: any;
    vehicle: any;
    score: number;
    matchReasons: string[];
    warnings: string[];
  };
  
  let step = $state(1);
  let clientSearchTerm = $state(''); // Add this
  let selectedClient = $state<any>(null)
  let pickupFromHome = $state(true);
  let roundTrip = $state(false);
  let appointmentTime = $state('');
  let appointmentDate = $state('');
  let appointmentTimeOnly = $state('');
  let pickupTime = $state('');
  let destination = $state('');
  let dropoffAddress = $state('');
  let dropoffCity = $state('');
  let dropoffState = $state('');
  let dropoffZipcode = $state('');
  let purpose = $state('');
  let notes = $state('');
  let riders = $state(1);
  let selectedDriver = $state<any>(null);
  let selectedVehicle = $state<any>(null);
  let matchedDrivers = $state<MatchedDriver[]>([]);
  let altPickupAddress = $state('');
  let estimatedLength = $state('');

  let filteredClients = $derived.by(() => {
    if (!clientSearchTerm.trim()) return clients;
    
    const search = clientSearchTerm.toLowerCase();
    return clients.filter(client => {
      const fullName = `${client.first_name} ${client.last_name}`.toLowerCase();
      const phone = client.primary_phone?.toLowerCase() || '';
      const address = `${client.street_address} ${client.city} ${client.state}`.toLowerCase();
      
      return fullName.includes(search) || 
             phone.includes(search) || 
             address.includes(search);
    });
  });
  
  function calculateDriverMatch(driver: any, vehicle: any): MatchedDriver {
    let score = 100;
    const matchReasons: string[] = [];
    const warnings: string[] = [];
    
    // Vehicle capacity check
    if (vehicle.max_passengers < riders + (selectedClient.service_animal ? 1 : 0)) {
      score -= 50;
      warnings.push('Vehicle capacity insufficient');
    } else {
      matchReasons.push('Adequate passenger capacity');
    }
    
    // Seat height match
    if (selectedClient.car_height_needed_enum === 'high') {
      if (vehicle.seat_height_enum === 'high') {
        score += 20;
        matchReasons.push('Perfect seat height match');
      } else {
        score -= 30;
        warnings.push('Seat height may not be suitable');
      }
    }
    
    // Mobility assistance
    if (selectedClient.mobility_assistance_enum) {
      if (vehicle.type_of_vehicle_enum === 'van' || vehicle.type_of_vehicle_enum === 'wheelchair_van') {
        score += 15;
        matchReasons.push('Suitable for mobility assistance');
      } else {
        score -= 20;
        warnings.push('Limited mobility assistance capability');
      }
    }
    
    // Service animal
    if (selectedClient.service_animal) {
      if (vehicle.max_passengers >= riders + 1) {
        matchReasons.push('Can accommodate service animal');
      } else {
        score -= 25;
        warnings.push('May not accommodate service animal');
      }
    }
    
    // Oxygen
    if (selectedClient.oxygen) {
      matchReasons.push('Note: Client requires oxygen');
    }
    
    // Vehicle status
    if (vehicle.driver_status !== 'active') {
      score -= 100;
      warnings.push('Vehicle not currently active');
    }
    
    // Driver preferences (town/destination limitations)
    if (driver.destination_limitation && dropoffCity) {
      if (!driver.destination_limitation.toLowerCase().includes(dropoffCity.toLowerCase())) {
        score -= 15;
        warnings.push('Outside driver\'s preferred area');
      }
    }
    
    return {
      driver,
      vehicle,
      score: Math.max(0, score),
      matchReasons,
      warnings
    };
  }
  
  function matchDrivers() {
    if (!selectedClient || !appointmentTime) return;
    
    const matches: MatchedDriver[] = [];
    
    for (const driver of drivers) {
      if (!driver.vehicles || driver.vehicles.length === 0) continue;
      
      for (const vehicle of driver.vehicles) {
        if (vehicle.driver_status !== 'active') continue;
        
        const match = calculateDriverMatch(driver, vehicle);
        matches.push(match);
      }
    }
    
    // Sort by score descending
    matches.sort((a, b) => b.score - a.score);
    matchedDrivers = matches;
  }
  
  function selectDriver(match: MatchedDriver) {
    selectedDriver = match.driver;
    selectedVehicle = match.vehicle;
  }
  
  function getScoreColor(score: number): string {
    if (score >= 90) return 'bg-green-100 text-green-800 border-green-300';
    if (score >= 70) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (score >= 50) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-red-100 text-red-800 border-red-300';
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
    formData.append('dropoff_city', dropoffCity);
    formData.append('dropoff_state', dropoffState);
    formData.append('dropoff_zipcode', dropoffZipcode);
    formData.append('appointment_time', appointmentTime);
    formData.append('pickup_time', pickupTime);
    formData.append('round_trip', roundTrip.toString());
    formData.append('purpose', purpose);
    formData.append('estimated_appointment_length', estimatedLength);
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
    if (appointmentDate && appointmentTimeOnly) {
      appointmentTime = `${appointmentDate}T${appointmentTimeOnly}`;
    }
  });
  
  $effect(() => {
    if (step === 3 && appointmentTime && selectedClient) {
      matchDrivers();
    }
  });
</script>

<div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
  <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
    <!-- Header -->
    <div class="px-6 py-4 border-b flex items-center justify-between">
      <div>
        <h2 class="text-xl font-semibold">Create New Ride</h2>
        <p class="text-sm text-gray-600">Step {step} of 3</p>
      </div>
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
          
          <!-- Bind the search input -->
          <Input 
            placeholder="Search clients by name, phone, or address..." 
            bind:value={clientSearchTerm}
            class="mb-4" 
          />
          
          {#if filteredClients.length === 0}
            <div class="p-8 text-center text-gray-500">
              <p>No clients found matching "{clientSearchTerm}"</p>
              <Button 
                variant="outline" 
                size="sm" 
                onclick={() => clientSearchTerm = ''}
                class="mt-2"
              >
                Clear Search
              </Button>
            </div>
          {:else}
            <div class="text-sm text-gray-600 mb-2">
              Showing {filteredClients.length} of {clients.length} clients
            </div>
            
            <div class="grid gap-3 max-h-[500px] overflow-y-auto">
              {#each filteredClients as client}
                <button
                  onclick={() => { selectedClient = client; step = 2; clientSearchTerm = ''; }}
                  class="p-4 border rounded-lg text-left hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <!-- ... rest of client button content stays the same ... -->
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {:else if step === 2}
        <!-- Step 2: Ride Details -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-medium">Ride Details</h3>
            <Button variant="outline" size="sm" onclick={() => step = 1}>Change Client</Button>
          </div>
          
          <!-- Client Summary Card -->
          <div class="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div class="flex items-start justify-between mb-3">
              <div>
                <div class="font-semibold text-lg">{selectedClient.first_name} {selectedClient.last_name}</div>
                <div class="text-sm text-gray-700">{selectedClient.primary_phone}</div>
              </div>
              <Users class="w-5 h-5 text-blue-600" />
            </div>
            
            <div class="grid grid-cols-2 gap-2 text-sm">
              {#if selectedClient.mobility_assistance_enum}
                <div class="flex items-center gap-2">
                  <CheckCircle class="w-4 h-4 text-blue-600" />
                  <span>Mobility: {selectedClient.mobility_assistance_enum}</span>
                </div>
              {/if}
              {#if selectedClient.car_height_needed_enum}
                <div class="flex items-center gap-2">
                  <Car class="w-4 h-4 text-blue-600" />
                  <span>Seat: {selectedClient.car_height_needed_enum}</span>
                </div>
              {/if}
              {#if selectedClient.service_animal}
                <div class="flex items-center gap-2">
                  <Heart class="w-4 h-4 text-blue-600" />
                  <span>Service Animal ({selectedClient.service_animal_size_enum})</span>
                </div>
              {/if}
              {#if selectedClient.oxygen}
                <div class="flex items-center gap-2">
                  <Wind class="w-4 h-4 text-blue-600" />
                  <span>Requires Oxygen</span>
                </div>
              {/if}
            </div>
            
            {#if selectedClient.allergies}
              <div class="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm">
                <strong>⚠️ Allergies:</strong> {selectedClient.allergies}
              </div>
            {/if}
            
            {#if selectedClient.other_limitations}
              <div class="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                <strong>Limitations:</strong> {selectedClient.other_limitations}
              </div>
            {/if}
            
            {#if selectedClient.pick_up_instructions}
              <div class="mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-sm">
                <strong>Pickup Instructions:</strong> {selectedClient.pick_up_instructions}
              </div>
            {/if}
          </div>
          
          <!-- Ride Details Form -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Appointment Date *</label>
              <Input type="date" bind:value={appointmentDate} required />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Appointment Time *</label>
              <Input type="time" bind:value={appointmentTimeOnly} required />
            </div>
          </div>
          
          <div>
            <label class="flex items-center gap-2 text-sm">
              <input type="checkbox" bind:checked={pickupFromHome} />
              Pickup from client's home address
            </label>
            {#if pickupFromHome}
              <div class="mt-2 p-3 bg-gray-50 rounded text-sm text-gray-700">
                📍 {selectedClient.street_address}, {selectedClient.city}, {selectedClient.state} {selectedClient.zip_code}
              </div>
            {/if}
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
          
          <div class="grid gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Dropoff Address *</label>
              <Input bind:value={dropoffAddress} placeholder="Street address" required />
            </div>
            <div class="grid grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">City</label>
                <Input bind:value={dropoffCity} placeholder="City" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">State</label>
                <Input bind:value={dropoffState} placeholder="State" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Zip Code</label>
                <Input bind:value={dropoffZipcode} placeholder="Zip" />
              </div>
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Purpose of Trip *</label>
            <Input bind:value={purpose} placeholder="e.g., Medical appointment" required />
          </div>
          
          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Number of Riders</label>
              <Input type="number" bind:value={riders} min="1" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Estimated Length</label>
              <Input bind:value={estimatedLength} placeholder="e.g., 1 hour" />
            </div>
            <div class="flex items-end">
              <label class="flex items-center gap-2 text-sm">
                <input type="checkbox" bind:checked={roundTrip} />
                Round Trip
              </label>
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
            <textarea bind:value={notes} class="w-full border rounded-lg px-3 py-2 text-sm" rows="3" placeholder="Any special instructions or notes..."></textarea>
          </div>
        </div>
      {:else if step === 3}
        <!-- Step 3: Select Driver - Smart Matching -->
        <div class="space-y-4">
          <h3 class="text-lg font-medium">Recommended Drivers</h3>
          
          {#if matchedDrivers.length === 0}
            <div class="p-6 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
              <AlertCircle class="w-6 h-6 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <p class="font-medium text-yellow-900">No drivers available</p>
                <p class="text-sm text-yellow-700 mt-1">No drivers with suitable vehicles are available for this ride.</p>
              </div>
            </div>
          {:else}
            <div class="grid gap-3 max-h-[500px] overflow-y-auto">
              {#each matchedDrivers as match}
                <button
                  onclick={() => selectDriver(match)}
                  class="p-4 border-2 rounded-lg text-left hover:border-blue-500 transition-colors {selectedDriver?.user_id === match.driver.user_id && selectedVehicle?.vehicle_id === match.vehicle.vehicle_id ? 'border-blue-500 bg-blue-50' : ''}"
                >
                  <div class="flex items-start justify-between mb-3">
                    <div class="flex-1">
                      <div class="font-semibold text-lg">{match.driver.first_name} {match.driver.last_name}</div>
                      <div class="text-sm text-gray-600">{match.driver.primary_phone}</div>
                    </div>
                    <div class="flex flex-col items-end gap-2">
                      <Badge class={getScoreColor(match.score) + ' border'}>
                        Match: {match.score}%
                      </Badge>
                    </div>
                  </div>
                  
                  <!-- Vehicle Info -->
                  <div class="flex gap-2 mb-3">
                    <Badge>{match.vehicle.type_of_vehicle_enum}</Badge>
                    <Badge variant="outline">{match.vehicle.seat_height_enum} seat</Badge>
                    <Badge variant="outline">{match.vehicle.max_passengers} passengers</Badge>
                    <Badge variant="outline">{match.vehicle.vehicle_color}</Badge>
                  </div>
                  
                  <!-- Match Reasons -->
                  {#if match.matchReasons.length > 0}
                    <div class="mb-2">
                      {#each match.matchReasons as reason}
                        <div class="flex items-center gap-2 text-sm text-green-700 mb-1">
                          <CheckCircle class="w-4 h-4" />
                          <span>{reason}</span>
                        </div>
                      {/each}
                    </div>
                  {/if}
                  
                  <!-- Warnings -->
                  {#if match.warnings.length > 0}
                    <div>
                      {#each match.warnings as warning}
                        <div class="flex items-center gap-2 text-sm text-amber-700 mb-1">
                          <AlertCircle class="w-4 h-4" />
                          <span>{warning}</span>
                        </div>
                      {/each}
                    </div>
                  {/if}
                </button>
              {/each}
            </div>
          {/if}
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
          <Button 
            onclick={() => step++} 
            disabled={
              (step === 1 && !selectedClient) || 
              (step === 2 && (!appointmentDate || !appointmentTimeOnly || !destination || !dropoffAddress || !purpose))
            }
          >
            Next
          </Button>
        {:else}
          <Button onclick={submitRide} disabled={!selectedDriver}>
            Create Ride
          </Button>
        {/if}
      </div>
    </div>
  </div>
</div>