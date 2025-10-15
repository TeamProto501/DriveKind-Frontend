<!-- src/lib/components/AddressAutocomplete.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { GeocoderAutocomplete } from '@geoapify/geocoder-autocomplete';
  import { env } from '$env/dynamic/public';
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

  let autocompleteInput: HTMLInputElement;
  let geocoderAutocomplete: GeocoderAutocomplete;
  let hasApiKey = $state(false);

  onMount(() => {
    const apiKey = env.PUBLIC_GEOAPIFY_API_KEY;
    if (!apiKey) {
      console.error('Geoapify API key is not set. Please set PUBLIC_GEOAPIFY_API_KEY in your environment variables.');
      onError('Geoapify API key is missing.');
      hasApiKey = false;
      return;
    }
    
    hasApiKey = true;

		const container = document.getElementById(`autocomplete-container-${id}`);
		if (!container) {
			console.error(`Container for Geoapify Autocomplete with ID 'autocomplete-container-${id}' not found.`);
			onError('Autocomplete container not found.');
			return;
		}

    geocoderAutocomplete = new GeocoderAutocomplete(
      container,
      apiKey,
      {
        placeholder: placeholder,
        skipIcons: true,
        addDetails: true,
        lang: 'en',
        limit: 5
      }
    );

		geocoderAutocomplete.on('select', (location) => {
			if (location) {
				const parsedAddress = parseGeoapifyAddress(location);
				onAddressSelect(parsedAddress);
			}
		});

		geocoderAutocomplete.on('suggestions', (suggestions) => {
			// console.log('Suggestions:', suggestions);
		});

		geocoderAutocomplete.on('input', (input) => {
			// console.log('Input:', input);
		});

		geocoderAutocomplete.on('error', (error) => {
			console.error('Geoapify Autocomplete Error:', error);
			onError(error.message || 'An unknown error occurred with Geoapify Autocomplete.');
		});

		// Set initial value if provided
		if (value) {
			geocoderAutocomplete.setValue(value);
		}
	});

	onDestroy(() => {
		if (geocoderAutocomplete) {
			geocoderAutocomplete.off('select');
			geocoderAutocomplete.off('suggestions');
			geocoderAutocomplete.off('input');
			geocoderAutocomplete.off('error');
		}
	});

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

  // Reactively update the autocomplete value if the prop changes externally
  $effect(() => {
    if (hasApiKey && geocoderAutocomplete && value !== geocoderAutocomplete.getValue()) {
      geocoderAutocomplete.setValue(value);
    }
  });
</script>

<div class="form-group">
  <label for={id} class="block text-sm font-medium text-gray-700">{label} {#if required}*{/if}</label>
  {#if hasApiKey}
    <div id="autocomplete-container-{id}" class="mt-1">
      <!-- Geoapify Autocomplete will render its input here -->
    </div>
  {:else}
    <input
      type="text"
      id={id}
      bind:value={value}
      placeholder={placeholder}
      required={required}
      oninput={handleManualInput}
      class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
    <p class="mt-1 text-sm text-gray-500">Address autocomplete is not available. Please enter the address manually.</p>
  {/if}
</div>

<style>
	/* You can import Geoapify's default styles or customize them here */
	@import "@geoapify/geocoder-autocomplete/styles/minimal.css";

	/* Custom styling for the input to match Tailwind forms */
	:global(.geoapify-autocomplete-input) {
		display: block;
		width: 100%;
		border: 1px solid #d1d5db; /* gray-300 */
		border-radius: 0.375rem; /* rounded-md */
		padding: 0.5rem 0.75rem; /* px-3 py-2 */
		font-size: 0.875rem; /* text-sm */
		line-height: 1.25rem; /* leading-5 */
		--tw-ring-offset-width: 0px;
		--tw-ring-color: transparent;
		transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
	}

	:global(.geoapify-autocomplete-input:focus) {
		outline: none;
		border-color: #3b82f6; /* blue-500 */
		--tw-ring-color: #3b82f6; /* blue-500 */
		box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);
		--tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);
		--tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(1px + var(--tw-ring-offset-width)) var(--tw-ring-color);
		box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000);
	}

	/* Adjust dropdown styling to fit better */
	:global(.geoapify-autocomplete-items) {
		border: 1px solid #e5e7eb; /* gray-200 */
		border-radius: 0.375rem; /* rounded-md */
		box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06); /* shadow-md */
		max-height: 200px;
		overflow-y: auto;
		z-index: 1000; /* Ensure it's above other content */
	}

	:global(.geoapify-autocomplete-item) {
		padding: 0.5rem 0.75rem;
		font-size: 0.875rem;
		color: #1f2937; /* gray-900 */
	}

	:global(.geoapify-autocomplete-item.active),
	:global(.geoapify-autocomplete-item:hover) {
		background-color: #f3f4f6; /* gray-100 */
		cursor: pointer;
	}

	:global(.geoapify-autocomplete-item .main-part) {
		font-weight: 500; /* medium */
	}

	:global(.geoapify-autocomplete-item .secondary-part) {
		color: #6b7280; /* gray-500 */
		font-size: 0.75rem; /* text-xs */
	}

	:global(.geoapify-close-button) {
		color: #9ca3af; /* gray-400 */
		font-size: 1.25rem; /* text-xl */
		line-height: 1;
		padding: 0.25rem;
		border-radius: 0.25rem;
		transition: color 0.15s ease-in-out;
	}

	:global(.geoapify-close-button:hover) {
		color: #4b5563; /* gray-600 */
	}
</style>
