<script lang="ts">
  import { X, UserCheck, AlertCircle, Search } from "@lucide/svelte";

  let {
    show = $bindable(false),
    ride,
    token, // required: auth token
    isLoading = false, // external loading flag (optional)
  } = $props();

  // Matched drivers shape expected from /rides/:rideId/match-drivers
  type MatchDriver = {
    user_id: string;
    first_name: string;
    last_name: string;
    score: number;
    match_quality: "excellent" | "good" | "fair" | "poor" | "excluded";
    reasons: string[];
    exclusion_reasons: string[];
  };

  let matchedDrivers = $state<{
    available: MatchDriver[];
    excluded: MatchDriver[];
  }>({ available: [], excluded: [] });

  let isMatching = $state(false);
  let searchTerm = $state("");
  let selectedDriverIds = $state<Set<string>>(new Set());

  // driver_id -> "pending" | "denied"
  let requestStatusMap = $state<Record<string, "pending" | "denied">>({});

  // Derived: filter available by search
  let filteredAvailable = $derived(() => {
    if (!searchTerm) return matchedDrivers.available;
    const q = searchTerm.toLowerCase();
    return matchedDrivers.available.filter((d) =>
      `${d.first_name} ${d.last_name}`.toLowerCase().includes(q)
    );
  });

  // Derived: selectable drivers (not pending/denied)
  let selectableDrivers = $derived(() => {
    return filteredAvailable().filter(
      (d) => !requestStatusMap[String(d.user_id)]
    );
  });

  function closeModal() {
    show = false;
    searchTerm = "";
    selectedDriverIds = new Set();
  }

  function getQualityColor(quality: string) {
    switch (quality) {
      case "excellent":
        return "bg-green-100 text-green-800 border-green-200";
      case "good":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "fair":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "poor":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  }

  function getQualityIcon(quality: string) {
    switch (quality) {
      case "excellent":
        return "⭐⭐⭐";
      case "good":
        return "⭐⭐";
      case "fair":
        return "⭐";
      default:
        return "";
    }
  }

  function toggleDriver(driverId: string) {
    if (selectedDriverIds.has(driverId)) {
      selectedDriverIds.delete(driverId);
    } else {
      selectedDriverIds.add(driverId);
    }
    selectedDriverIds = new Set(selectedDriverIds); // Trigger reactivity
  }

  function selectAll() {
    selectedDriverIds = new Set(selectableDrivers().map((d) => d.user_id));
  }

  function clearSelection() {
    selectedDriverIds = new Set();
  }

  // Open -> load matches, then load request statuses so Pending/Denied persist
  $effect(() => {
    if (show && ride) {
      void fetchMatchedDrivers();
    } else if (!show) {
      // Reset when closed
      selectedDriverIds = new Set();
      searchTerm = "";
    }
  });

  async function fetchMatchedDrivers() {
    if (!token || !ride?.ride_id) return;

    isMatching = true;
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/rides/${ride.ride_id}/match-drivers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        const t = await res.text();
        console.error("match-drivers failed:", res.status, t);
        alert("Failed to load drivers.");
        return;
      }
      const data = await res.json();
      // API may return {success, available, excluded,...} or just the arrays – normalize:
      matchedDrivers = {
        available: data.available ?? data?.data?.available ?? [],
        excluded: data.excluded ?? data?.data?.excluded ?? [],
      };

      // Now load previously sent requests so buttons show Pending/Denied on refresh
      await loadRequestStatuses();
    } catch (e) {
      console.error("Error fetching matched drivers:", e);
      alert("Error loading drivers. Please try again.");
    } finally {
      isMatching = false;
    }
  }

  async function loadRequestStatuses() {
    if (!token || !ride?.ride_id) return;
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/rides/${ride.ride_id}/requests`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) {
        console.warn("requests fetch non-OK", res.status);
        requestStatusMap = {};
        return;
      }
      const payload = await res.json();
      // Backend returns { success: true, requests: [{driver_id, denied}] }
      const rows = Array.isArray(payload) ? payload : payload.requests ?? [];
      const map: Record<string, "pending" | "denied"> = {};
      rows.forEach((r: any) => {
        map[String(r.driver_id)] = r.denied ? "denied" : "pending";
      });
      requestStatusMap = map;
    } catch (e) {
      console.error("loadRequestStatuses error:", e);
      requestStatusMap = {};
    }
  }

  async function sendRequestsToSelectedDrivers() {
    if (!token || !ride?.ride_id || selectedDriverIds.size === 0) return;

    const driverIdsArray = Array.from(selectedDriverIds);

    try {
      const results = await Promise.allSettled(
        driverIdsArray.map((driverId) =>
          fetch(
            `${import.meta.env.VITE_API_URL}/rides/${ride.ride_id}/send-request`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ driver_user_id: driverId }),
            }
          ).then((r) => r.json())
        )
      );

      const successful = results.filter(
        (r) => r.status === "fulfilled"
      ).length;
      const failed = results.filter((r) => r.status === "rejected").length;

      // Optimistically update all selected drivers to pending
      const newMap = { ...requestStatusMap };
      driverIdsArray.forEach((id) => {
        newMap[String(id)] = "pending";
      });
      requestStatusMap = newMap;

      // Clear selection
      selectedDriverIds = new Set();

      if (successful > 0) {
        alert(
          `Ride request sent to ${successful} driver${
            successful !== 1 ? "s" : ""
          }!${failed > 0 ? ` (${failed} failed)` : ""}`
        );
      } else {
        alert("Failed to send ride requests to any drivers");
      }

      // Optionally reload statuses to confirm
      await loadRequestStatuses();
    } catch (e) {
      console.error("send-request error:", e);
      alert("Error sending requests.");
    }
  }

  // NEW: send a request to an excluded driver, with confirmation
  async function sendRequestToExcludedDriver(driver: MatchDriver) {
    if (!token || !ride?.ride_id) return;

    const fullName = `${driver.first_name} ${driver.last_name}`;
    const reasonText = driver.exclusion_reasons?.length
      ? driver.exclusion_reasons.join("; ")
      : "no specific reason was provided.";

    const confirmMessage = `Are you sure you want to send this request to ${fullName}? They are currently not able to take this ride because ${reasonText}`;

    const ok = window.confirm(confirmMessage);
    if (!ok) return;

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/rides/${ride.ride_id}/send-request`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ driver_user_id: driver.user_id }),
        }
      );

      if (!res.ok) {
        const t = await res.text();
        console.error("send-request failed:", res.status, t);
        alert("Failed to send ride request to this driver.");
        return;
      }

      // Optimistically set this driver to pending
      requestStatusMap = {
        ...requestStatusMap,
        [String(driver.user_id)]: "pending",
      };

      alert(`Ride request sent to ${fullName}.`);

      // Refresh statuses from backend
      await loadRequestStatuses();
    } catch (e) {
      console.error("send-request error:", e);
      alert("Error sending request to this driver.");
    }
  }
