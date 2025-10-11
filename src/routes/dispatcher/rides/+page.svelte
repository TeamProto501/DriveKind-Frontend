<!-- src/routes/dispatcher/rides/+page.svelte -->
<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import { Card, CardContent } from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import { Car, MapPin, Calendar, Filter, Search } from "@lucide/svelte";
  import CreateRideModal from './CreateRideModal.svelte';
  import { invalidateAll } from '$app/navigation';
  
  let { data } = $props();
  
  let searchTerm = $state("");
  let statusFilter = $state("all");
  let showCreateModal = $state(false);
  
  let filteredRides = $derived.by(() => {
    return data.rides.filter((ride: any) => {
      const clientName = ride.clients ? `${ride.clients.first_name} ${ride.clients.last_name}` : '';
      const matchesSearch = clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           ride.destination_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || ride.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  });
  
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
    return new Date(dateString).toLocaleString();
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
      <div class="flex gap-4">
        <div class="flex-1 relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input 
            placeholder="Search rides..." 
            bind:value={searchTerm}
            class="pl-10"
          />
        </div>
        <select bind:value={statusFilter} class="border rounded-lg px-3 py-2">
          <option value="all">All Statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="confirmed">Confirmed</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
    </CardContent>
  </Card>
  
  <!-- Rides List -->
  <div class="grid gap-4">
    {#each filteredRides as ride}
      <Card>
        <CardContent class="p-6">
          <div class="flex justify-between">
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <h3 class="text-lg font-semibold">
                  {ride.clients?.first_name} {ride.clients?.last_name}
                </h3>
                <Badge class={getStatusColor(ride.status)}>
                  {ride.status.toUpperCase()}
                </Badge>
              </div>
              
              <div class="grid md:grid-cols-2 gap-3 text-sm text-gray-600">
                <div class="flex items-center gap-2">
                  <Calendar class="w-4 h-4" />
                  {formatDateTime(ride.appointment_time)}
                </div>
                <div class="flex items-center gap-2">
                  <MapPin class="w-4 h-4" />
                  {ride.destination_name}
                </div>
                {#if ride.driver}
                  <div class="flex items-center gap-2">
                    <Car class="w-4 h-4" />
                    Driver: {ride.driver.first_name} {ride.driver.last_name}
                  </div>
                {/if}
              </div>
            </div>
            
            <div class="flex gap-2">
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
        <p class="text-gray-600">Try adjusting your filters or create a new ride.</p>
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