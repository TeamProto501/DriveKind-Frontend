<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import { Card, CardContent } from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import { Calendar, Car, CheckCircle, Clock, MapPin, Phone, Play, Search, XCircle } from "@lucide/svelte";
  import { invalidateAll } from '$app/navigation';
  import type { PageData } from './$types';
  import RideCompletionModal from '$lib/components/RideCompletionModal.svelte';
  import { validateRideCompletion, sanitizeInput } from '$lib/utils/validation';

  let { data }: { data: PageData } = $props();

  // === API base (trim trailing slash). Falls back to localhost:3000 in dev.
  const API_BASE =
    (import.meta.env.VITE_API_URL?.replace(/\/+$/, "")) ||
    (typeof window !== "undefined" ? `${window.location.protocol}//localhost:3000` : "http://localhost:3000");

  let searchTerm = $state("");
  let activeTab = $state("requests"); // requests | scheduled | active | completed
  let isUpdating = $state(false);
  let showCompletionModal = $state(false);
  let selectedRideForCompletion = $state<any>(null);

  function getStatusColor(status: string) {
    switch (status) {
      case "Scheduled": return "bg-blue-100 text-blue-800";
      case "Assigned": return "bg-blue-100 text-blue-800";
      case "In Progress": return "bg-yellow-100 text-yellow-800";
      case "Reported": return "bg-purple-100 text-purple-800";
      case "Completed": return "bg-green-100 text-green-800";
      case "Cancelled": return "bg-red-100 text-red-800";
      case "Pending": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  }

  const formatDate = (ts: string) => new Date(ts).toLocaleDateString();
  const formatTime = (ts: string) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const getClientName = (ride: any) => ride?.clients ? `${ride.clients.first_name} ${ride.clients.last_name}` : 'Unknown Client';
  const getClientPhone = (ride: any) => ride?.clients?.primary_phone || 'No phone';

  // Filtered list uses "Pending" for Requests tab
  let filteredRides = $derived(() => {
    const list = data.rides ?? [];
    return list.filter((ride: any) => {
      const clientName = getClientName(ride);
      const matchesSearch =
        clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ride.dropoff_address || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ride.alt_pickup_address || '').toLowerCase().includes(searchTerm.toLowerCase());

      let matchesTab = false;
      if (activeTab === "requests") {
        matchesTab = ride.status === "Pending";
      } else if (activeTab === "scheduled") {
        matchesTab = ride.status === "Scheduled" || ride.status === "Assigned";
      } else if (activeTab === "active") {
        matchesTab = ride.status === "In Progress";
      } else if (activeTab === "completed") {
        matchesTab = ride.status === "Completed" || ride.status === "Cancelled" || ride.status === "Reported";
      }

      return matchesSearch && matchesTab;
    });
  });

  let rideCounts = $derived(() => {
    const list = data.rides ?? [];
    return {
      requests: list.filter((r: any) => r.status === "Pending").length,
      scheduled: list.filter((r: any) => r.status === "Scheduled" || r.status === "Assigned").length,
      active: list.filter((r: any) => r.status === "In Progress").length,
      completed: list.filter((r: any) => r.status === "Completed" || r.status === "Cancelled" || r.status === "Reported").length
    };
  });

  async function updateRideStatus(rideId: number, newStatus: string) {
    isUpdating = true;
    try {
      const resp = await fetch(`/driver/rides/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rideId, status: newStatus })
      });
      if (!resp.ok) {
        let msg = '';
        try { msg = (await resp.json()).error ?? ''; } catch { msg = await resp.text(); }
        alert(`Failed to update ride status (${resp.status}): ${msg || 'Unknown error'}`);
      } else {
        await invalidateAll();
      }
    } catch (e) {
      console.error(e);
      alert('Error updating ride status. Please try again.');
    } finally {
      isUpdating = false;
    }
  }
  const startRide = (id: number) => updateRideStatus(id, 'In Progress');

  function openCompletionModal(ride: any) {
    selectedRideForCompletion = ride;
    showCompletionModal = true;
  }

  async function submitCompletion(formData: any) {
    if (!selectedRideForCompletion) return;

    if (formData.miles_driven || formData.hours) {
      const v = validateRideCompletion({
        miles_driven: formData.miles_driven?.toString() || '0',
        hours: formData.hours?.toString() || '0',
        riders: formData.riders?.toString()
      });
      if (!v.valid) {
        alert('Please fix the following errors:\n• ' + v.errors.join('\n• '));
        return;
      }
    }

    const sanitized = {
      ...formData,
      notes: formData.notes ? sanitizeInput(formData.notes) : null,
      comments: formData.comments ? sanitizeInput(formData.comments) : null
    };

    isUpdating = true;
    try {
      const resp = await fetch(`/driver/rides/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rideId: selectedRideForCompletion.ride_id, ...sanitized })
      });

      if (!resp.ok) {
        let msg = '';
        try { msg = (await resp.json()).error ?? ''; } catch { msg = await resp.text(); }
        alert(`Failed to report completion (${resp.status}): ${msg || 'Unknown error'}`);
      } else {
        showCompletionModal = false;
        selectedRideForCompletion = null;
        await invalidateAll();
      }
    } catch (e) {
      console.error(e);
      alert('Error reporting completion. Please try again.');
    } finally {
      isUpdating = false;
    }
  }

  // Helper to read error body safely
  async function readError(resp: Response) {
    try { const j = await resp.json(); return j?.error || j?.message || JSON.stringify(j); }
    catch { try { return await resp.text(); } catch { return ''; } }
  }

  // Accept
  async function acceptRide(rideId: number) {
    if (!data.session?.access_token) {
      alert('Session expired. Please refresh the page and try again.');
      return;
    }
    isUpdating = true;
    try {
      const resp = await fetch(`${API_BASE}/rides/${rideId}/accept`, {
        method: 'POST',
        headers: {
          // no content-type since no body
          'Authorization': `Bearer ${data.session.access_token}`
        }
      });
      if (!resp.ok) {
        const msg = await readError(resp);
        console.error('Accept failed:', resp.status, msg);
        alert(`Failed to accept ride (${resp.status}): ${msg || 'Unknown error'}`);
      } else {
        await invalidateAll();
        alert('Ride accepted! It now appears in your Scheduled tab.');
      }
    } catch (e) {
      console.error(e);
      alert('Error accepting ride. Please try again.');
    } finally {
      isUpdating = false;
    }
  }

  // Decline
  async function declineRide(rideId: number) {
    if (!data.session?.access_token) {
      alert('Session expired. Please refresh the page and try again.');
      return;
    }

    isUpdating = true;
    try {
      const resp = await fetch(`${API_BASE}/rides/${rideId}/decline`, {
        method: 'POST',
        headers: {
          // no content-type since no body
          'Authorization': `Bearer ${data.session.access_token}`
        }
      });

      if (!resp.ok) {
        const msg = await readError(resp);
        console.error('Decline failed:', resp.status, msg);
        alert(`Failed to decline ride (${resp.status}): ${msg || 'Unknown error'}`);
      } else {
        await invalidateAll();
        alert('Ride declined. It has been returned to the dispatcher.');
      }
    } catch (e) {
      console.error(e);
      alert('Error declining ride. Please try again.');
    } finally {
      isUpdating = false;
    }
  }