</script>

{#if show}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div
      class="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col"
    >
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-xl font-semibold">Send Ride Request</h2>
          <p class="text-sm text-gray-600">
            Drivers are ranked by best match for this ride
          </p>
        </div>
        <button onclick={closeModal} class="text-gray-400 hover:text-gray-600">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Ride Summary -->
      {#if ride}
        <div class="bg-blue-50 rounded-lg p-4 mb-4">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <span class="font-medium text-gray-700">Client:</span>
              <span class="ml-2 text-gray-900"
                >{ride.clients?.first_name} {ride.clients?.last_name}</span
              >
            </div>
            <div>
              <span class="font-medium text-gray-700">Destination:</span>
              <span class="ml-2 text-gray-900">{ride.destination_name}</span>
            </div>
            <div>
              <span class="font-medium text-gray-700">Passengers:</span>
              <span class="ml-2 text-gray-900">{ride.riders || 1}</span>
            </div>
            <div>
              <span class="font-medium text-gray-700">Time:</span>
              <span class="ml-2 text-gray-900">
                {new Date(ride.appointment_time).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>

          <!-- Notes + Client Limitations -->
          <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div class="flex items-start">
              <span class="font-medium text-gray-700">Notes:</span>
              <span class="ml-2 text-gray-900 break-words"
                >{ride.notes || "—"}</span
              >
            </div>
            <div class="flex items-start">
              <span class="font-medium text-gray-700"
                >Client limitations:</span
              >
              <span class="ml-2 text-gray-900 break-words"
                >{ride.clients?.other_limitations || "None"}</span
              >
            </div>
          </div>
        </div>
      {/if}

      {#if isMatching}
        <div class="py-12 text-center">
          <div
            class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"
          ></div>
          <p class="mt-4 text-gray-600">Finding best matched drivers...</p>
        </div>
      {:else}
        <!-- Search & Selection Controls -->
        <div class="space-y-3 mb-4">
          <div class="relative">
            <Search
              class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4"
            />
            <input
              type="text"
              bind:value={searchTerm}
              placeholder="Search drivers by name..."
              class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {#if selectedDriverIds.size > 0}
            <div
              class="flex items-center justify-between text-sm bg-blue-50 border border-blue-200 rounded-lg px-4 py-2"
            >
              <span class="text-blue-900 font-medium">
                <strong>{selectedDriverIds.size}</strong> driver{selectedDriverIds.size !== 1
                  ? "s"
                  : ""} selected
              </span>
              <div class="flex gap-2">
                <button
                  onclick={clearSelection}
                  class="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Clear
                </button>
                {#if selectableDrivers().length > 0 &&
                  selectedDriverIds.size < selectableDrivers().length}
                  <button
                    onclick={selectAll}
                    class="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Select All ({selectableDrivers().length})
                  </button>
                {/if}
              </div>
            </div>
          {/if}
        </div>

        <!-- Available Drivers -->
        <div class="flex-1 overflow-y-auto mb-4">
          {#if filteredAvailable().length > 0}
            <div class="space-y-3">
              <h3
                class="text-sm font-semibold text-gray-700 uppercase tracking-wide sticky top-0 bg-white py-2"
              >
                Available Drivers ({filteredAvailable().length})
              </h3>

              {#each filteredAvailable() as driver}
                {@const isRequested =
                  !!requestStatusMap[String(driver.user_id)]}
                {@const requestStatus =
                  requestStatusMap[String(driver.user_id)]}

                <div
                  class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors {selectedDriverIds.has(
                    driver.user_id
                  )
                    ? 'bg-blue-50 border-blue-300'
                    : ''}"
                >
                  <div class="flex items-start gap-3">
                    <!-- Checkbox (only if not already requested) -->
                    {#if !isRequested}
                      <input
                        type="checkbox"
                        checked={selectedDriverIds.has(driver.user_id)}
                        onchange={() => toggleDriver(driver.user_id)}
                        class="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    {/if}

                    <div class="flex-1">
                      <div class="flex items-center gap-3 mb-2">
                        <h4 class="font-semibold text-gray-900">
                          {driver.first_name} {driver.last_name}
                        </h4>
                        <span
                          class="px-2 py-1 text-xs font-medium rounded-full border {getQualityColor(
                            driver.match_quality
                          )}"
                        >
                          {getQualityIcon(driver.match_quality)}
                          {driver.match_quality.toUpperCase()}
                        </span>
                        <span class="text-sm text-gray-600"
                          >Score: {driver.score}</span
                        >
                      </div>

                      {#if driver.reasons?.length > 0}
                        <div class="space-y-1">
                          {#each driver.reasons as reason}
                            <div
                              class="flex items-center gap-2 text-sm text-gray-600"
                            >
                              <div
                                class="w-1.5 h-1.5 bg-green-500 rounded-full"
                              ></div>
                              <span>{reason}</span>
                            </div>
                          {/each}
                        </div>
                      {/if}
                    </div>

                    <!-- Status badge (if already requested) -->
                    {#if requestStatus === "pending"}
                      <span
                        class="ml-4 px-3 py-2 text-sm rounded-lg border bg-gray-100 text-gray-700 whitespace-nowrap"
                      >
                        Pending
                      </span>
                    {:else if requestStatus === "denied"}
                      <span
                        class="ml-4 px-3 py-2 text-sm rounded-lg border bg-red-50 text-red-700 whitespace-nowrap"
                      >
                        Denied
                      </span>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {:else if searchTerm}
            <div class="text-center py-8 text-gray-500">
              <p>No drivers match your search</p>
            </div>
          {:else}
            <div class="text-center py-8 text-gray-500">
              <p>No available drivers found</p>
            </div>
          {/if}

          <!-- Excluded Drivers -->
          {#if matchedDrivers.excluded.length > 0}
            <details class="border border-gray-200 rounded-lg mt-4">
              <summary
                class="px-4 py-3 cursor-pointer hover:bg-gray-50 flex items-center gap-2"
              >
                <AlertCircle class="w-4 h-4 text-gray-400" />
                <span class="text-sm font-medium text-gray-700">
                  Unavailable Drivers ({matchedDrivers.excluded.length})
                </span>
              </summary>
              <div class="px-4 py-3 space-y-2 border-t border-gray-200">
                {#each matchedDrivers.excluded as d}
                  {@const status = requestStatusMap[String(d.user_id)]}
                  <div class="py-2 flex items-start justify-between gap-3">
                    <div>
                      <p class="font-medium text-gray-900">
                        {d.first_name} {d.last_name}
                      </p>
                      {#if d.exclusion_reasons?.length > 0}
                        <div class="space-y-0.5 mt-1">
                          {#each d.exclusion_reasons as reason}
                            <p class="text-xs text-red-600">• {reason}</p>
                          {/each}
                        </div>
                      {/if}
                    </div>
                    <div class="flex items-center">
                      {#if status === "pending"}
                        <span
                          class="px-3 py-1.5 text-xs rounded-lg border bg-gray-100 text-gray-700 whitespace-nowrap"
                        >
                          Pending
                        </span>
                      {:else if status === "denied"}
                        <span
                          class="px-3 py-1.5 text-xs rounded-lg border bg-red-50 text-red-700 whitespace-nowrap"
                        >
                          Denied
                        </span>
                      {:else}
                        <button
                          onclick={() => sendRequestToExcludedDriver(d)}
                          class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors"
                        >
                          Send Request Anyway
                        </button>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            </details>
          {/if}
        </div>
      {/if}

      <!-- Footer -->
      <div class="flex justify-end gap-2 pt-4 border-t">
        <button
          onclick={closeModal}
          disabled={isLoading}
          class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Done
        </button>
        <button
          onclick={sendRequestsToSelectedDrivers}
          disabled={isLoading || selectedDriverIds.size === 0}
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <UserCheck class="w-4 h-4" />
          {isLoading
            ? "Sending..."
            : `Send to ${selectedDriverIds.size} Driver${
                selectedDriverIds.size !== 1 ? "s" : ""
              }`}
        </button>
      </div>
    </div>
  </div>
{/if} 