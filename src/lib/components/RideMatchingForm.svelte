<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import Label from "$lib/components/ui/label.svelte";
  import Textarea from "$lib/components/ui/textarea.svelte";
  import { User, MapPin, Calendar, Home, AlertCircle } from "@lucide/svelte";

  interface Props {
    onSubmit?: (data: RideMatchingData) => void;
    onCancel?: () => void;
    initialData?: Partial<RideMatchingData>;
  }

  let { onSubmit, onCancel, initialData }: Props = $props();

  // Form state
  let formData = $state({
    // Client Information
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    streetAddress: initialData?.streetAddress || '',
    address2: initialData?.address2 || '',
    zip: initialData?.zip || '',
    city: initialData?.city || '',
    state: initialData?.state || '',
    mobilityAssistance: initialData?.mobilityAssistance || '',
    otherLimitations: initialData?.otherLimitations || '',
    carHeightNeeded: initialData?.carHeightNeeded || false,
    serviceAnimal: initialData?.serviceAnimal || false,
    oxygen: initialData?.oxygen || false,
    allergies: initialData?.allergies || '',
    
    // Ride Details
    pickupAddress: initialData?.pickupAddress || '',
    pickupAddress2: initialData?.pickupAddress2 || '',
    pickupCity: initialData?.pickupCity || '',
    pickupState: initialData?.pickupState || '',
    pickupZip: initialData?.pickupZip || '',
    useClientAddress: initialData?.useClientAddress !== undefined ? initialData.useClientAddress : true,
    
    dropoffAddress: initialData?.dropoffAddress || '',
    dropoffAddress2: initialData?.dropoffAddress2 || '',
    dropoffCity: initialData?.dropoffCity || '',
    dropoffState: initialData?.dropoffState || '',
    dropoffZip: initialData?.dropoffZip || '',
    destinationName: initialData?.destinationName || '',
    
    rideDate: initialData?.rideDate || '',
    rideTime: initialData?.rideTime || '',
    roundTrip: initialData?.roundTrip || false,
    estimatedDuration: initialData?.estimatedDuration || '',
    numberOfRiders: initialData?.numberOfRiders || 1,
    purpose: initialData?.purpose || '',
    notes: initialData?.notes || ''
  });

  const US_STATES = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];

  const MOBILITY_OPTIONS = [
    { value: '', label: 'None' },
    { value: 'Wheelchair', label: 'Wheelchair' },
    { value: 'Walker', label: 'Walker' },
    { value: 'Cane', label: 'Cane' },
    { value: 'Crutches', label: 'Crutches' },
    { value: 'Other', label: 'Other' }
  ];

  const PURPOSE_OPTIONS = [
    { value: '', label: 'Select purpose' },
    { value: 'Medical', label: 'Medical Appointment' },
    { value: 'Shopping', label: 'Shopping' },
    { value: 'Social', label: 'Social/Recreation' },
    { value: 'Religious', label: 'Religious Service' },
    { value: 'Work', label: 'Work' },
    { value: 'Other', label: 'Other' }
  ];

  // Auto-populate pickup address from client address
  $effect(() => {
    if (formData.useClientAddress) {
      formData.pickupAddress = formData.streetAddress;
      formData.pickupAddress2 = formData.address2;
      formData.pickupCity = formData.city;
      formData.pickupState = formData.state;
      formData.pickupZip = formData.zip;
    }
  });

  // Validation
  let errors = $state<Record<string, string>>({});

  function validateForm(): boolean {
    errors = {};
    
    // Client Information Validation
    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
    if (!formData.streetAddress.trim()) errors.streetAddress = 'Street address is required';
    if (!formData.zip.trim()) errors.zip = 'ZIP code is required';
    if (!formData.city.trim()) errors.city = 'City is required';
    if (!formData.state.trim()) errors.state = 'State is required';
    
    // Ride Details Validation
    if (!formData.dropoffAddress.trim()) errors.dropoffAddress = 'Dropoff address is required';
    if (!formData.dropoffCity.trim()) errors.dropoffCity = 'Dropoff city is required';
    if (!formData.dropoffState.trim()) errors.dropoffState = 'Dropoff state is required';
    if (!formData.dropoffZip.trim()) errors.dropoffZip = 'Dropoff ZIP is required';
    if (!formData.rideDate) errors.rideDate = 'Ride date is required';
    if (!formData.rideTime) errors.rideTime = 'Ride time is required';
    if (!formData.purpose.trim()) errors.purpose = 'Purpose is required';
    
    return Object.keys(errors).length === 0;
  }

  function handleSubmit(e: Event) {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit?.(formData);
    }
  }

  function handleCancel() {
    onCancel?.();
  }

  export interface RideMatchingData {
    // Client Information
    firstName: string;
    lastName: string;
    streetAddress: string;
    address2: string;
    zip: string;
    city: string;
    state: string;
    mobilityAssistance: string;
    otherLimitations: string;
    carHeightNeeded: boolean;
    serviceAnimal: boolean;
    oxygen: boolean;
    allergies: string;
    
    // Ride Details
    pickupAddress: string;
    pickupAddress2: string;
    pickupCity: string;
    pickupState: string;
    pickupZip: string;
    useClientAddress: boolean;
    dropoffAddress: string;
    dropoffAddress2: string;
    dropoffCity: string;
    dropoffState: string;
    dropoffZip: string;
    destinationName: string;
    rideDate: string;
    rideTime: string;
    roundTrip: boolean;
    estimatedDuration: string;
    numberOfRiders: number;
    purpose: string;
    notes: string;
  }
