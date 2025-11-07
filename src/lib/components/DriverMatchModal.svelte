<script lang="ts">
  import { X, UserCheck, AlertCircle } from "@lucide/svelte";

  let { 
    show = $bindable(false),
    ride,
    token,               // required: auth token
    isLoading = false    // external loading flag (optional)
  } = $props();

  // Matched drivers shape expected from /rides/:rideId/match-drivers
  type MatchDriver = {
    user_id: string;
    first_name: string;
    last_name: string;
    score: number;
    match_quality: 'excellent'|'good'|'fair'|'poor'|'excluded';
    reasons: string[];
    exclusion_reasons: string[];
  };

  let matchedDrivers = $state<{ available: MatchDriver[]; excluded: MatchDriver[] }>({ available: [], excluded: [] });
  let isMatching = $state(false);
  let searchTerm = $state("");
  let selectedDriver = $state<string | null>(null);

  // driver_id -> 'pending' | 'denied'
  let requestStatusMap = $state<Record<string, 'pending' | 'denied'>>({});

  // Derived: filter available by search
  let filteredAvailable = $derived(() => {
    if (!searchTerm) return matchedDrivers.available;
    const q = searchTerm.toLowerCase();
    return matchedDrivers.available.filter(d => `${d.first_name} ${d.last_name}`.toLowerCase().includes(q));
  });

  function closeModal() {
    show = false;
    searchTerm = "";
    selectedDriver = null;
  }

  function getQualityColor(quality: string) {
    switch (quality) {
      case 'excellent': return 'bg-green-100 text-green-800 border-green-200';
      case 'good': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'fair': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'poor': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  function getQualityIcon(quality: string) {
    switch (quality) {
      case 'excellent': return '⭐⭐⭐';
      case 'good': return '⭐⭐';
      case 'fair': return '⭐';
      default: return '';
    }
  }

  // Open -> load matches, then load request statuses so Pending/Denied persist
  $effect(() => {
    if (show && ride) {
      void fetchMatchedDrivers();
    }
  });

  async function fetchMatchedDrivers() {
    if (!token || !ride?.ride_id) return;

    isMatching = true;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/rides/${ride.ride_id}/match-drivers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const t = await res.text();
        console.error('match-drivers failed:', res.status, t);
        alert('Failed to load drivers.');
        return;
      }
      const data = await res.json();
      // API may return {success, available, excluded,...} or just the arrays – normalize:
      matchedDrivers = {
        available: data.available ?? data?.data?.available ?? [],
        excluded:  data.excluded  ?? data?.data?.excluded  ?? [],
      };

      // Now load previously sent requests so buttons show Pending/Denied on refresh
      await loadRequestStatuses();
    } catch (e) {
      console.error('Error fetching matched drivers:', e);
      alert('Error loading drivers. Please try again.');
    } finally {
      isMatching = false;
    }
  }

  async function loadRequestStatuses() {
    if (!token || !ride?.ride_id) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/rides/${ride.ride_id}/requests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        console.warn('requests fetch non-OK', res.status);
        requestStatusMap = {};
        return;
      }
      const payload = await res.json();
      // Backend returns { success: true, requests: [{driver_id, denied}] }
      const rows = Array.isArray(payload) ? payload : (payload.requests ?? []);
      const map: Record<string, 'pending' | 'denied'> = {};
      rows.forEach((r: any) => {
        map[String(r.driver_id)] = r.denied ? 'denied' : 'pending';
      });
      requestStatusMap = map;
    } catch (e) {
      console.error('loadRequestStatuses error:', e);
      requestStatusMap = {};
    }
  }

  async function sendRequestToDriver(driverId: string) {
    if (!token || !ride?.ride_id) return;

    selectedDriver = driverId;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/rides/${ride.ride_id}/send-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ driver_user_id: driverId })
      });

      if (!res.ok) {
        const t = await res.text();
        console.error('send-request failed:', res.status, t);
        alert('Failed to send request.');
        return;
      }

      // Optimistically set button to Pending and lock it
      requestStatusMap = { ...requestStatusMap, [String(driverId)]: 'pending' };

      // Optionally re-pull statuses (keeps UI consistent if others changed)
      // await loadRequestStatuses();
    } catch (e) {
      console.error('send-request error:', e);
      alert('Error sending request.');
    } finally {
      selectedDriver = null;
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

      <!-- Ride Summary -->
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

        <!-- Available Drivers -->
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

                  {#if requestStatusMap[String(driver.user_id)] === 'pending'}
                    <span class="ml-4 px-3 py-2 text-sm rounded-lg border bg-gray-100 text-gray-700">
                      Pending
                    </span>
                  {:else if requestStatusMap[String(driver.user_id)] === 'denied'}
                    <span class="ml-4 px-3 py-2 text-sm rounded-lg border bg-red-50 text-red-700">
                      Denied
                    </span>
                  {:else}
                    <button 
                      onclick={() => sendRequestToDriver(driver.user_id)}
                      disabled={isLoading || selectedDriver === driver.user_id}
                      class="ml-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      <UserCheck class="w-4 h-4" />
                      {selectedDriver === driver.user_id ? 'Sending...' : 'Send Request'}
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

        <!-- Excluded Drivers -->
        {#if matchedDrivers.excluded.length > 0}
          <details class="border border-gray-200 rounded-lg">
            <summary class="px-4 py-3 cursor-pointer hover:bg-gray-50 flex items-center gap-2">
              <AlertCircle class="w-4 h-4 text-gray-400" />
              <span class="text-sm font-medium text-gray-700">
                Unavailable Drivers ({matchedDrivers.excluded.length})
              </span>
            </summary>
            <div class="px-4 py-3 space-y-2 border-t border-gray-200">
              {#each matchedDrivers.excluded as d}
                <div class="py-2">
                  <p class="font-medium text-gray-900">{d.first_name} {d.last_name}</p>
                  {#if d.exclusion_reasons?.length > 0}
                    <div class="space-y-0.5 mt-1">
                      {#each d.exclusion_reasons as reason}
                        <p class="text-xs text-red-600">• {reason}</p>
                      {/each}
                    </div>
                  {/if}
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