<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import { Select, SelectContent, SelectItem, SelectTrigger } from "$lib/components/ui/select";
  import { Label } from "$lib/components/ui/label";
  import { Car, Clock, MapPin, User, Phone, Calendar, Filter, Search, Navigation, Play, CheckCircle, XCircle, X, AlertTriangle } from "@lucide/svelte";
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let searchTerm = $state("");
  let statusFilter = $state("all");
  let isUpdating = $state(false);
  
  // Ride completion modal state
  let showCompletionModal = $state(false);
  let selectedRideId: number | null = null;
  let completionData = $state({
    miles_driven: '',
    hours: '',
    riders: '',
    donation: false,
    notes: ''
  });
  let reasonabilityWarning = $state(false);
  let reasonabilityMessage = $state('');

  // Filter rides based on search and status
  let filteredRides = $derived(() => {
    if (!data.rides) return [];
    
    return data.rides.filter(ride => {
      const clientName = ride.clients ? `${ride.clients.first_name} ${ride.clients.last_name}` : 'Unknown Client';
      const matchesSearch = clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           ride.dropoff_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (ride.alt_pickup_address && ride.alt_pickup_address.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === "all" || ride.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  });

  function getStatusColor(status: string) {
    switch (status) {
      case "Pending": return "bg-gray-100 text-gray-800";
      case "Assigned": return "bg-blue-100 text-blue-800";
      case "In Progress": return "bg-yellow-100 text-yellow-800";
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

  async function updateRideStatus(rideId: number, newStatus: string) {
    isUpdating = true;
    try {
      const response = await fetch(`/driver/rides/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rideId,
          status: newStatus
        })
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

  async function startRide(rideId: number) {
    await updateRideStatus(rideId, 'In Progress');
  }

  function completeRide(rideId: number) {
    selectedRideId = rideId;
    const ride = data.rides.find(r => r.ride_id === rideId);
    
    // Pre-fill with existing values if available
    if (ride) {
      completionData = {
        miles_driven: ride.miles_driven?.toString() || '',
        hours: ride.hours?.toString() || '',
        riders: ride.riders?.toString() || '',
        donation: ride.donation || false,
        notes: ride.notes || ''
      };
    }
    
    showCompletionModal = true;
    reasonabilityWarning = false;
    reasonabilityMessage = '';
  }
  
  function closeCompletionModal() {
    showCompletionModal = false;
    selectedRideId = null;
    completionData = {
      miles_driven: '',
      hours: '',
      riders: '',
      donation: false,
      notes: ''
    };
    reasonabilityWarning = false;
    reasonabilityMessage = '';
  }
  
  function checkReasonability(miles: string): boolean {
    const milesValue = parseFloat(miles);
    if (isNaN(milesValue) || milesValue <= 0) {
      return false;
    }
    
    // Reasonability check: more than 200 miles might be unusual
    if (milesValue > 200) {
      reasonabilityWarning = true;
      reasonabilityMessage = `You've entered ${milesValue} miles. This seems unusually high. Please confirm this is correct.`;
      return false;
    }
    
    reasonabilityWarning = false;
    reasonabilityMessage = '';
    return true;
  }
  
  async function submitRideCompletion() {
    if (!selectedRideId) return;
    
    // Reasonability check for mileage
    if (!checkReasonability(completionData.miles_driven)) {
      return; // Show warning, don't submit yet
    }
    
    isUpdating = true;
    try {
      const response = await fetch(`/driver/rides/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rideId: selectedRideId,
          miles_driven: parseFloat(completionData.miles_driven) || null,
          hours: parseFloat(completionData.hours) || null,
          riders: parseInt(completionData.riders) || null,
          donation: completionData.donation,
          notes: completionData.notes || null,
          status: 'Completed'
        })
      });

      if (response.ok) {
        await invalidateAll();
        closeCompletionModal();
      } else {
        console.error('Failed to complete ride');
      }
    } catch (error) {
      console.error('Error completing ride:', error);
    } finally {
      isUpdating = false;
    }
  }

  async function cancelRide(rideId: number) {
    await updateRideStatus(rideId, 'Cancelled');
  }
</script>

<svelte:head>
  <title>My Rides - DriveKind</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">My Rides</h1>
      <p class="text-muted-foreground">View and manage your assigned rides</p>
    </div>
    <div class="flex gap-2">
      <Button variant="outline">
        <Navigation class="w-4 h-4 mr-2" />
        Navigation
      </Button>
      <Button>
        <Car class="w-4 h-4 mr-2" />
        Go Online
      </Button>
    </div>
  </div>

  <!-- Error Message -->
  {#if data.error}
    <Card class="border-red-200 bg-red-50">
      <CardContent class="p-4">
        <p class="text-red-800">{data.error}</p>
      </CardContent>
    </Card>
  {/if}

  <!-- Filters -->
  <Card>
    <CardHeader>
      <CardTitle class="flex items-center gap-2">
        <Filter class="w-5 h-5" />
        Filters
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div class="flex gap-4">
        <div class="flex-1">
          <div class="relative">
            <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input 
              placeholder="Search rides..." 
              bind:value={searchTerm}
              class="pl-10"
            />
          </div>
        </div>
        <Select bind:value={statusFilter}>
          <SelectTrigger class="w-48">
            <span class="text-muted-foreground">Filter by status</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Assigned">Assigned</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </CardContent>
  </Card>

  <!-- Rides List -->
  <div class="grid gap-4">
    {#each filteredRides() as ride}
      <Card>
        <CardContent class="p-6">
          <div class="flex items-start justify-between">
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <h3 class="text-lg font-semibold">{getClientName(ride)}</h3>
                <Badge class={getStatusColor(ride.status)}>
                  {ride.status.toUpperCase()}
                </Badge>
                <Badge variant="outline">
                  {ride.purpose}
                </Badge>
              </div>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div class="flex items-center gap-2">
                  <Phone class="w-4 h-4" />
                  {getClientPhone(ride)}
                </div>
                <div class="flex items-center gap-2">
                  <Calendar class="w-4 h-4" />
                  {formatDate(ride.appointment_time)} at {formatTime(ride.appointment_time)}
                </div>
                <div class="flex items-center gap-2">
                  <MapPin class="w-4 h-4" />
                  <div>
                    <div class="font-medium">Pickup:</div>
                    {#if ride.pickup_from_home}
                      <div>Client's Home</div>
                    {:else if ride.alt_pickup_address}
                      <div>{ride.alt_pickup_address}</div>
                      {#if ride.alt_pickup_address2}
                        <div>{ride.alt_pickup_address2}</div>
                      {/if}
                      <div>{ride.alt_pickup_city}, {ride.alt_pickup_state} {ride.alt_pickup_zipcode}</div>
                    {:else}
                      <div>Client's Home</div>
                    {/if}
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <MapPin class="w-4 h-4" />
                  <div>
                    <div class="font-medium">Dropoff:</div>
                    <div>{ride.destination_name}</div>
                    <div>{ride.dropoff_address}</div>
                    {#if ride.dropoff_address2}
                      <div>{ride.dropoff_address2}</div>
                    {/if}
                    <div>{ride.dropoff_city}, {ride.dropoff_state} {ride.dropoff_zipcode}</div>
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
              
              {#if ride.special_requirements}
                <div class="text-sm">
                  <span class="font-medium">Special Requirements:</span> {ride.special_requirements}
                </div>
              {/if}

              <!-- Completed ride details -->
              {#if ride.status === 'Completed' && data.completedRidesData[ride.ride_id]}
                {@const completed = data.completedRidesData[ride.ride_id]}
                <div class="text-sm bg-green-50 p-3 rounded-md">
                  <div class="font-medium text-green-800">Completed Details:</div>
                  <div class="text-green-700">
                    {#if completed.actual_start}
                      <div>Started: {new Date(completed.actual_start).toLocaleString()}</div>
                    {/if}
                    {#if completed.actual_end}
                      <div>Ended: {new Date(completed.actual_end).toLocaleString()}</div>
                    {/if}
                    {#if completed.miles_driven}
                      <div>Miles: {completed.miles_driven}</div>
                    {/if}
                    {#if completed.hours}
                      <div>Hours: {completed.hours}</div>
                    {/if}
                    {#if completed.donation_amount}
                      <div>Donation: ${completed.donation_amount}</div>
                    {/if}
                  </div>
                </div>
              {/if}
            </div>
            
            <div class="flex gap-2">
              {#if ride.status === "Assigned"}
                <Button 
                  size="sm" 
                  onclick={() => startRide(ride.ride_id)}
                  disabled={isUpdating}
                >
                  <Play class="w-4 h-4 mr-1" />
                  Start Ride
                </Button>
              {:else if ride.status === "In Progress"}
                <Button 
                  size="sm" 
                  onclick={() => completeRide(ride.ride_id)}
                  disabled={isUpdating}
                >
                  <CheckCircle class="w-4 h-4 mr-1" />
                  Complete Ride
                </Button>
              {/if}
              
              {#if ride.status !== "Completed" && ride.status !== "Cancelled"}
                <Button 
                  variant="outline" 
                  size="sm"
                  onclick={() => cancelRide(ride.ride_id)}
                  disabled={isUpdating}
                >
                  <XCircle class="w-4 h-4 mr-1" />
                  Cancel
                </Button>
              {/if}
              
              <Button variant="outline" size="sm">
                <Navigation class="w-4 h-4 mr-1" />
                Navigate
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    {/each}
  </div>

  {#if filteredRides().length === 0}
    <Card>
      <CardContent class="p-12 text-center">
        <Car class="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 class="text-lg font-semibold mb-2">No rides found</h3>
        <p class="text-muted-foreground">
          {#if data.rides && data.rides.length === 0}
            You don't have any assigned rides yet.
          {:else}
            No rides match your current filters.
          {/if}
        </p>
      </CardContent>
    </Card>
  {/if}
  
  <!-- Ride Completion Modal -->
  {#if showCompletionModal}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="p-6">
          <!-- Header -->
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold">Complete Ride</h2>
            <button onclick={closeCompletionModal} class="text-gray-400 hover:text-gray-600">
              <X class="w-6 h-6" />
            </button>
          </div>
          
          <!-- Reasonability Warning -->
          {#if reasonabilityWarning}
            <div class="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <div class="flex items-start gap-2">
                <AlertTriangle class="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p class="font-medium text-yellow-800">Mileage Verification</p>
                  <p class="text-yellow-700 text-sm mt-1">{reasonabilityMessage}</p>
                </div>
              </div>
            </div>
          {/if}
          
          <!-- Form -->
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <Label for="miles_driven" class="block text-sm font-medium text-gray-700 mb-1">
                  Miles Driven *
                </Label>
                <Input 
                  id="miles_driven"
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  bind:value={completionData.miles_driven}
                  required
                  class="w-full"
                />
              </div>
              
              <div>
                <Label for="hours" class="block text-sm font-medium text-gray-700 mb-1">
                  Hours *
                </Label>
                <Input 
                  id="hours"
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  bind:value={completionData.hours}
                  required
                  class="w-full"
                />
              </div>
            </div>
            
            <div>
              <Label for="riders" class="block text-sm font-medium text-gray-700 mb-1">
                Number of Passengers
              </Label>
              <Input 
                id="riders"
                type="number"
                step="1"
                min="0"
                placeholder="0"
                bind:value={completionData.riders}
                class="w-full"
              />
            </div>
            
            <div class="flex items-center gap-2">
              <input 
                type="checkbox"
                id="donation"
                bind:checked={completionData.donation}
                class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <Label for="donation" class="text-sm font-medium text-gray-700">
                Donation received
              </Label>
            </div>
            
            <div>
              <Label for="notes" class="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </Label>
              <textarea 
                id="notes"
                bind:value={completionData.notes}
                placeholder="Add any additional notes about the ride..."
                class="w-full min-h-[100px] p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              ></textarea>
            </div>
          </div>
          
          <!-- Footer Actions -->
          <div class="flex justify-end gap-3 mt-6">
            <Button variant="outline" onclick={closeCompletionModal}>
              Cancel
            </Button>
            <Button onclick={submitRideCompletion} disabled={isUpdating}>
              {isUpdating ? 'Completing...' : 'Complete Ride'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>