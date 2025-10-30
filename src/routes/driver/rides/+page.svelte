<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import { Select, SelectContent, SelectItem, SelectTrigger } from "$lib/components/ui/select";
  import { Car, Clock, MapPin, User, Phone, Calendar, Filter, Search, Navigation, Play, CheckCircle, XCircle } from "@lucide/svelte";
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let searchTerm = $state("");
  let activeTab = $state("scheduled"); // scheduled, active, completed
  let isUpdating = $state(false);

  // Filter rides based on tab and search
  let filteredRides = $derived(() => {
    if (!data.rides) return [];
    
    return data.rides.filter(ride => {
      const clientName = ride.clients ? `${ride.clients.first_name} ${ride.clients.last_name}` : 'Unknown Client';
      const matchesSearch = clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           ride.dropoff_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (ride.alt_pickup_address && ride.alt_pickup_address.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Filter by tab
      let matchesTab = false;
      if (activeTab === "scheduled") {
        matchesTab = ride.status === "Scheduled" || ride.status === "Assigned";
      } else if (activeTab === "active") {
        matchesTab = ride.status === "In Progress";
      } else if (activeTab === "completed") {
        matchesTab = ride.status === "Completed" || ride.status === "Cancelled" || ride.status === "Reported";
      }
      
      return matchesSearch && matchesTab;
    });
  });

  // Get ride counts for tabs
  let rideCounts = $derived(() => {
    if (!data.rides) return { scheduled: 0, active: 0, completed: 0 };
    
    return {
      scheduled: data.rides.filter(r => r.status === "Scheduled" || r.status === "Assigned").length,
      active: data.rides.filter(r => r.status === "In Progress").length,
      completed: data.rides.filter(r => r.status === "Completed" || r.status === "Cancelled" || r.status === "Reported").length
    };
  });

  function getStatusColor(status: string) {
    switch (status) {
      case "Scheduled": return "bg-blue-100 text-blue-800";
      case "Assigned": return "bg-blue-100 text-blue-800";
      case "In Progress": return "bg-yellow-100 text-yellow-800";
      case "Reported": return "bg-purple-100 text-purple-800";
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
        const error = await response.json();
        console.error('Failed to update ride status:', error);
        alert(`Failed to update ride status: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating ride status:', error);
      alert('Error updating ride status. Please try again.');
    } finally {
      isUpdating = false;
    }
  }

  async function startRide(rideId: number) {
    await updateRideStatus(rideId, 'In Progress');
  }

  async function reportComplete(rideId: number) {
    await updateRideStatus(rideId, 'Reported');
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

  <!-- Tabs -->
  <Card>
    <div class="border-b border-gray-200">
      <div class="flex space-x-8 px-6">
        <button
          onclick={() => activeTab = "scheduled"}
          class="py-4 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'scheduled' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
        >
          Scheduled
          {#if rideCounts().scheduled > 0}
            <span class="ml-2 py-0.5 px-2 rounded-full text-xs bg-blue-100 text-blue-600">{rideCounts().scheduled}</span>
          {/if}
        </button>
        
        <button
          onclick={() => activeTab = "active"}
          class="py-4 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'active' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
        >
          In Progress
          {#if rideCounts().active > 0}
            <span class="ml-2 py-0.5 px-2 rounded-full text-xs bg-yellow-100 text-yellow-600">{rideCounts().active}</span>
          {/if}
        </button>
        
        <button
          onclick={() => activeTab = "completed"}
          class="py-4 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'completed' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
        >
          Completed
          {#if rideCounts().completed > 0}
            <span class="ml-2 py-0.5 px-2 rounded-full text-xs bg-green-100 text-green-600">{rideCounts().completed}</span>
          {/if}
        </button>
      </div>
    </div>

    <!-- Search -->
    <CardContent class="p-6 border-b">
      <div class="relative">
        <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input 
          placeholder="Search rides..." 
          bind:value={searchTerm}
          class="pl-10"
        />
      </div>
    </CardContent>
  </Card>

  <!-- Rides List -->
  <div class="grid gap-4">
    {#each filteredRides() as ride}
      <Card>
        <CardContent class="p-6">
          <div class="flex items-start justify-between">
            <div class="space-y-2 flex-1">
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

              <!-- Completed ride details -->
              {#if (ride.status === 'Completed' || ride.status === 'Reported') && data.completedRidesData[ride.ride_id]}
                {@const completed = data.completedRidesData[ride.ride_id]}
                <div class="text-sm bg-green-50 p-3 rounded-md">
                  <div class="font-medium text-green-800">
                    {ride.status === 'Reported' ? 'Reported Details (Pending Confirmation):' : 'Completed Details:'}
                  </div>
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
            
            <div class="flex gap-2 ml-4">
              {#if ride.status === "Scheduled" || ride.status === "Assigned"}
                <Button 
                  size="sm" 
                  onclick={() => startRide(ride.ride_id)}
                  disabled={isUpdating}
                >
                  <Play class="w-4 h-4 mr-1" />
                  Start Ride
                </Button>
                
                <Button 
                  size="sm" 
                  variant="outline"
                  onclick={() => reportComplete(ride.ride_id)}
                  disabled={isUpdating}
                >
                  <CheckCircle class="w-4 h-4 mr-1" />
                  Complete
                </Button>
              {:else if ride.status === "In Progress"}
                <Button 
                  size="sm" 
                  onclick={() => reportComplete(ride.ride_id)}
                  disabled={isUpdating}
                >
                  <CheckCircle class="w-4 h-4 mr-1" />
                  Report Complete
                </Button>
              {/if}
              
              {#if ride.status !== "Completed" && ride.status !== "Cancelled" && ride.status !== "Reported"}
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
            No rides match your current tab and filters.
          {/if}
        </p>
      </CardContent>
    </Card>
  {/if}
</div>