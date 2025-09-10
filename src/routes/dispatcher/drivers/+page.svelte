<!-- src/routes/dispatcher/drivers/+page.svelte -->
<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import { Select, SelectContent, SelectItem, SelectTrigger } from "$lib/components/ui/select";
  import { UserCog, Phone, MapPin, Car, Clock, Search, Filter, Plus } from "@lucide/svelte";

  // Mock driver data
  let drivers = $state([
    {
      id: 1,
      name: "Mike Johnson",
      phone: "+1-555-0101",
      email: "mike.johnson@drivekind.com",
      licenseNumber: "D123456789",
      status: "active",
      vehicle: "Van-001",
      currentLocation: "Downtown Rochester",
      lastActive: "2024-01-15T09:30:00Z",
      totalRides: 45,
      rating: 4.8
    },
    {
      id: 2,
      name: "Lisa Brown",
      phone: "+1-555-0102",
      email: "lisa.brown@drivekind.com",
      licenseNumber: "D987654321",
      status: "on-ride",
      vehicle: "Van-002",
      currentLocation: "Strong Memorial Hospital",
      lastActive: "2024-01-15T10:15:00Z",
      totalRides: 32,
      rating: 4.9
    },
    {
      id: 3,
      name: "Tom Wilson",
      phone: "+1-555-0103",
      email: "tom.wilson@drivekind.com",
      licenseNumber: "D456789123",
      status: "offline",
      vehicle: "Van-003",
      currentLocation: "Home",
      lastActive: "2024-01-14T18:00:00Z",
      totalRides: 28,
      rating: 4.7
    }
  ]);

  let searchTerm = $state("");
  let statusFilter = $state("all");

  // Filter drivers based on search and status
  let filteredDrivers = $derived(() => {
    return drivers.filter(driver => {
      const matchesSearch = driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           driver.vehicle.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || driver.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  });

  function getStatusColor(status: string) {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "on-ride": return "bg-blue-100 text-blue-800";
      case "offline": return "bg-gray-100 text-gray-800";
      case "unavailable": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  }

  function formatTime(timeString: string) {
    return new Date(timeString).toLocaleString();
  }
</script>

<svelte:head>
  <title>Driver Management - DriveKind</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">Driver Management</h1>
      <p class="text-muted-foreground">Manage drivers, vehicles, and assignments</p>
    </div>
    <Button>
      <Plus class="w-4 h-4 mr-2" />
      Add Driver
    </Button>
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
              placeholder="Search drivers..." 
              bind:value={searchTerm}
              class="pl-10"
            />
          </div>
        </div>
        <Select bind:value={statusFilter}>
          <SelectTrigger class="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="on-ride">On Ride</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
            <SelectItem value="unavailable">Unavailable</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </CardContent>
  </Card>

  <!-- Drivers Grid -->
  <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {#each filteredDrivers() as driver}
      <Card>
        <CardHeader>
          <div class="flex items-start justify-between">
            <div>
              <CardTitle class="flex items-center gap-2">
                <UserCog class="w-5 h-5" />
                {driver.name}
              </CardTitle>
              <CardDescription>{driver.email}</CardDescription>
            </div>
            <Badge class={getStatusColor(driver.status)}>
              {driver.status.replace('-', ' ').toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent class="space-y-3">
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div class="flex items-center gap-2">
              <Phone class="w-4 h-4 text-muted-foreground" />
              {driver.phone}
            </div>
            <div class="flex items-center gap-2">
              <Car class="w-4 h-4 text-muted-foreground" />
              {driver.vehicle}
            </div>
            <div class="flex items-center gap-2">
              <MapPin class="w-4 h-4 text-muted-foreground" />
              {driver.currentLocation}
            </div>
            <div class="flex items-center gap-2">
              <Clock class="w-4 h-4 text-muted-foreground" />
              {formatTime(driver.lastActive)}
            </div>
          </div>
          
          <div class="flex items-center justify-between pt-2 border-t">
            <div class="text-sm text-muted-foreground">
              {driver.totalRides} rides • ⭐ {driver.rating}
            </div>
            <div class="flex gap-1">
              <Button variant="outline" size="sm">Edit</Button>
              <Button variant="outline" size="sm">Track</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    {/each}
  </div>

  {#if filteredDrivers().length === 0}
    <Card>
      <CardContent class="p-12 text-center">
        <UserCog class="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 class="text-lg font-semibold mb-2">No drivers found</h3>
        <p class="text-muted-foreground">Try adjusting your search or filter criteria.</p>
      </CardContent>
    </Card>
  {/if}
</div>