</script>

<div class="w-full max-w-3xl mx-auto">
  <form onsubmit={handleSubmit} class="flex flex-col gap-6 bg-gray-50 shadow-md rounded-lg py-6">
    
    <!-- Client Information Section -->
    <div class="px-6 space-y-4">
      <h2 class="text-lg font-semibold text-blue-700 flex items-center gap-2 mb-2">
        <User class="w-5 h-5" />
        Client Information
      </h2>

      <!-- Name Fields -->
      <div class="flex flex-col md:flex-row gap-4">
        <label class="block text-gray-700 font-semibold md:w-1/2">
          First Name:
          <Input 
            type="text"
            bind:value={formData.firstName}
            placeholder="Enter first name"
            class={`mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus-visible:border-blue-500/70 focus-visible:ring-blue-500/65 focus-visible:ring-[1.5px] ${errors.firstName ? 'border-red-500' : ''}`}
          />
          {#if errors.firstName}
            <span class="text-sm text-red-500">{errors.firstName}</span>
          {/if}
        </label>

        <label class="block text-gray-700 font-semibold md:w-1/2">
          Last Name:
          <Input 
            type="text"
            bind:value={formData.lastName}
            placeholder="Enter last name"
            class={`mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus-visible:border-blue-500/70 focus-visible:ring-blue-500/65 focus-visible:ring-[1.5px] ${errors.lastName ? 'border-red-500' : ''}`}
          />
          {#if errors.lastName}
            <span class="text-sm text-red-500">{errors.lastName}</span>
          {/if}
        </label>
      </div>

      <!-- Address Fields -->
      <label class="block text-gray-700 font-semibold">
        Street Address:
        <Input 
          type="text"
          bind:value={formData.streetAddress}
          placeholder="Enter street address"
          class={`mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus-visible:border-blue-500/70 focus-visible:ring-blue-500/65 focus-visible:ring-[1.5px] ${errors.streetAddress ? 'border-red-500' : ''}`}
        />
        {#if errors.streetAddress}
          <span class="text-sm text-red-500">{errors.streetAddress}</span>
        {/if}
      </label>

      <label class="block text-gray-700 font-semibold">
        Address 2:
        <Input 
          type="text"
          bind:value={formData.address2}
          placeholder="Apartment, suite, etc. (optional)"
          class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus-visible:border-blue-500/70 focus-visible:ring-blue-500/65 focus-visible:ring-[1.5px]"
        />
      </label>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <label class="block text-gray-700 font-semibold">
          City:
          <Input 
            type="text"
            bind:value={formData.city}
            placeholder="City"
            class={`mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus-visible:border-blue-500/70 focus-visible:ring-blue-500/65 focus-visible:ring-[1.5px] ${errors.city ? 'border-red-500' : ''}`}
          />
          {#if errors.city}
            <span class="text-sm text-red-500">{errors.city}</span>
          {/if}
        </label>

        <label class="block text-gray-700 font-semibold">
          State:
          <select 
            bind:value={formData.state}
            class={`mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus-visible:border-blue-500/70 focus-visible:ring-blue-500/65 focus-visible:ring-[1.5px] ${errors.state ? 'border-red-500' : ''}`}
          >
            <option value="">Select state</option>
            {#each US_STATES as state}
              <option value={state}>{state}</option>
            {/each}
          </select>
          {#if errors.state}
            <span class="text-sm text-red-500">{errors.state}</span>
          {/if}
        </label>

        <label class="block text-gray-700 font-semibold">
          ZIP Code:
          <Input 
            type="text"
            bind:value={formData.zip}
            placeholder="ZIP"
            maxlength="10"
            class={`mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus-visible:border-blue-500/70 focus-visible:ring-blue-500/65 focus-visible:ring-[1.5px] ${errors.zip ? 'border-red-500' : ''}`}
          />
          {#if errors.zip}
            <span class="text-sm text-red-500">{errors.zip}</span>
          {/if}
        </label>
      </div>
    </div>

    <!-- Special Requirements Section -->
    <div class="px-6 space-y-4 border-t pt-6">
      <h2 class="text-lg font-semibold text-blue-700 flex items-center gap-2 mb-2">
        <AlertCircle class="w-5 h-5" />
        Special Requirements
      </h2>

      <label class="block text-gray-700 font-semibold">
        Mobility Assistance:
        <select 
          bind:value={formData.mobilityAssistance}
          class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus-visible:border-blue-500/70 focus-visible:ring-blue-500/65 focus-visible:ring-[1.5px]"
        >
          {#each MOBILITY_OPTIONS as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </label>

      <label class="block text-gray-700 font-semibold">
        Other Limitations:
        <Textarea 
          bind:value={formData.otherLimitations}
          placeholder="Describe any other physical or medical limitations"
          rows={3}
          class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus-visible:border-blue-500/70 focus-visible:ring-blue-500/65 focus-visible:ring-[1.5px]"
        />
      </label>

      <div class="flex flex-wrap gap-6">
        <label class="inline-flex items-center space-x-2">
          <input 
            type="checkbox" 
            bind:checked={formData.carHeightNeeded}
            class="form-checkbox h-5 w-5 text-blue-600"
          />
          <span class="text-gray-700">Car Height Needed (Wheelchair Vehicle)</span>
        </label>

        <label class="inline-flex items-center space-x-2">
          <input 
            type="checkbox" 
            bind:checked={formData.serviceAnimal}
            class="form-checkbox h-5 w-5 text-blue-600"
          />
          <span class="text-gray-700">Service Animal</span>
        </label>

        <label class="inline-flex items-center space-x-2">
          <input 
            type="checkbox" 
            bind:checked={formData.oxygen}
            class="form-checkbox h-5 w-5 text-blue-600"
          />
          <span class="text-gray-700">Oxygen Required</span>
        </label>
      </div>

      <label class="block text-gray-700 font-semibold">
        Allergies:
        <Textarea 
          bind:value={formData.allergies}
          placeholder="List any allergies (e.g., pets, fragrances, latex)"
          rows={2}
          class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus-visible:border-blue-500/70 focus-visible:ring-blue-500/65 focus-visible:ring-[1.5px]"
        />
      </label>
    </div>

    <!-- Ride Details Section -->
    <div class="px-6 space-y-4 border-t pt-6">
      <h2 class="text-lg font-semibold text-blue-700 flex items-center gap-2 mb-2">
        <MapPin class="w-5 h-5" />
        Ride Details
      </h2>

      <!-- Pickup Location -->
      <label class="inline-flex items-center space-x-2">
        <input 
          type="checkbox" 
          bind:checked={formData.useClientAddress}
          class="form-checkbox h-5 w-5 text-blue-600"
        />
        <span class="text-gray-700 font-semibold flex items-center gap-2">
          <Home class="w-4 h-4" />
          Use client's home address as pickup location
        </span>
      </label>

      {#if !formData.useClientAddress}
        <div class="pl-6 border-l-2 border-gray-200 space-y-4">
          <label class="block text-gray-700 font-semibold">
            Pickup Street Address:
            <Input 
              type="text"
              bind:value={formData.pickupAddress}
              placeholder="Enter pickup address"
              class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus-visible:border-blue-500/70 focus-visible:ring-blue-500/65 focus-visible:ring-[1.5px]"
            />
          </label>

          <label class="block text-gray-700 font-semibold">
            Pickup Address 2:
            <Input 
              type="text"
              bind:value={formData.pickupAddress2}
              placeholder="Apartment, suite, etc."
              class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus-visible:border-blue-500/70 focus-visible:ring-blue-500/65 focus-visible:ring-[1.5px]"
            />
          </label>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label class="block text-gray-700 font-semibold">
              City:
              <Input 
                type="text"
                bind:value={formData.pickupCity}
                placeholder="City"
                class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus-visible:border-blue-500/70 focus-visible:ring-blue-500/65 focus-visible:ring-[1.5px]"
              />
            </label>

            <label class="block text-gray-700 font-semibold">
              State:
              <select 
                bind:value={formData.pickupState}
                class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus-visible:border-blue-500/70 focus-visible:ring-blue-500/65 focus-visible:ring-[1.5px]"
              >
                <option value="">Select state</option>
                {#each US_STATES as state}
                  <option value={state}>{state}</option>
                {/each}
              </select>
            </label>

            <label class="block text-gray-700 font-semibold">
              ZIP Code:
              <Input 
                type="text"
                bind:value={formData.pickupZip}
                placeholder="ZIP"
                maxlength="10"
                class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus-visible:border-blue-500/70 focus-visible:ring-blue-500/65 focus-visible:ring-[1.5px]"
              />
            </label>
          </div>
        </div>
      {/if}

      <!-- Dropoff Location -->
      <div class="pt-4 space-y-4">
        <h3 class="font-semibold text-gray-700">Dropoff Location</h3>
        
        <label class="block text-gray-700 font-semibold">
          Destination Name:
          <Input 
            type="text"
            bind:value={formData.destinationName}
            placeholder="e.g., Hospital, Clinic, Store"
            class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus-visible:border-blue-500/70 focus-visible:ring-blue-500/65 focus-visible:ring-[1.5px]"
          />
        </label>

        <label class="block text-gray-700 font-semibold">
          Dropoff Street Address:
          <Input 
            type="text"
            bind:value={formData.dropoffAddress}
            placeholder="Enter dropoff address"
            class={`mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus-visible:border-blue-500/70 focus-visible:ring-blue-500/65 focus-visible:ring-[1.5px] ${errors.dropoffAddress ? 'border-red-500' : ''}`}
          />
          {#if errors.dropoffAddress}
            <span class="text-sm text-red-500">{errors.dropoffAddress}</span>
          {/if}
        </label>

        <label class="block text-gray-700 font-semibold">
          Dropoff Address 2:
          <Input 
            type="text"
            bind:value={formData.dropoffAddress2}
            placeholder="Suite, floor, etc."
            class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus-visible:border-blue-500/70 focus-visible:ring-blue-500/65 focus-visible:ring-[1.5px]"
          />
        </label>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label class="block text-gray-700 font-semibold">
            City:
            <Input 
              type="text"
              bind:value={formData.dropoffCity}
              placeholder="City"
              class={`mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus-visible:border-blue-500/70 focus-visible:ring-blue-500/65 focus-visible:ring-[1.5px] ${errors.dropoffCity ? 'border-red-500' : ''}`}
            />
            {#if errors.dropoffCity}
              <span class="text-sm text-red-500">{errors.dropoffCity}</span>
            {/if}
          </label>

          <label class="block text-gray-700 font-semibold">
            State:
            <select 
              bind:value={formData.dropoffState}
              class={`mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus-visible:border-blue-500/70 focus-visible:ring-blue-500/65 focus-visible:ring-[1.5px] ${errors.dropoffState ? 'border-red-500' : ''}`}
            >
              <option value="">Select state</option>
              {#each US_STATES as state}
                <option value={state}>{state}</option>
              {/each}
            </select>
            {#if errors.dropoffState}
              <span class="text-sm text-red-500">{errors.dropoffState}</span>
            {/if}
          </label>

          <label class="block text-gray-700 font-semibold">
            ZIP Code:
            <Input 
              type="text"
              bind:value={formData.dropoffZip}
              placeholder="ZIP"
              maxlength="10"
              class={`mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus-visible:border-blue-500/70 focus-visible:ring-blue-500/65 focus-visible:ring-[1.5px] ${errors.dropoffZip ? 'border-red-500' : ''}`}
            />
            {#if errors.dropoffZip}
              <span class="text-sm text-red-500">{errors.dropoffZip}</span>
            {/if}
          </label>
        </div>
      </div>
    </div>

    <!-- Schedule & Additional Details -->
    <div class="px-6 space-y-4 border-t pt-6">
      <h2 class="text-lg font-semibold text-blue-700 flex items-center gap-2 mb-2">
        <Calendar class="w-5 h-5" />
        Schedule & Additional Details
      </h2>

      <div class="flex flex-col md:flex-row gap-4">
        <label class="block text-gray-700 font-semibold md:w-1/2">
          Ride Date:
          <Input 
            type="date"
            bind:value={formData.rideDate}
            class={`mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus-visible:border-blue-500/70 focus-visible:ring-blue-500/65 focus-visible:ring-[1.5px] ${errors.rideDate ? 'border-red-500' : ''}`}
          />
          {#if errors.rideDate}
            <span class="text-sm text-red-500">{errors.rideDate}</span>
          {/if}
        </label>

        <label class="block text-gray-700 font-semibold md:w-1/2">
          Ride Time:
          <Input 
            type="time"
            bind:value={formData.rideTime}
            class={`mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus-visible:border-blue-500/70 focus-visible:ring-blue-500/65 focus-visible:ring-[1.5px] ${errors.rideTime ? 'border-red-500' : ''}`}
          />
          {#if errors.rideTime}
            <span class="text-sm text-red-500">{errors.rideTime}</span>
          {/if}
        </label>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <label class="block text-gray-700 font-semibold">
          Number of Riders:
          <Input 
            type="number"
            min="1"
            bind:value={formData.numberOfRiders}
            class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus-visible:border-blue-500/70 focus-visible:ring-blue-500/65 focus-visible:ring-[1.5px]"
          />
        </label>

        <label class="block text-gray-700 font-semibold">
          Estimated Duration (minutes):
          <Input 
            type="text"
            bind:value={formData.estimatedDuration}
            placeholder="e.g., 30"
            class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus-visible:border-blue-500/70 focus-visible:ring-blue-500/65 focus-visible:ring-[1.5px]"
          />
        </label>

        <label class="inline-flex items-center space-x-2 mt-7">
          <input 
            type="checkbox" 
            bind:checked={formData.roundTrip}
            class="form-checkbox h-5 w-5 text-blue-600"
          />
          <span class="text-gray-700 font-semibold">Round Trip</span>
        </label>
      </div>

      <label class="block text-gray-700 font-semibold">
        Purpose:
        <select 
          bind:value={formData.purpose}
          class={`mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus-visible:border-blue-500/70 focus-visible:ring-blue-500/65 focus-visible:ring-[1.5px] ${errors.purpose ? 'border-red-500' : ''}`}
        >
          {#each PURPOSE_OPTIONS as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
        {#if errors.purpose}
          <span class="text-sm text-red-500">{errors.purpose}</span>
        {/if}
      </label>

      <label class="block text-gray-700 font-semibold">
        Additional Notes:
        <Textarea 
          bind:value={formData.notes}
          placeholder="Any additional information for the driver or dispatcher"
          rows={4}
          class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus-visible:border-blue-500/70 focus-visible:ring-blue-500/65 focus-visible:ring-[1.5px]"
        />
      </label>
    </div>

    <!-- Form Actions -->
    <div class="px-6 flex flex-col sm:flex-row gap-3">
      {#if onCancel}
        <Button 
          type="button" 
          variant="outline" 
          onclick={handleCancel}
          class="flex-1"
        >
          Cancel
        </Button>
      {/if}
      <Button 
        type="submit"
        class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-sm shadow-sm hover:shadow-md transition-all duration-200"
      >
        Create Ride & Find Drivers
      </Button>
    </div>
  </form>
</div>