</script>

<svelte:head>
  <title>My Rides - DriveKind</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">My Rides</h1>
      <p class="text-muted-foreground">View and manage your assigned rides</p>
    </div>
  </div>

  {#if data.error}
    <Card class="border-red-200 bg-red-50">
      <CardContent class="p-4">
        <p class="text-red-800">{data.error}</p>
      </CardContent>
    </Card>
  {/if}

  <Card>
    <div class="border-b border-gray-200">
      <div class="flex space-x-8 px-6">
        <button
          onclick={() => activeTab = "requests"}
          class="py-4 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'requests' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
        >
          Requests
          {#if rideCounts().requests > 0}
            <span class="ml-2 py-0.5 px-2 rounded-full text-xs bg-purple-100 text-purple-600">{rideCounts().requests}</span>
          {/if}
        </button>

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
          Completed/Cancelled
          {#if rideCounts().completed > 0}
            <span class="ml-2 py-0.5 px-2 rounded-full text-xs bg-green-100 text-green-600">{rideCounts().completed}</span>
          {/if}
        </button>
      </div>
    </div>

    <CardContent class="p-6 border-b">
      <div class="relative">
        <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input placeholder="Search rides..." bind:value={searchTerm} class="pl-10" />
      </div>
    </CardContent>
  </Card>

  <div class="grid gap-4">
    {#each filteredRides() as ride}
      <Card>
        <CardContent class="p-6">
          <div class="flex items-start justify-between">
            <div class="space-y-2 flex-1">
              <div class="flex items-center gap-2">
                <h3 class="text-lg font-semibold">{getClientName(ride)}</h3>
                <Badge class={getStatusColor(ride.status)}>{ride.status.toUpperCase()}</Badge>
                {#if ride.purpose}<Badge variant="outline">{ride.purpose}</Badge>{/if}
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div class="flex items-center gap-2">
                  <Phone class="w-4 h-4" />{getClientPhone(ride)}
                </div>
                <div class="flex items-center gap-2">
                  <Calendar class="w-4 h-4" />{formatDate(ride.appointment_time)} at {formatTime(ride.appointment_time)}
                </div>

                <div class="flex items-start gap-2">
                  <MapPin class="w-4 h-4 mt-0.5" />
                  <div>
                    <div class="font-medium">Pickup:</div>
                    {#if ride.pickup_from_home}
                      <div>Client's Home</div>
                    {:else if (ride.alt_pickup_address)}
                      <div>{ride.alt_pickup_address}</div>
                      {#if (ride.alt_pickup_address2)}<div>{ride.alt_pickup_address2}</div>{/if}
                      <div>{ride.alt_pickup_city}, {ride.alt_pickup_state} {ride.alt_pickup_zipcode}</div>
                    {:else}
                      <div>Client's Home</div>
                    {/if}
                  </div>
                </div>

                <div class="flex items-start gap-2">
                  <MapPin class="w-4 h-4 mt-0.5" />
                  <div>
                    <div class="font-medium">Dropoff:</div>
                    <div>{ride.destination_name}</div>
                    <div>{ride.dropoff_address}</div>
                    {#if (ride.dropoff_address2)}<div>{ride.dropoff_address2}</div>{/if}
                    <div>{ride.dropoff_city}, {ride.dropoff_state} {ride.dropoff_zipcode}</div>
                  </div>
                </div>

                {#if ride.estimated_appointment_length}
                  <div class="flex items-center gap-2">
                    <Clock class="w-4 h-4" />Estimated: {ride.estimated_appointment_length}
                  </div>
                {/if}

                {#if ride.round_trip}
                  <div class="flex items-center gap-2">
                    <Car class="w-4 h-4" />Round trip
                  </div>
                {/if}

                {#if ride.riders > 0}
                  <div class="flex items-center gap-2">
                    <Car class="w-4 h-4" />{ride.riders} passenger{ride.riders > 1 ? 's' : ''}
                  </div>
                {/if}
              </div>

              {#if ride.notes}
                <div class="text-sm">
                  <span class="font-medium">Notes:</span> {ride.notes}
                </div>
              {/if}
            </div>

            <div class="flex gap-2 ml-4">
              {#if ride.status === "Pending"}
                <Button size="sm" onclick={() => acceptRide(ride.ride_id)} disabled={isUpdating}>
                  <CheckCircle class="w-4 h-4 mr-1" />Accept
                </Button>
                <Button variant="outline" size="sm" onclick={() => declineRide(ride.ride_id)} disabled={isUpdating}>
                  <XCircle class="w-4 h-4 mr-1" />Decline
                </Button>
              {:else if ride.status === "Scheduled" || ride.status === "Assigned"}
                <Button size="sm" onclick={() => startRide(ride.ride_id)} disabled={isUpdating}>
                  <Play class="w-4 h-4 mr-1" />Start Ride
                </Button>
                <Button size="sm" variant="outline" onclick={() => openCompletionModal(ride)} disabled={isUpdating}>
                  <CheckCircle class="w-4 h-4 mr-1" />Complete
                </Button>
              {:else if ride.status === "In Progress"}
                <Button size="sm" onclick={() => openCompletionModal(ride)} disabled={isUpdating}>
                  <CheckCircle class="w-4 h-4 mr-1" />Report Complete
                </Button>
              {/if}

              {#if ride.status !== "Completed" && ride.status !== "Cancelled" && ride.status !== "Reported"}
                <Button variant="outline" size="sm" onclick={() => updateRideStatus(ride.ride_id, 'Cancelled')} disabled={isUpdating}>
                  <XCircle class="w-4 h-4 mr-1" />Cancel
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
            You don't have any assigned or requested rides yet.
          {:else}
            No rides match your current tab and filters.
          {/if}
        </p>
      </CardContent>
    </Card>
  {/if}
</div>

<RideCompletionModal
  bind:show={showCompletionModal}
  ride={selectedRideForCompletion}
  isDriver={true}
  onSubmit={submitCompletion}
  isSubmitting={isUpdating}
/>