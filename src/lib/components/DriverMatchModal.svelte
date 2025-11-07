<script lang="ts">
  import { X, UserCheck, AlertCircle, Clock, XCircle } from "@lucide/svelte";

  let { 
    show = $bindable(false),
    ride,
    token,               // Auth token
    onSelectDriver,      // Called to send request
    isLoading = false
  } = $props();

  // Matched drivers as returned by your existing API
  let matchedDrivers = $state<{ available: any[]; excluded: any[] }>({ available: [], excluded: [] });
  let isMatching = $state(false);
  let searchTerm = $state("");
  let selectedDriver = $state<any>(null);

  // Request-status map keyed by driver_user_id
  // value: { denied: boolean }  (missing key => no request sent yet)
  let requestStatusByDriverId = $state<Record<string, { denied: boolean }>>({});

  // --- Deriveds ---
  let filteredAvailable = $derived(() => {
    if (!searchTerm) return matchedDrivers.available;
    const q = searchTerm.toLowerCase();
    return matchedDrivers.available.filter(d =>
      `${d.first_name} ${d.last_name}`.toLowerCase().includes(q)
    );
  });

  // --- UI helpers ---
  function closeModal() {
    show = false;
    searchTerm = "";
    selectedDriver = null;
  }

  function getQualityColor(quality: string) {
    switch (quality) {
      case "excellent": return "bg-green-100 text-green-800 border-green-200";
      case "good":      return "bg-blue-100 text-blue-800 border-blue-200";
      case "fair":      return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "poor":      return "bg-orange-100 text-orange-800 border-orange-200";
      default:          return "bg-gray-100 text-gray-800 border-gray-200";
    }
  }

  function getQualityIcon(quality: string) {
    switch (quality) {
      case "excellent": return "⭐⭐⭐";
      case "good":      return "⭐⭐";
      case "fair":      return "⭐";
      default:          return "";
    }
  }

  // --- Core actions ---
  async function handleSelectDriver(driver: any) {
    // Optimistic: mark as pending (exists in table with denied=false)
    requestStatusByDriverId = {
      ...requestStatusByDriverId,
      [driver.user_id]: { denied: false }
    };
    selectedDriver = driver;

    // Let parent perform the actual send (which updates DB and ride status)
    await onSelectDriver(driver.user_id);

    // Refresh statuses from DB in case something changed server-side
    await fetchRequestStatuses();

    closeModal();
  }

  // When modal opens or ride changes, (1) fetch matches, (2) fetch request statuses
  $effect(() => {
    if (show && ride) {
      fetchMatchedDrivers().then(fetchRequestStatuses);
    }
  });

  async function fetchMatchedDrivers() {
    if (!token) {
      console.error("No authentication token available");
      return;
    }
    isMatching = true;
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_API_URL}/rides/${ride.ride_id}/match-drivers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!resp.ok) {
        const t = await resp.text();
        console.error("Failed to fetch matched drivers:", resp.status, t);
        alert("Failed to load drivers. Please try again.");
        return;
      }

      const data = await resp.json();
      matchedDrivers = data ?? { available: [], excluded: [] };
    } catch (e) {
      console.error("Error fetching matched drivers:", e);
      alert("Error loading drivers. Please check your connection and try again.");
    } finally {
      isMatching = false;
    }
  }

  // Fetch current ride_requests rows for this ride and map them by driver_id
  async function fetchRequestStatuses() {
    if (!token || !ride?.ride_id) return;

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_API_URL}/rides/${ride.ride_id}/requests`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!resp.ok) {
        // Non-fatal: just log
        const t = await resp.text();
        console.warn("Failed to load request statuses:", resp.status, t);
        return;
      }

      // Expecting: [{ driver_id: "uuid", denied: boolean }, ...]
      const rows: Array<{ driver_id: string; denied: boolean }> = await resp.json();

      const map: Record<string, { denied: boolean }> = {};
      for (const r of rows || []) {
        if (r?.driver_id) {
          map[r.driver_id] = { denied: !!r.denied };
        }
      }
      requestStatusByDriverId = map;
    } catch (e) {
      console.warn("Error fetching request statuses:", e);
    }
  }
</script>

{#if show}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div class="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-xl font-semibold">Select Driver for Ride</h2>
          <p class="text-sm text-gray-600">Drivers are ranked by best match for this ride</p>
        </div>
        <button onclick={closeModal} class="text-gray-400 hover:text-gray-600">
          <X class="w-5 h-5" />
        </button>
      </div>

      {#if ride}
        <div class="bg-blue-50 rounded-lg p-4 mb-6">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <span class="font-medium text-gray-700">Pickup:</span>
              <span class="ml-2 text-gray-900">{ride.pickup_from_home ? 'Client Home' : ride.alt_pickup_city}</span>
            </div>
            <div>
              <span class="font-medium text-gray-700">Dropoff:</span>
              <span class="ml-2 text-gray-900">{ride.dropoff_city}</span>
            </div>
            <div>
              <span class="font-medium text-gray-700">Passengers:</span>
              <span class="ml-2 text-gray-900">{ride.riders || 1}</span>
            </div>
            <div>
              <span class="font-medium text-gray-700">Time:</span>
              <span class="ml-2 text-gray-900">
                {new Date(ride.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>
      {/if}

      {#if isMatching}
        <div class="py-12 text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p class="mt-4 text-gray-600">Finding best matched drivers...</p>
        </div>
      {:else}
        <!-- Search -->
        <div class="mb-4">
          <input 
            type="text"
            bind:value={searchTerm}
            placeholder="Search drivers by name..."
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <!-- Available -->
        {#if filteredAvailable().length > 0}
          <div class="space-y-3 mb-6">
            <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Available Drivers ({filteredAvailable().length})
            </h3>

            {#each filteredAvailable() as driver}
              <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center gap-3 mb-2">
                      <h4 class="font-semibold text-gray-900">{driver.first_name} {driver.last_name}</h4>
                      <span class="px-2 py-1 text-xs font-medium rounded-full border {getQualityColor(driver.match_quality)}">
                        {getQualityIcon(driver.match_quality)} {driver.match_quality.toUpperCase()}
                      </span>
                      <span class="text-sm text-gray-600">Score: {driver.score}</span>
                    </div>

                    {#if driver.reasons?.length > 0}
                      <div class="space-y-1">
                        {#each driver.reasons as reason}
                          <div class="flex items-center gap-2 text-sm text-gray-600">
                            <div class="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                            <span>{reason}</span>
                          </div>
                        {/each}
                      </div>
                    {/if}
                  </div>

                  {#if requestStatusByDriverId[driver.user_id]}
                    {#if requestStatusByDriverId[driver.user_id].denied}
                      <!-- Denied state -->
                      <div class="ml-4 px-3 py-2 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700 flex items-center gap-2">
                        <XCircle class="w-4 h-4" />
                        Denied
                      </div>
                    {:else}
                      <!-- Pending state -->
                      <div class="ml-4 px-3 py-2 rounded-lg text-sm border border-amber-200 bg-amber-50 text-amber-700 flex items-center gap-2">
                        <Clock class="w-4 h-4" />
                        Pending
                      </div>
                    {/if}
                  {:else}
                    <!-- Default: Send Request -->
                    <button
                      onclick={() => handleSelectDriver(driver)}
                      disabled={isLoading}
                      class="ml-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      <UserCheck class="w-4 h-4" />
                      Send Request
                    </button>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {:else if searchTerm}
          <div class="text-center py-8 text-gray-500">
            <p>No drivers match your search</p>
          </div>
        {/if}

        <!-- Excluded -->
        {#if matchedDrivers.excluded.length > 0}
          <details class="border border-gray-200 rounded-lg">
            <summary class="px-4 py-3 cursor-pointer hover:bg-gray-50 flex items-center gap-2">
              <AlertCircle class="w-4 h-4 text-gray-400" />
              <span class="text-sm font-medium text-gray-700">
                Unavailable Drivers ({matchedDrivers.excluded.length})
              </span>
            </summary>
            <div class="px-4 py-3 space-y-2 border-t border-gray-200">
              {#each matchedDrivers.excluded as driver}
                <div class="flex items-center justify-between py-2">
                  <div>
                    <p class="font-medium text-gray-900">{driver.first_name} {driver.last_name}</p>
                    {#if driver.exclusion_reasons?.length > 0}
                      <div class="space-y-0.5 mt-1">
                        {#each driver.exclusion_reasons as reason}
                          <p class="text-xs text-red-600">• {reason}</p>
                        {/each}
                      </div>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          </details>
        {/if}
      {/if}

      <div class="flex justify-end mt-6">
        <button 
          onclick={closeModal}
          class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
{/if}