<!-- src/lib/components/AddressAutocomplete.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { parseGeoapifyAddress, type ParsedAddress } from '$lib/utils/address';

	let { label, placeholder = '', value = '', id, required = false, onAddressSelect, onError } = $props<{
		label: string;
		placeholder?: string;
		value?: string;
		id: string;
		required?: boolean;
		onAddressSelect: (address: ParsedAddress) => void;
		onError: (error: string) => void;
	}>();

  let inputElement: HTMLInputElement;
  let suggestions: any[] = [];
  let showSuggestions = $state(false);
  let selectedIndex = $state(-1);
  let isLoading = $state(false);
  let debounceTimer: NodeJS.Timeout;

  // Use the working API key directly
  const apiKey = '5800960ffdc74ebe93558aca1f3ed51c';

  // Handle manual input when API key is not available
  function handleManualInput(event: Event) {
    const target = event.target as HTMLInputElement;
    const address: ParsedAddress = {
      street: target.value,
      city: '',
      state: '',
      zip: '',
      country: '',
      lat: 0,
      lon: 0
    };
    onAddressSelect(address);
  }

  // Search for addresses using Geoapify Geocoding API
  async function searchAddresses(query: string) {
    if (!query || query.length < 2) {
      suggestions = [];
      showSuggestions = false;
      return;
    }

    isLoading = true;
    try {
      const response = await fetch(
        `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(query)}&limit=5&format=json&apiKey=${apiKey}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      suggestions = data.results || [];
      showSuggestions = suggestions.length > 0;
      selectedIndex = -1;
    } catch (error) {
      console.error('Geoapify search error:', error);
      onError('Failed to search addresses. Please try again.');
      suggestions = [];
      showSuggestions = false;
    } finally {
      isLoading = false;
    }
  }

  // Handle input with debouncing
  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    const query = target.value;
    
    // Clear previous timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    
    // Set new timer for debounced search
    debounceTimer = setTimeout(() => {
      searchAddresses(query);
    }, 300);
    
    // Also call manual input handler for immediate feedback
    handleManualInput(event);
  }

  // Handle keyboard navigation
  function handleKeydown(event: KeyboardEvent) {
    if (!showSuggestions) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, -1);
        break;
      case 'Enter':
        event.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          selectAddress(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        showSuggestions = false;
        selectedIndex = -1;
        break;
    }
  }

  // Select an address from suggestions
  function selectAddress(address: any) {
    const parsedAddress = parseGeoapifyAddress(address);
    onAddressSelect(parsedAddress);
    showSuggestions = false;
    selectedIndex = -1;
    suggestions = [];
  }

  // Hide suggestions when clicking outside
  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.autocomplete-container')) {
      showSuggestions = false;
    }
  }

  onMount(() => {
    console.log('AddressAutocomplete component mounted');
    document.addEventListener('click', handleClickOutside);
  });

  onDestroy(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    document.removeEventListener('click', handleClickOutside);
  });
</script>

<div class="form-group autocomplete-container">
  <label for={id} class="block text-sm font-medium text-gray-700">{label} {#if required}*{/if}</label>
  <div class="relative">
    <input
      bind:this={inputElement}
      type="text"
      id={id}
      bind:value={value}
      placeholder={placeholder}
      required={required}
      oninput={handleInput}
      onkeydown={handleKeydown}
      class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
    
    {#if isLoading}
      <div class="absolute right-3 top-1/2 transform -translate-y-1/2">
        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
      </div>
    {/if}
    
    {#if showSuggestions && suggestions.length > 0}
      <div class="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
        {#each suggestions as suggestion, index}
          <div
            class="px-3 py-2 cursor-pointer hover:bg-gray-100 {selectedIndex === index ? 'bg-blue-50' : ''}"
            onclick={() => selectAddress(suggestion)}
          >
            <div class="font-medium text-gray-900">
              {suggestion.formatted || suggestion.address_line1}
            </div>
            {#if suggestion.address_line2}
              <div class="text-sm text-gray-500">
                {suggestion.address_line2}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  /* Custom styles for our autocomplete component */
  .autocomplete-container {
    position: relative;
  }
</style>
