<script lang="ts">
  import { X, UserCheck, AlertCircle, Star, TrendingUp, MapPin, Calendar } from "@lucide/svelte";

  let { 
    show = $bindable(false),
    ride,
    onSelectDriver,
    isLoading = false
  } = $props();

  let matchedDrivers = $state({ available: [], excluded: [] });
  let isMatching = $state(false);
  let searchTerm = $state("");
  let selectedDriver = $state(null);

  // Filtered drivers based on search
  let filteredAvailable = $derived(() => {
    if (!searchTerm) return matchedDrivers.available;
    return matchedDrivers.available.filter(driver => 
      `${driver.first_name} ${driver.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
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

  async function handleSelectDriver(driver: any) {
    selectedDriver = driver;
    await onSelectDriver(driver.user_id);
    closeModal();
  }

  // Fetch matched drivers when modal opens
  $effect(() => {
    if (show && ride) {
      fetchMatchedDrivers();
    }
  });

  async function fetchMatchedDrivers() {
    isMatching = true;
    try {
      const token = sessionStorage.getItem('session_token'); // You'll need to store this
      const response = await fetch(`${import.meta.env.VITE_API_URL}/rides/${ride.ride_id}/match-drivers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        matchedDrivers = data;
      } else {
        console.error('Failed to fetch matched drivers');
      }
    } catch (error) {
      console.error('Error fetching matched drivers:', error);
    } finally {
      isMatching = false;
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
              <span class="ml-2 text-gray-900">{new Date(ride.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
        <!-- Search Bar -->
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
            <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">Available Drivers ({filteredAvailable().length})</h3>
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

                    {#if driver.reasons.length > 0}
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

                  <button 
                    onclick={() => handleSelectDriver(driver)}
                    disabled={isLoading}
                    class="ml-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <UserCheck class="w-4 h-4" />
                    Send Request
                  </button>
                </div>
              </div>
            {/each}
          </div>
        {:else if searchTerm}
          <div class="text-center py-8 text-gray-500">
            <p>No drivers match your search</p>
          </div>
        {/if}

        <!-- Excluded Drivers (Collapsible) -->
        {#if matchedDrivers.excluded.length > 0}
          <details class="border border-gray-200 rounded-lg">
            <summary class="px-4 py-3 cursor-pointer hover:bg-gray-50 flex items-center gap-2">
              <AlertCircle class="w-4 h-4 text-gray-400" />
              <span class="text-sm font-medium text-gray-700">Unavailable Drivers ({matchedDrivers.excluded.length})</span>
            </summary>
            <div class="px-4 py-3 space-y-2 border-t border-gray-200">
              {#each matchedDrivers.excluded as driver}
                <div class="flex items-center justify-between py-2">
                  <div>
                    <p class="font-medium text-gray-900">{driver.first_name} {driver.last_name}</p>
                    {#if driver.exclusion_reasons.length > 0}
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