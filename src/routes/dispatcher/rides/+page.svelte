<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import { Select, SelectContent, SelectItem, SelectTrigger } from "$lib/components/ui/select";
  import { Textarea } from "$lib/components/ui/textarea";
  import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "$lib/components/ui/dialog";
  import { Label } from "$lib/components/ui/label";
  import { Car, Clock, MapPin, User, Phone, Calendar, Filter, Search, Navigation, Plus, Edit, Trash2, UserCheck } from "@lucide/svelte";
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import type { PageData } from './$types';

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
    donation: false
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
      donation: false
    };
    showCreateModal = true;
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
      donation: ride.donation || false
    };
    showEditModal = true;
  }

  function openAssignDriverModal(ride: any) {
    selectedRide = ride;
    showAssignDriverModal = true;
  }

  async function createRide() {
    isUpdating = true;
    try {
      const response = await fetch('/dispatcher/rides/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(rideForm)
      });

      if (response.ok) {
        showCreateModal = false;
        await invalidateAll();
      } else {
        console.error('Failed to create ride');
      }
    } catch (error) {
      console.error('Error creating ride:', error);
    } finally {
      isUpdating = false;
    }
  }

  async function updateRide() {
    isUpdating = true;
    try {
      const response = await fetch(`/dispatcher/rides/update/${selectedRide.ride_id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(rideForm)
      });

      if (response.ok) {
        showEditModal = false;
        selectedRide = null;
        await invalidateAll();
      } else {
        console.error('Failed to update ride');
      }
    } catch (error) {
      console.error('Error updating ride:', error);
    } finally {
      isUpdating = false;
    }
  }

  async function assignDriver(driverId: string) {
    isUpdating = true;
    try {
      const response = await fetch(`/dispatcher/rides/assign/${selectedRide.ride_id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ driver_user_id: driverId })
      });

      if (response.ok) {
        showAssignDriverModal = false;
        selectedRide = null;
        await invalidateAll();
      } else {
        console.error('Failed to assign driver');
      }
    } catch (error) {
      console.error('Error assigning driver:', error);
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

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">Ride Management</h1>
      <p class="text-muted-foreground">Manage and track ride requests and assignments</p>
    </div>
    <Button onclick={openCreateModal}>
      <Plus class="w-4 h-4 mr-2" />
      New Ride
    </Button>
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
            <SelectItem value="Requested">Requested</SelectItem>
            <SelectItem value="Scheduled">Scheduled</SelectItem>
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
                  <User class="w-4 h-4" />
                  Driver: {getDriverName(ride)}
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
            </div>
            
            <div class="flex gap-2">
              {#if ride.status === "Requested" || ride.status === "Scheduled"}
                <Button 
                  size="sm" 
                  onclick={() => openAssignDriverModal(ride)}
                  disabled={isUpdating}
                >
                  <UserCheck class="w-4 h-4 mr-1" />
                  Assign Driver
                </Button>
              {/if}
              
              <Button 
                variant="outline" 
                size="sm"
                onclick={() => openEditModal(ride)}
                disabled={isUpdating}
              >
                <Edit class="w-4 h-4 mr-1" />
                Edit
              </Button>
              
              {#if ride.status === "Requested"}
                <Button 
                  variant="outline" 
                  size="sm"
                  onclick={() => updateRideStatus(ride.ride_id, 'Scheduled')}
                  disabled={isUpdating}
                >
                  Schedule
                </Button>
              {:else if ride.status === "Scheduled"}
                <Button 
                  variant="outline" 
                  size="sm"
                  onclick={() => updateRideStatus(ride.ride_id, 'Requested')}
                  disabled={isUpdating}
                >
                  Unschedule
                </Button>
              {:else if ride.status === "Assigned"}
                <Button 
                  variant="outline" 
                  size="sm"
                  onclick={() => updateRideStatus(ride.ride_id, 'In Progress')}
                  disabled={isUpdating}
                >
                  Start Ride
                </Button>
              {:else if ride.status === "In Progress"}
                <Button 
                  variant="outline" 
                  size="sm"
                  onclick={() => updateRideStatus(ride.ride_id, 'Completed')}
                  disabled={isUpdating}
                >
                  Complete
                </Button>
              {/if}
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
            No rides have been created yet.
          {:else}
            No rides match your current filters.
          {/if}
        </p>
      </CardContent>
    </Card>
  {/if}
</div>

<!-- Create Ride Modal -->
<Dialog bind:open={showCreateModal}>
  <DialogContent class="max-w-2xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Create New Ride</DialogTitle>
      <DialogDescription>
        Create a new ride request for a client.
      </DialogDescription>
    </DialogHeader>
    
    <div class="grid gap-4 py-4">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <Label for="client_id">Client</Label>
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
          <Label for="purpose">Purpose</Label>
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
        <Label for="destination_name">Destination Name</Label>
        <Input id="destination_name" bind:value={rideForm.destination_name} placeholder="e.g., Strong Memorial Hospital" />
      </div>
      
      <div>
        <Label for="dropoff_address">Dropoff Address</Label>
        <Input id="dropoff_address" bind:value={rideForm.dropoff_address} placeholder="Street address" />
      </div>
      
      <div class="grid grid-cols-3 gap-4">
        <div>
          <Label for="dropoff_city">City</Label>
          <Input id="dropoff_city" bind:value={rideForm.dropoff_city} />
        </div>
        <div>
          <Label for="dropoff_state">State</Label>
          <Input id="dropoff_state" bind:value={rideForm.dropoff_state} />
        </div>
        <div>
          <Label for="dropoff_zipcode">ZIP Code</Label>
          <Input id="dropoff_zipcode" bind:value={rideForm.dropoff_zipcode} />
        </div>
      </div>
      
      <div>
        <Label for="appointment_time">Appointment Time</Label>
        <Input id="appointment_time" type="datetime-local" bind:value={rideForm.appointment_time} />
      </div>
      
      <div class="flex items-center space-x-2">
        <input type="checkbox" id="pickup_from_home" bind:checked={rideForm.pickup_from_home} />
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
    
    <DialogFooter>
      <Button variant="outline" onclick={() => showCreateModal = false}>Cancel</Button>
      <Button onclick={createRide} disabled={isUpdating}>
        {isUpdating ? 'Creating...' : 'Create Ride'}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

<!-- Edit Ride Modal -->
<Dialog bind:open={showEditModal}>
  <DialogContent class="max-w-2xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Edit Ride</DialogTitle>
      <DialogDescription>
        Update ride information.
      </DialogDescription>
    </DialogHeader>
    
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
      
      <div>
        <Label for="edit_notes">Notes</Label>
        <Textarea id="edit_notes" bind:value={rideForm.notes} />
      </div>
    </div>
    
    <DialogFooter>
      <Button variant="outline" onclick={() => showEditModal = false}>Cancel</Button>
      <Button onclick={updateRide} disabled={isUpdating}>
        {isUpdating ? 'Updating...' : 'Update Ride'}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

<!-- Assign Driver Modal -->
<Dialog bind:open={showAssignDriverModal}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Assign Driver</DialogTitle>
      <DialogDescription>
        Select a driver for this ride.
      </DialogDescription>
    </DialogHeader>
    
    <div class="py-4">
      <div class="space-y-2">
        {#each data.drivers as driver}
          <div class="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <div class="font-medium">{driver.first_name} {driver.last_name}</div>
            </div>
            <Button 
              size="sm" 
              onclick={() => assignDriver(driver.user_id)}
              disabled={isUpdating}
            >
              Assign
            </Button>
          </div>
        {/each}
      </div>
    </div>
    
    <DialogFooter>
      <Button variant="outline" onclick={() => showAssignDriverModal = false}>Cancel</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>