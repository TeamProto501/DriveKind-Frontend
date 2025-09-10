<!-- src/routes/driver/rides/+page.svelte -->
<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import { Select, SelectContent, SelectItem, SelectTrigger } from "$lib/components/ui/select";
  import { Car, Clock, MapPin, User, Phone, Calendar, Filter, Search, Navigation } from "@lucide/svelte";

  // Mock ride data for current driver
  let rides = $state([
    {
      id: 1,
      clientName: "John Smith",
      clientPhone: "+1-555-0123",
      pickupAddress: "123 Main St, Rochester, NY",
      destination: "Strong Memorial Hospital",
      scheduledTime: "2024-01-15T10:00:00Z",
      status: "assigned",
      notes: "Wheelchair accessible",
      estimatedDuration: "25 minutes",
      distance: "8.5 miles"
    },
    {
      id: 2,
      clientName: "Sarah Wilson",
      clientPhone: "+1-555-0124",
      pickupAddress: "456 Oak Ave, Rochester, NY",
      destination: "Rochester General Hospital",
      scheduledTime: "2024-01-15T14:30:00Z",
      status: "completed",
      notes: "Assistance needed",
      estimatedDuration: "20 minutes",
      distance: "6.2 miles"
    },
    {
      id: 3,
      clientName: "Robert Davis",
      clientPhone: "+1-555-0125",
      pickupAddress: "789 Pine St, Rochester, NY",
      destination: "University of Rochester Medical Center",
      scheduledTime: "2024-01-15T16:00:00Z",
      status: "scheduled",
      notes: "Regular pickup",
      estimatedDuration: "15 minutes",
      distance: "4.8 miles"
    }
  ]);

  let searchTerm = $state("");
  let statusFilter = $state("all");

  // Filter rides based on search and status
  let filteredRides = $derived(() => {
    return rides.filter(ride => {
      const matchesSearch = ride.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           ride.destination.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || ride.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  });

  function getStatusColor(status: string) {
    switch (status) {
      case "scheduled": return "bg-blue-100 text-blue-800";
      case "assigned": return "bg-yellow-100 text-yellow-800";
      case "in-progress": return "bg-orange-100 text-orange-800";
      case "completed": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  }

  function formatTime(timeString: string) {
    return new Date(timeString).toLocaleString();
  }

  function startRide(rideId: number) {
    // Update ride status to in-progress
    rides = rides.map(ride => 
      ride.id === rideId ? { ...ride, status: "in-progress" } : ride
    );
  }

  function completeRide(rideId: number) {
    // Update ride status to completed
    rides = rides.map(ride => 
      ride.id === rideId ? { ...ride, status: "completed" } : ride
    );
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
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
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
                <h3 class="text-lg font-semibold">{ride.clientName}</h3>
                <Badge class={getStatusColor(ride.status)}>
                  {ride.status.replace('-', ' ').toUpperCase()}
                </Badge>
              </div>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div class="flex items-center gap-2">
                  <Phone class="w-4 h-4" />
                  {ride.clientPhone}
                </div>
                <div class="flex items-center gap-2">
                  <Calendar class="w-4 h-4" />
                  {formatTime(ride.scheduledTime)}
                </div>
                <div class="flex items-center gap-2">
                  <MapPin class="w-4 h-4" />
                  {ride.pickupAddress}
                </div>
                <div class="flex items-center gap-2">
                  <MapPin class="w-4 h-4" />
                  {ride.destination}
                </div>
                <div class="flex items-center gap-2">
                  <Clock class="w-4 h-4" />
                  {ride.estimatedDuration}
                </div>
                <div class="flex items-center gap-2">
                  <Car class="w-4 h-4" />
                  {ride.distance}
                </div>
              </div>
              
              {#if ride.notes}
                <p class="text-sm text-muted-foreground italic">{ride.notes}</p>
              {/if}
            </div>
            
            <div class="flex gap-2">
              {#if ride.status === "assigned"}
                <Button size="sm" onclick={() => startRide(ride.id)}>Start Ride</Button>
              {:else if ride.status === "in-progress"}
                <Button size="sm" onclick={() => completeRide(ride.id)}>Complete Ride</Button>
              {:else}
                <Button variant="outline" size="sm">View Details</Button>
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
        <p class="text-muted-foreground">You don't have any rides matching your criteria.</p>
      </CardContent>
    </Card>
  {/if}
</div>
