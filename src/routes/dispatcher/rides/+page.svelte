<!-- src/routes/dispatcher/rides/+page.svelte -->
<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import { Card, CardContent } from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import { Car, MapPin, Calendar, Search, X } from "@lucide/svelte";
  import CreateRideModal from './CreateRideModal.svelte';
  import { invalidateAll } from '$app/navigation';
  
  let { data } = $props();
  
  let searchTerm = $state("");
  let statusFilter = $state("all");
  let driverFilter = $state("all");
  let clientFilter = $state("all");
  let showCreateModal = $state(false);
  
  // Get unique drivers and clients for filters
  let uniqueDrivers = $derived.by(() => {
    const drivers = new Map();
    data.rides.forEach((ride: any) => {
      if (ride.driver) {
        drivers.set(ride.driver.user_id, ride.driver);
      }
    });
    return Array.from(drivers.values());
  });
  
  let uniqueClients = $derived.by(() => {
    const clients = new Map();
    data.rides.forEach((ride: any) => {
      if (ride.clients) {
        clients.set(ride.clients.client_id, ride.clients);
      }
    });
    return Array.from(clients.values());
  });
  
  let filteredRides = $derived.by(() => {
    return data.rides.filter((ride: any) => {
      const clientName = ride.clients ? `${ride.clients.first_name} ${ride.clients.last_name}` : '';
      const driverName = ride.driver ? `${ride.driver.first_name} ${ride.driver.last_name}` : '';
      
      const matchesSearch = 
        clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ride.destination_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        driverName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || ride.status === statusFilter;
      const matchesDriver = driverFilter === "all" || ride.driver?.user_id === driverFilter;
      const matchesClient = clientFilter === "all" || ride.clients?.client_id === parseInt(clientFilter);
      
      return matchesSearch && matchesStatus && matchesDriver && matchesClient;
    });
  });
  
  function clearFilters() {
    searchTerm = "";
    statusFilter = "all";
    driverFilter = "all";
    clientFilter = "all";
  }
  
  let hasActiveFilters = $derived(
    searchTerm !== "" || statusFilter !== "all" || driverFilter !== "all" || clientFilter !== "all"
  );
  
  function getStatusColor(status: string) {
    const colors = {
      scheduled: "bg-blue-100 text-blue-800",
      confirmed: "bg-green-100 text-green-800",
      "in-progress": "bg-yellow-100 text-yellow-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
      "no-show": "bg-gray-100 text-gray-800"
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  }
  
  function formatDateTime(dateString: string) {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }
  
  async function handleRideCreated() {
    await invalidateAll();
    showCreateModal = false;
  }
</script>

<svelte:head>
  <title>Ride Management - DriveKind</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">Ride Management</h1>
      <p class="text-muted-foreground">Manage and track ride requests</p>
    </div>
    <Button onclick={() => showCreateModal = true}>
      <Car class="w-4 h-4 mr-2" />
      New Ride
    </Button>
  </div>
  
  <!-- Filters -->
  <Card>
    <CardContent class="p-4">
      <div class="space-y-4">
        <div class="flex items-center gap-3">
          <div class="flex-1 relative">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="Search rides by client, driver, or destination..." 
              bind:value={searchTerm}
              class="pl-10"
            />
          </div>
          {#if hasActiveFilters}
            <Button variant="outline" size="sm" onclick={clearFilters}>
              <X class="w-4 h-4 mr-1" />
              Clear Filters
            </Button>
          {/if}
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select bind:value={statusFilter} class="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="all">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no-show">No Show</option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Driver</label>
            <select bind:value={driverFilter} class="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="all">All Drivers</option>
              {#each uniqueDrivers as driver}
                <option value={driver.user_id}>
                  {driver.first_name} {driver.last_name}
                </option>
              {/each}
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Client</label>
            <select bind:value={clientFilter} class="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="all">All Clients</option>
              {#each uniqueClients as client}
                <option value={client.client_id}>
                  {client.first_name} {client.last_name}
                </option>
              {/each}
            </select>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
  
  <!-- Results Summary -->
  <div class="flex items-center justify-between text-sm text-gray-600">
    <span>Showing {filteredRides.length} of {data.rides.length} rides</span>
  </div>
  
  <!-- Rides List -->
  <div class="grid gap-4">
    {#each filteredRides as ride}
      <Card>
        <CardContent class="p-6">
          <div class="flex justify-between">
            <div class="space-y-2 flex-1">
              <div class="flex items-center gap-2">
                <h3 class="text-lg font-semibold">
                  {ride.clients?.first_name} {ride.clients?.last_name}
                </h3>
                <Badge class={getStatusColor(ride.status)}>
                  {ride.status.toUpperCase().replace('-', ' ')}
                </Badge>
                {#if ride.round_trip}
                  <Badge variant="outline">Round Trip</Badge>
                {/if}
              </div>
              
              <div class="grid md:grid-cols-2 gap-3 text-sm text-gray-600">
                <div class="flex items-center gap-2">
                  <Calendar class="w-4 h-4 flex-shrink-0" />
                  <span>{formatDateTime(ride.appointment_time)}</span>
                </div>
                <div class="flex items-center gap-2">
                  <MapPin class="w-4 h-4 flex-shrink-0" />
                  <span>{ride.destination_name}</span>
                </div>
                {#if ride.driver}
                  <div class="flex items-center gap-2">
                    <Car class="w-4 h-4 flex-shrink-0" />
                    <span>Driver: {ride.driver.first_name} {ride.driver.last_name}</span>
                  </div>
                {/if}
                {#if ride.purpose}
                  <div class="flex items-center gap-2">
                    <span class="text-xs">Purpose: {ride.purpose}</span>
                  </div>
                {/if}
              </div>
              
              {#if ride.clients?.mobility_assistance_enum || ride.clients?.service_animal}
                <div class="flex gap-2 mt-2">
                  {#if ride.clients.mobility_assistance_enum}
                    <Badge variant="secondary" class="text-xs">
                      {ride.clients.mobility_assistance_enum}
                    </Badge>
                  {/if}
                  {#if ride.clients.service_animal}
                    <Badge variant="secondary" class="text-xs">Service Animal</Badge>
                  {/if}
                </div>
              {/if}
              
              {#if ride.notes}
                <p class="text-sm text-gray-600 italic mt-2">Note: {ride.notes}</p>
              {/if}
            </div>
            
            <div class="flex gap-2 ml-4">
              <Button variant="outline" size="sm">Edit</Button>
              <Button variant="outline" size="sm">Details</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    {/each}
  </div>
  
  {#if filteredRides.length === 0}
    <Card>
      <CardContent class="p-12 text-center">
        <Car class="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <h3 class="text-lg font-semibold mb-2">No rides found</h3>
        <p class="text-gray-600 mb-4">
          {hasActiveFilters 
            ? 'Try adjusting your filters or search criteria.' 
            : 'Create a new ride to get started.'}
        </p>
        {#if hasActiveFilters}
          <Button variant="outline" onclick={clearFilters}>Clear Filters</Button>
        {/if}
      </CardContent>
    </Card>
  {/if}
</div>

{#if showCreateModal}
  <CreateRideModal 
    clients={data.clients}
    drivers={data.drivers}
    orgId={data.userOrgId}
    onClose={() => showCreateModal = false}
    on:created={handleRideCreated}
  />
{/if}