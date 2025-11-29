<!-- +page.svelte -->
<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import { Card, CardContent } from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import {
    Calendar,
    Car,
    CheckCircle,
    Clock,
    MapPin,
    Phone,
    Play,
    Search,
    XCircle,
    Edit,
    AlertCircle,
    DollarSign
  } from "@lucide/svelte";
  import { invalidateAll } from "$app/navigation";
  import type { PageData } from "./$types";
  import RideCompletionModal from "$lib/components/RideCompletionModal.svelte";
  import { validateRideCompletion, sanitizeInput } from "$lib/utils/validation";
  import { supabase } from "$lib/supabase";
  import { page } from "$app/stores";
  import { onMount } from "svelte";

  let { data }: { data: PageData } = $props();

  // === API base (trim trailing slash). Falls back to localhost:3000 in dev.
  const API_BASE =
    import.meta.env.VITE_API_URL?.replace(/\/+$/, "") ||
    (typeof window !== "undefined"
      ? `${window.location.protocol}//localhost:3000`
      : "http://localhost:3000");

  let searchTerm = $state("");
  let activeTab = $state("requests"); // requests | scheduled | active | completed
  let isUpdating = $state(false);

  // ---- Driver weekly rides preference ----
  let maxWeeklyRides = $state(
    data.profile?.max_weekly_rides != null
      ? String(data.profile.max_weekly_rides)
      : ""
  );
  let isSavingMaxWeekly = $state(false);

  let showCompletionModal = $state(false);
  let selectedRideForCompletion = $state<any>(null);
  let showEditModal = $state(false);
  let selectedRideForEdit = $state<any>(null);
  let editForm = $state({
    miles_driven: "",
    hours: "",
    notes: "",
    completion_status: "",
    donation: false,
    donation_type: "",
    donation_amount: ""
  });

  // Vehicle selection for ride acceptance
  let showVehicleSelectionModal = $state(false);
  let selectedRideForAcceptance = $state<any>(null);
  let selectedVehicleId = $state<number | null>(null);

  function getStatusColor(status: string) {
    switch (status) {
      case "Scheduled":
        return "bg-blue-100 text-blue-800";
      case "Assigned":
        return "bg-blue-100 text-blue-800";
      case "In Progress":
        return "bg-yellow-100 text-yellow-800";
      case "Completed":
        return "bg-green-100 text-green-800";
      case "Cancelled":
        return "bg-red-100 text-red-800";
      case "Pending":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }

  const formatDate = (ts: string) => new Date(ts).toLocaleDateString();
  const formatTime = (ts: string) =>
    new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const getClientName = (ride: any) =>
    ride?.clients
      ? `${ride.clients.first_name} ${ride.clients.last_name}`
      : "Unknown Client";
  const getClientPhone = (ride: any) =>
    ride?.clients?.primary_phone || "No phone";

  // Filtered list uses "Pending" for Requests tab
  let filteredRides = $derived(() => {
    const list = data.rides ?? [];
    return list.filter((ride: any) => {
      const clientName = getClientName(ride);
      const matchesSearch =
        clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ride.dropoff_address || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (ride.alt_pickup_address || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      let matchesTab = false;
      if (activeTab === "requests") {
        matchesTab = ride.status === "Pending";
      } else if (activeTab === "scheduled") {
        matchesTab = ride.status === "Scheduled" || ride.status === "Assigned";
      } else if (activeTab === "active") {
        matchesTab = ride.status === "In Progress";
      } else if (activeTab === "completed") {
        matchesTab =
          ride.status === "Completed" || ride.status === "Cancelled";
      }

      return matchesSearch && matchesTab;
    });
  });

  let rideCounts = $derived(() => {
    const list = data.rides ?? [];
    return {
      requests: list.filter((r: any) => r.status === "Pending").length,
      scheduled: list.filter(
        (r: any) => r.status === "Scheduled" || r.status === "Assigned"
      ).length,
      active: list.filter((r: any) => r.status === "In Progress").length,
      completed: list.filter(
        (r: any) => r.status === "Completed" || r.status === "Cancelled"
      ).length
    };
  });

  async function updateRideStatus(rideId: number, newStatus: string) {
    isUpdating = true;
    try {
      const resp = await fetch(`/driver/rides/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rideId, status: newStatus })
      });
      if (!resp.ok) {
        let msg = "";
        try {
          msg = (await resp.json()).error ?? "";
        } catch {
          msg = await resp.text();
        }
        alert(
          `Failed to update ride status (${resp.status}): ${
            msg || "Unknown error"
          }`
        );
      } else {
        await invalidateAll();
      }
    } catch (e) {
      console.error(e);
      alert("Error updating ride status. Please try again.");
    } finally {
      isUpdating = false;
    }
  }
  const startRide = (id: number) => updateRideStatus(id, "In Progress");

  function openCompletionModal(ride: any) {
    selectedRideForCompletion = ride;
    showCompletionModal = true;
  }

  async function submitCompletion(formData: any) {
    if (!selectedRideForCompletion) return;

    if (formData.miles_driven || formData.hours) {
      const v = validateRideCompletion({
        miles_driven: formData.miles_driven?.toString() || "0",
        hours: formData.hours?.toString() || "0",
        riders: formData.riders?.toString()
      });
      if (!v.valid) {
        alert(
          "Please fix the following errors:\n• " + v.errors.join("\n• ")
        );
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rideId: selectedRideForCompletion.ride_id,
          ...sanitized
        })
      });

      if (!resp.ok) {
        let msg = "";
        try {
          msg = (await resp.json()).error ?? "";
        } catch {
          msg = await resp.text();
        }
        alert(
          `Failed to report completion (${resp.status}): ${
            msg || "Unknown error"
          }`
        );
      } else {
        showCompletionModal = false;
        selectedRideForCompletion = null;
        await invalidateAll();
      }
    } catch (e) {
      console.error(e);
      alert("Error reporting completion. Please try again.");
    } finally {
      isUpdating = false;
    }
  }

  // Helper to read error body safely
  async function readError(resp: Response) {
    try {
      const j = await resp.json();
      return j?.error || j?.message || JSON.stringify(j);
    } catch {
      try {
        return await resp.text();
      } catch {
        return "";
      }
    }
  }

  // ---- Save max_weekly_rides for this driver ----
  async function saveMaxWeeklyRides() {
    const raw = maxWeeklyRides.trim();
    let value: number | null = null;

    // blank = no limit
    if (raw !== "") {
      const parsed = parseInt(raw, 10);
      if (Number.isNaN(parsed) || parsed < 0) {
        alert(
          "Please enter a non-negative whole number for max weekly rides, or leave it blank for no limit."
        );
        return;
      }
      value = parsed;
    }

    if (!data.profile) {
      alert("Profile not loaded. Please refresh the page.");
      return;
    }

    isSavingMaxWeekly = true;
    try {
      // Directly update staff_profiles via Supabase (no external API)
      const { error } = await supabase
        .from("staff_profiles")
        .update({ max_weekly_rides: value })
        .eq("user_id", data.profile.user_id);

      if (error) {
        console.error("Update max_weekly_rides failed:", error);
        alert(`Failed to update weekly ride limit: ${error.message}`);
        return;
      }

      alert("Weekly ride limit updated.");
      maxWeeklyRides = value != null ? String(value) : "";
      await invalidateAll();
    } catch (e) {
      console.error(e);
      alert("Error updating weekly ride limit. Please try again.");
    } finally {
      isSavingMaxWeekly = false;
    }
  }

  // Accept - with vehicle selection if multiple eligible vehicles
  function openAcceptModal(ride: any) {
    selectedRideForAcceptance = ride;
    selectedVehicleId = null;

    // If no eligible vehicles, show error
    if (!ride.eligibleVehicles || ride.eligibleVehicles.length === 0) {
      alert(
        "No eligible vehicles for this ride. Please activate a vehicle with enough seats."
      );
      return;
    }

    // If only one eligible vehicle, auto-select it and accept
    if (ride.eligibleVehicles.length === 1) {
      selectedVehicleId = ride.eligibleVehicles[0].vehicle_id;
      void acceptRideWithVehicle(
        ride.ride_id,
        ride.eligibleVehicles[0].vehicle_id
      );
      return;
    }

    // Show vehicle selection modal if multiple vehicles
    showVehicleSelectionModal = true;
  }

  async function acceptRideWithVehicle(rideId: number, vehicleId: number) {
    if (!vehicleId) {
      alert("Please select a vehicle before accepting the ride.");
      return;
    }

    isUpdating = true;
    try {
      // Use SvelteKit server endpoint (server-side auth, no client session needed)
      const resp = await fetch(`/driver/rides/accept/${rideId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ vehicle_id: vehicleId })
      });

      if (!resp.ok) {
        const data = await resp.json();
        console.error("Accept failed:", resp.status, data.error);
        alert(`Failed to accept ride: ${data.error || "Unknown error"}`);
      } else {
        showVehicleSelectionModal = false;
        selectedRideForAcceptance = null;
        selectedVehicleId = null;
        await invalidateAll();
        alert("Ride accepted! It now appears in your Scheduled tab.");
      }
    } catch (e) {
      console.error("Network error:", e);
      alert("Error accepting ride. Please try again.");
    } finally {
      isUpdating = false;
    }
  }

  // Legacy function for backward compatibility
  async function acceptRide(rideId: number) {
    // Find the ride to check eligible vehicles
    const ride = data.rides?.find((r: any) => r.ride_id === rideId);
    if (ride) {
      openAcceptModal(ride);
    } else {
      alert("Ride not found.");
    }
  }


  // Decline a pending ride request
  async function declineRide(rideId: number) {
    if (!confirm("Are you sure you want to decline this ride request?")) {
      return;
    }

    isUpdating = true;
    try {
      const resp = await fetch("/driver/rides/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rideId })
      });

      if (!resp.ok) {
        const msg = await readError(resp);
        console.error("Decline failed:", resp.status, msg);
        alert(
          `Failed to decline ride (${resp.status}): ${
            msg || "Unknown error"
          }`
        );
      } else {
        await invalidateAll();
        alert("Ride declined. It has been returned to the dispatcher.");
      }
    } catch (e) {
      console.error(e);
      alert("Error declining ride. Please try again.");
    } finally {
      isUpdating = false;
    }
  }


  // Cancel scheduled/assigned ride (unassign driver, set to Pending)
  async function cancelScheduledRide(rideId: number) {
    if (
      !confirm("Are you sure you want to be unassigned from this ride?")
    ) {
      return;
    }

    isUpdating = true;
    try {
      const resp = await fetch(`/driver/rides/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rideId })
      });

      if (!resp.ok) {
        const msg = await readError(resp);
        console.error("Cancel failed:", resp.status, msg);
        alert(
          `Failed to cancel ride (${resp.status}): ${
            msg || "Unknown error"
          }`
        );
      } else {
        await invalidateAll();
        alert(
          "You have been unassigned from this ride. It has been returned to Requested."
        );
      }
    } catch (e) {
      console.error(e);
      alert("Error cancelling ride. Please try again.");
    } finally {
      isUpdating = false;
    }
  }

  function openEditModal(ride: any) {
    selectedRideForEdit = ride;
    editForm = {
      miles_driven: ride.miles_driven?.toString() || "",
      hours: ride.hours?.toString() || "",
      notes: ride.notes || "",
      completion_status: ride.completion_status || "",
      donation: !!ride.donation,
      donation_type: ride.donation_type || "",
      donation_amount: ride.donation_amount?.toString() || ""
    };
    showEditModal = true;
  }

  async function saveRideEdit() {
    if (!selectedRideForEdit) return;

    // Validate numbers
    if (editForm.miles_driven && isNaN(Number(editForm.miles_driven))) {
      alert("Miles driven must be a valid number");
      return;
    }
    if (editForm.hours && isNaN(Number(editForm.hours))) {
      alert("Hours must be a valid number");
      return;
    }
    if (
      editForm.donation &&
      editForm.donation_amount &&
      isNaN(Number(editForm.donation_amount))
    ) {
      alert("Donation amount must be a valid number");
      return;
    }

    isUpdating = true;
    try {
      const payload = {
        rideId: selectedRideForEdit.ride_id,
        miles_driven: editForm.miles_driven
          ? parseFloat(editForm.miles_driven)
          : null,
        hours: editForm.hours ? parseFloat(editForm.hours) : null,
        notes: editForm.notes || null,
        completion_status: editForm.completion_status || null,
        donation: editForm.donation,
        donation_type: editForm.donation
          ? editForm.donation_type || null
          : null,
        donation_amount: editForm.donation
          ? editForm.donation_amount
            ? parseFloat(editForm.donation_amount)
            : 0
          : 0
      };

      const resp = await fetch(`/driver/rides/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        const errorData = await resp
          .json()
          .catch(() => ({ error: "Unknown error" }));
        alert(
          `Failed to update ride: ${errorData.error || "Unknown error"}`
        );
        return;
      }

      showEditModal = false;
      selectedRideForEdit = null;
      await invalidateAll();
      alert("Ride updated successfully!");
    } catch (e) {
      console.error(e);
      alert("Error updating ride. Please try again.");
    } finally {
      isUpdating = false;
    }
  }

  // Clear donation fields when donation is unchecked
  $effect(() => {
    if (!editForm.donation) {
      editForm.donation_amount = "";
      editForm.donation_type = "";
    }
  });

  const COMPLETION_STATUS_OPTIONS = [
    "Completed Round Trip",
    "Completed One Way To",
    "Completed One Way From",
    "Cancelled by Client",
    "Cancelled by Driver"
  ];

  const DONATION_TYPE_OPTIONS = ["Cash", "Envelope"];

  let expandedRideId = $state<number | null>(null);

  onMount(() => {
    // Check for view parameter from email link
    const viewParam = $page.url.searchParams.get("view");
    if (viewParam) {
      const rideId = parseInt(viewParam);
      if (!isNaN(rideId)) {
        // Find the ride to determine which tab it's in
        const rideToView = data.rides?.find((r: any) => r.ride_id === rideId);
        if (rideToView) {
          // Switch to the correct tab based on ride status
          if (rideToView.status === "Pending") {
            activeTab = "requests";
          } else if (rideToView.status === "Scheduled" || rideToView.status === "Assigned") {
            activeTab = "scheduled";
          } else if (rideToView.status === "In Progress") {
            activeTab = "active";
          } else if (rideToView.status === "Completed" || rideToView.status === "Cancelled") {
            activeTab = "completed";
          }
          
          // Expand the ride card
          expandedRideId = rideId;
          
          // Scroll to the ride after a short delay (to allow tab switch and render)
          setTimeout(() => {
            const element = document.getElementById(`ride-${rideId}`);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              element.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
              
              // Remove highlight after 3 seconds
              setTimeout(() => {
                element.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
              }, 3000);
            }
          }, 200);
        }
        
        // Clean up URL
        const url = new URL(window.location.href);
        url.searchParams.delete("view");
        window.history.replaceState({}, "", url.toString());
      }
    }
  });
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

  {#if data.profile}
    <Card>
      <CardContent
        class="p-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between"
      >
        <div>
          <h2 class="text-lg font-semibold flex items-center gap-2">
            <Car class="w-5 h-5 text-blue-600" />
            Weekly Ride Limit
          </h2>
          <p class="text-sm text-muted-foreground">
            Set the maximum number of rides you prefer to drive each week.
            Leave blank for no limit.
          </p>
        </div>

        <div class="flex items-center gap-2 mt-2 md:mt-0">
          <Input
            type="number"
            min="0"
            class="w-28"
            placeholder="No limit"
            bind:value={maxWeeklyRides}
          />
          <Button
            size="sm"
            onclick={saveMaxWeeklyRides}
            disabled={isSavingMaxWeekly}
          >
            {isSavingMaxWeekly ? "Saving..." : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  {/if}

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
          onclick={() => (activeTab = "requests")}
          class="py-4 px-1 border-b-2 font-medium text-sm transition-colors {activeTab ===
          'requests'
            ? 'border-blue-500 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
        >
          Requests
          {#if rideCounts().requests > 0}
            <span
              class="ml-2 py-0.5 px-2 rounded-full text-xs bg-purple-100 text-purple-600"
              >{rideCounts().requests}</span
            >
          {/if}
        </button>

        <button
          onclick={() => (activeTab = "scheduled")}
          class="py-4 px-1 border-b-2 font-medium text-sm transition-colors {activeTab ===
          'scheduled'
            ? 'border-blue-500 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
        >
          Scheduled
          {#if rideCounts().scheduled > 0}
            <span
              class="ml-2 py-0.5 px-2 rounded-full text-xs bg-blue-100 text-blue-600"
              >{rideCounts().scheduled}</span
            >
          {/if}
        </button>

        <button
          onclick={() => (activeTab = "active")}
          class="py-4 px-1 border-b-2 font-medium text-sm transition-colors {activeTab ===
          'active'
            ? 'border-blue-500 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
        >
          In Progress
          {#if rideCounts().active > 0}
            <span
              class="ml-2 py-0.5 px-2 rounded-full text-xs bg-yellow-100 text-yellow-600"
              >{rideCounts().active}</span
            >
          {/if}
        </button>

        <button
          onclick={() => (activeTab = "completed")}
          class="py-4 px-1 border-b-2 font-medium text-sm transition-colors {activeTab ===
          'completed'
            ? 'border-blue-500 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
        >
          Completed/Cancelled
          {#if rideCounts().completed > 0}
            <span
              class="ml-2 py-0.5 px-2 rounded-full text-xs bg-green-100 text-green-600"
              >{rideCounts().completed}</span
            >
          {/if}
        </button>
      </div>
    </div>

    <CardContent class="p-6 border-b">
      <div class="relative">
        <Search
          class="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4"
        />
        <Input
          placeholder="Search rides..."
          bind:value={searchTerm}
          class="pl-10"
        />
      </div>
    </CardContent>
  </Card>

  <div class="grid gap-4">
    {#each filteredRides() as ride}
      <Card id={`ride-${ride.ride_id}`} class="transition-all duration-300">
        <CardContent class="p-6">
          <div class="flex items-start justify-between">
            <div class="space-y-2 flex-1">
              <div class="flex items-center gap-2">
                <h3 class="text-lg font-semibold">{getClientName(ride)}</h3>
                <Badge class={getStatusColor(ride.status)}
                  >{ride.status.toUpperCase()}</Badge
                >
                {#if ride.purpose}
                  <Badge variant="outline">{ride.purpose}</Badge>
                {/if}
              </div>

              <div
                class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground"
              >
                <div class="flex items-center gap-2">
                  <Phone class="w-4 h-4" />{getClientPhone(ride)}
                </div>
                <div class="flex items-center gap-2">
                  <Calendar class="w-4 h-4" />{formatDate(
                    ride.appointment_time
                  )} at {formatTime(ride.appointment_time)}
                </div>

                <div class="flex items-start gap-2">
                  <MapPin class="w-4 h-4 mt-0.5" />
                  <div>
                    <div class="font-medium">Pickup:</div>
                    {#if ride.pickup_from_home}
                      <div>Client's Home</div>
                    {:else if ride.alt_pickup_address}
                      <div>{ride.alt_pickup_address}</div>
                      {#if ride.alt_pickup_address2}
                        <div>{ride.alt_pickup_address2}</div>
                      {/if}
                      <div>
                        {ride.alt_pickup_city}, {ride.alt_pickup_state}
                        {""} {ride.alt_pickup_zipcode}
                      </div>
                    {:else}
                      <div>Client's Home</div>
                    {/if}
                  </div>
                </div>

                <div class="flex items-start gap-2">
                  <MapPin class="w-4 h-4 mt-0.5" />
                  <div>
                    <div class="font-medium">Destination:</div>
                    <div>{ride.destination_name}</div>
                    <div>{ride.dropoff_address}</div>
                    {#if ride.dropoff_address2}
                      <div>{ride.dropoff_address2}</div>
                    {/if}
                    <div>
                      {ride.dropoff_city}, {ride.dropoff_state}{" "}
                      {ride.dropoff_zipcode}
                    </div>
                  </div>
                </div>

                {#if ride.estimated_appointment_length}
                  <div class="flex items-center gap-2">
                    <Clock class="w-4 h-4" />Estimated:
                    {ride.estimated_appointment_length}
                  </div>
                {/if}

                {#if ride.round_trip}
                  <div class="flex items-center gap-2">
                    <Car class="w-4 h-4" />Round trip
                  </div>
                {/if}

                {#if ride.riders > 0}
                  <div class="flex items-center gap-2">
                    <Car class="w-4 h-4" />{ride.riders} passenger{ride.riders >
                    1 ? "s" : ""}
                  </div>
                {/if}

                <!-- Show assigned vehicle -->
                {#if ride.assigned_vehicle && ride.vehicles}
                  <div class="flex items-center gap-2">
                    <Car class="w-4 h-4" />
                    <div>
                      <span class="font-medium">Assigned Vehicle:</span>
                      <span class="ml-1"
                        >{ride.vehicles.type_of_vehicle_enum} -
                        {ride.vehicles.vehicle_color}</span
                      >
                    </div>
                  </div>
                {/if}

                <!-- Show donation info on completed rides -->
                {#if ride.donation &&
                  (ride.status === "Completed" || ride.status === "Cancelled")}
                  <div class="flex items-center gap-2">
                    <DollarSign class="w-4 h-4 text-green-600" />
                    <span class="text-green-700">
                      Donation: ${ride.donation_amount || 0}
                      {#if ride.donation_type}({ride.donation_type}){/if}
                    </span>
                  </div>
                {/if}
              </div>

              <!-- Limitations: now shown on ALL rides, not just Pending -->
              <div
                class="flex items-start gap-2 text-sm text-gray-700"
              >
                <AlertCircle class="w-4 h-4 mt-0.5" />
                <div>
                  <span class="font-medium">Limitations:</span>
                  <span class="ml-1">
                    {ride.clients?.other_limitations &&
                    ride.clients.other_limitations.trim().length > 0
                      ? ride.clients.other_limitations
                      : "None"}
                  </span>
                </div>
              </div>

              {#if ride.notes}
                <div class="text-sm">
                  <span class="font-medium">Notes:</span> {ride.notes}
                </div>
              {/if}
            </div>

            <div class="flex gap-2 ml-4">
              {#if ride.status === "Pending"}
                <!-- Show eligible vehicles info -->
                {#if ride.eligibleVehicles && ride.eligibleVehicles.length > 0}
                  <div class="text-xs text-gray-600 mb-2 mr-4">
                    {ride.eligibleVehicles.length === 1
                      ? `1 vehicle: ${
                          ride.eligibleVehicles[0].type_of_vehicle_enum
                        } (${ride.eligibleVehicles[0].vehicle_color})`
                      : `${ride.eligibleVehicles.length} vehicles available`}
                  </div>
                {:else if ride.eligibleVehicles &&
                  ride.eligibleVehicles.length === 0}
                  <div class="text-xs text-red-600 mb-2 mr-4">
                    No eligible vehicles (need {ride.riders + 1} seats)
                  </div>
                {/if}
                <Button
                  size="sm"
                  onclick={() => openAcceptModal(ride)}
                  disabled={
                    isUpdating ||
                    (ride.eligibleVehicles &&
                      ride.eligibleVehicles.length === 0)
                  }
                >
                  <CheckCircle class="w-4 h-4 mr-1" />Accept
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onclick={() => declineRide(ride.ride_id)}
                  disabled={isUpdating}
                >
                  <XCircle class="w-4 h-4 mr-1" />Decline
                </Button>
              {:else if ride.status === "Scheduled" ||
                ride.status === "Assigned"}
                <Button
                  size="sm"
                  onclick={() => startRide(ride.ride_id)}
                  disabled={isUpdating}
                >
                  <Play class="w-4 h-4 mr-1" />Start Ride
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onclick={() => openCompletionModal(ride)}
                  disabled={isUpdating}
                >
                  <CheckCircle class="w-4 h-4 mr-1" />Complete
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  class="text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
                  onclick={() => cancelScheduledRide(ride.ride_id)}
                  disabled={isUpdating}
                >
                  <XCircle class="w-4 h-4 mr-1" />Cancel
                </Button>
              {:else if ride.status === "In Progress"}
                <Button
                  size="sm"
                  onclick={() => openCompletionModal(ride)}
                  disabled={isUpdating}
                >
                  <CheckCircle class="w-4 h-4 mr-1" />Report Complete
                </Button>
              {/if}

              {#if ride.status !== "Pending" && ride.status !== "Cancelled"}
                <Button
                  variant="outline"
                  size="sm"
                  onclick={() => openEditModal(ride)}
                  disabled={isUpdating}
                >
                  <Edit class="w-4 h-4 mr-1" />Edit
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

  <!-- ======= DRIVER EDIT MODAL ======= -->
  {#if showEditModal && selectedRideForEdit}
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div
        class="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto"
      >
        <div class="mb-4">
          <h2 class="text-xl font-semibold">Edit Ride Details</h2>
          <p class="text-sm text-gray-600 mt-1">
            Update information for {getClientName(selectedRideForEdit)}
          </p>
        </div>

        <div class="space-y-4">
          <div>
            <label
              for="edit_miles"
              class="block text-sm font-medium text-gray-700 mb-1"
            >
              Miles Driven
            </label>
            <Input
              id="edit_miles"
              type="number"
              step="0.1"
              bind:value={editForm.miles_driven}
              placeholder="e.g., 12.5"
            />
            {#if selectedRideForEdit.miles_driven}
              <p class="text-xs text-gray-500 mt-1">
                Current: {selectedRideForEdit.miles_driven} miles
              </p>
            {/if}
          </div>

          <div>
            <label
              for="edit_hours"
              class="block text-sm font-medium text-gray-700 mb-1"
            >
              Hours
            </label>
            <Input
              id="edit_hours"
              type="number"
              step="0.1"
              bind:value={editForm.hours}
              placeholder="e.g., 1.5"
            />
            {#if selectedRideForEdit.hours}
              <p class="text-xs text-gray-500 mt-1">
                Current: {selectedRideForEdit.hours} hours
              </p>
            {/if}
          </div>

          <div>
            <label
              for="edit_completion_status"
              class="block text-sm font-medium text-gray-700 mb-1"
            >
              Completion Status
            </label>
            <select
              id="edit_completion_status"
              bind:value={editForm.completion_status}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">— Select completion type —</option>
              {#each COMPLETION_STATUS_OPTIONS as option}
                <option value={option}>{option}</option>
              {/each}
            </select>
            {#if selectedRideForEdit.completion_status}
              <p class="text-xs text-green-600 mt-1">
                Current: {selectedRideForEdit.completion_status}
              </p>
            {:else}
              <p class="text-xs text-gray-500 mt-1">Not yet set</p>
            {/if}
          </div>

          <!-- Donation Section -->
          <div class="border-t pt-4">
            <div class="flex items-center gap-2 mb-3">
              <input
                id="edit_donation"
                type="checkbox"
                bind:checked={editForm.donation}
                class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label
                for="edit_donation"
                class="text-sm font-medium text-gray-700"
              >
                Donation received
              </label>
            </div>

            {#if editForm.donation}
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label
                    for="edit_donation_type"
                    class="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Donation Type
                  </label>
                  <select
                    id="edit_donation_type"
                    bind:value={editForm.donation_type}
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">— Select type —</option>
                    {#each DONATION_TYPE_OPTIONS as dtype}
                      <option value={dtype}>{dtype}</option>
                    {/each}
                  </select>
                </div>
                <div>
                  <label
                    for="edit_donation_amount"
                    class="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Amount ($)
                  </label>
                  <Input
                    id="edit_donation_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    bind:value={editForm.donation_amount}
                    placeholder="0.00"
                  />
                </div>
              </div>
              {#if selectedRideForEdit.donation_amount}
                <p class="text-xs text-green-600 mt-2">
                  Current: ${selectedRideForEdit.donation_amount}
                  {#if selectedRideForEdit.donation_type}
                    ({selectedRideForEdit.donation_type})
                  {/if}
                </p>
              {/if}
            {/if}
          </div>

          <div>
            <label
              for="edit_notes"
              class="block text-sm font-medium text-gray-700 mb-1"
            >
              Notes
            </label>
            <textarea
              id="edit_notes"
              bind:value={editForm.notes}
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Any additional notes..."
            ></textarea>
          </div>
        </div>

        <div class="flex justify-end gap-2 mt-6">
          <Button
            variant="outline"
            onclick={() => {
              showEditModal = false;
              selectedRideForEdit = null;
            }}
            disabled={isUpdating}
          >
            Cancel
          </Button>
          <Button onclick={saveRideEdit} disabled={isUpdating}>
            {isUpdating ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  {/if}

  <RideCompletionModal
    bind:show={showCompletionModal}
    ride={selectedRideForCompletion}
    isDriver={true}
    onSubmit={submitCompletion}
    isSubmitting={isUpdating}
  />

  <!-- Vehicle Selection Modal for Ride Acceptance -->
  {#if showVehicleSelectionModal && selectedRideForAcceptance}
    <Dialog.Root bind:open={showVehicleSelectionModal}>
      <Dialog.Content class="sm:max-w-md bg-white">
        <Dialog.Header>
          <Dialog.Title>Select Vehicle</Dialog.Title>
          <Dialog.Description>
            Please select which vehicle you'll use.
          </Dialog.Description>
        </Dialog.Header>

        <div class="space-y-3 mt-4">
          {#each selectedRideForAcceptance.eligibleVehicles || [] as vehicle}
            <button
              type="button"
              class="w-full p-4 border-2 rounded-lg text-left transition-colors {selectedVehicleId ===
              vehicle.vehicle_id
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}"
              onclick={() => (selectedVehicleId = vehicle.vehicle_id)}
            >
              <div class="flex items-center justify-between">
                <div>
                  <div class="font-medium text-gray-900">
                    {vehicle.type_of_vehicle_enum} - {vehicle.vehicle_color}
                  </div>
                  <div class="text-sm text-gray-600 mt-1">
                    {vehicle.nondriver_seats + 1} total seats (
                    {vehicle.nondriver_seats} passengers)
                  </div>
                </div>
                {#if selectedVehicleId === vehicle.vehicle_id}
                  <CheckCircle class="w-5 h-5 text-blue-600" />
                {/if}
              </div>
            </button>
          {/each}
        </div>

        <Dialog.Footer class="mt-6">
          <Button
            variant="outline"
            onclick={() => {
              showVehicleSelectionModal = false;
              selectedRideForAcceptance = null;
              selectedVehicleId = null;
            }}
            disabled={isUpdating}
          >
            Cancel
          </Button>
          <Button
            onclick={() => {
              if (selectedVehicleId) {
                void acceptRideWithVehicle(
                  selectedRideForAcceptance.ride_id,
                  selectedVehicleId
                );
              } else {
                alert("Please select a vehicle");
              }
            }}
            disabled={isUpdating || !selectedVehicleId}
          >
            {isUpdating ? "Accepting..." : "Accept Ride"}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  {/if}
</div>