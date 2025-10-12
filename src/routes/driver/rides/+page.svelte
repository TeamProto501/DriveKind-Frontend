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
  let statusFilter = $state("all");
  let isUpdating = $state(false);

  // Filter rides based on search and status
  let filteredRides = $derived(() => {
    if (!data.rides) return [];
    
    return data.rides.filter(ride => {
      const clientName = ride.clients ? `${ride.clients.first_name} ${ride.clients.last_name}` : 'Unknown Client';
      const matchesSearch = clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           ride.dropoff_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           ride.pickup_address.toLowerCase().includes(searchTerm.toLowerCase());
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

  function formatDateTime(date: string, time: string) {
    const dateTime = new Date(`${date}T${time}`);
    return dateTime.toLocaleString();
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString();
  }

  function formatTime(time: string) {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

  async function completeRide(rideId: number) {
    await updateRideStatus(rideId, 'Completed');
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
                  {ride.ride_type}
                </Badge>
              </div>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div class="flex items-center gap-2">
                  <Phone class="w-4 h-4" />
                  {getClientPhone(ride)}
                </div>
                <div class="flex items-center gap-2">
                  <Calendar class="w-4 h-4" />
                  {formatDate(ride.scheduled_date)} at {formatTime(ride.scheduled_time)}
                </div>
                <div class="flex items-center gap-2">
                  <MapPin class="w-4 h-4" />
                  <div>
                    <div class="font-medium">Pickup:</div>
                    <div>{ride.pickup_address}</div>
                    {#if ride.pickup_address2}
                      <div>{ride.pickup_address2}</div>
                    {/if}
                    <div>{ride.pickup_city}, {ride.pickup_state} {ride.pickup_zip}</div>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <MapPin class="w-4 h-4" />
                  <div>
                    <div class="font-medium">Dropoff:</div>
                    <div>{ride.dropoff_address}</div>
                    {#if ride.dropoff_address2}
                      <div>{ride.dropoff_address2}</div>
                    {/if}
                    <div>{ride.dropoff_city}, {ride.dropoff_state} {ride.dropoff_zip}</div>
                  </div>
                </div>
                {#if ride.is_recurring}
                  <div class="flex items-center gap-2">
                    <Clock class="w-4 h-4" />
                    Recurring: {ride.recurring_pattern}
                  </div>
                {/if}
                {#if !ride.is_one_way}
                  <div class="flex items-center gap-2">
                    <Car class="w-4 h-4" />
                    Round trip
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
</div>