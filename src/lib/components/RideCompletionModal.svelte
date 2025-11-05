<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import Textarea from "$lib/components/ui/textarea.svelte";
  import { X, AlertTriangle } from "@lucide/svelte";
  
  let { 
    show = $bindable(false),
    ride,
    isDriver = true,
    onSubmit,
    isSubmitting = false
  } = $props();

  // Initialize formData with ride data
  let formData = $state({
    miles_driven: '',
    hours: '',
    riders: '',
    donation: false,
    donation_amount: '',
    completion_status: '',
    notes: '',
    comments: '',
    start_time: '',
    end_time: ''
  });

  let validationErrors = $state<string[]>([]);

  // When ride changes or modal opens, populate form with ride data
  $effect(() => {
    if (ride && show) {
      console.log('Modal opening with ride data:', ride); // ← Add this
      console.log('completion_status:', ride.completion_status); // ← And this
      formData = {
        miles_driven: ride.miles_driven?.toString() || '',
        hours: ride.hours?.toString() || '',
        riders: ride.riders?.toString() || '',
        donation: ride.donation || false,
        donation_amount: ride.donation_amount?.toString() || '',
        completion_status: ride.completion_status || '', // ← This is the key line
        notes: ride.notes || '',
        comments: '',
        start_time: '',
        end_time: ''
      };
      validationErrors = [];
    }
  });

  function validate() {
    validationErrors = [];
    
    if (isDriver) {
      // Driver must provide completion status
      if (!formData.completion_status) {
        validationErrors.push('Completion status is required');
      }
    }
    
    // Optional: validate numeric fields
    if (formData.miles_driven && isNaN(Number(formData.miles_driven))) {
      validationErrors.push('Miles driven must be a number');
    }
    if (formData.hours && isNaN(Number(formData.hours))) {
      validationErrors.push('Hours must be a number');
    }
    
    return validationErrors.length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    
    onSubmit({
      miles_driven: formData.miles_driven ? parseFloat(formData.miles_driven) : null,
      hours: formData.hours ? parseFloat(formData.hours) : null,
      riders: formData.riders ? parseInt(formData.riders) : null,
      donation_received: formData.donation,
      donation_amount: formData.donation && formData.donation_amount ? parseFloat(formData.donation_amount) : null,
      completion_status: formData.completion_status || null,
      notes: formData.notes || null,
      comments: formData.comments || null,
      start_time: formData.start_time || null,
      end_time: formData.end_time || null
    });
  }

  function close() {
    show = false;
  }
</script>

{#if show}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold">
          {isDriver ? 'Report Completion' : 'Confirm Ride Completion'}
        </h2>
        <button onclick={close} class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <X class="w-5 h-5" />
        </button>
      </div>

      {#if validationErrors.length > 0}
        <div class="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <div class="flex items-start gap-2">
            <AlertTriangle class="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div class="text-sm text-red-800">
              <div class="font-medium mb-1">Please fix the following:</div>
              <ul class="list-disc ml-5">
                {#each validationErrors as error}
                  <li>{error}</li>
                {/each}
              </ul>
            </div>
          </div>
        </div>
      {/if}

      <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
        <!-- Completion Status - REQUIRED for driver -->
        <div>
          <label for="completion_status" class="block text-sm font-medium text-gray-700 mb-1">
            Completion Status {isDriver ? '*' : ''}
          </label>
          <select
            id="completion_status"
            bind:value={formData.completion_status}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required={isDriver}
          >
            <option value="">Select status...</option>
            <option value="Completed Round Trip">Completed Round Trip</option>
            <option value="Completed One Way To">Completed One Way To</option>
            <option value="Completed One Way From">Completed One Way From</option>
            <option value="Cancelled by Client">Cancelled by Client</option>
            <option value="Cancelled by Driver">Cancelled by Driver</option>
          </select>
          {#if isDriver}
            <p class="text-xs text-gray-500 mt-1">Required - select how the ride was completed</p>
          {/if}
        </div>

        <!-- Miles Driven -->
        <div>
          <label for="miles_driven" class="block text-sm font-medium text-gray-700 mb-1">
            Miles Driven
          </label>
          <Input
            id="miles_driven"
            type="number"
            step="0.1"
            bind:value={formData.miles_driven}
            placeholder="e.g., 12.5"
          />
        </div>

        <!-- Hours -->
        <div>
          <label for="hours" class="block text-sm font-medium text-gray-700 mb-1">
            Hours
          </label>
          <Input
            id="hours"
            type="number"
            step="0.1"
            bind:value={formData.hours}
            placeholder="e.g., 1.5"
          />
        </div>

        <!-- Riders -->
        <div>
          <label for="riders" class="block text-sm font-medium text-gray-700 mb-1">
            Number of Passengers
          </label>
          <Input
            id="riders"
            type="number"
            min="0"
            bind:value={formData.riders}
            placeholder="e.g., 1"
          />
        </div>

        <!-- Donation -->
        <div class="space-y-2">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              bind:checked={formData.donation}
              class="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <span class="text-sm font-medium text-gray-700">Donation Received</span>
          </label>

          {#if formData.donation}
            <div>
              <label for="donation_amount" class="block text-sm font-medium text-gray-700 mb-1">
                Donation Amount (USD)
              </label>
              <Input
                id="donation_amount"
                type="number"
                step="0.01"
                bind:value={formData.donation_amount}
                placeholder="0.00"
              />
            </div>
          {/if}
        </div>

        <!-- Notes (driver) / Comments (dispatcher) -->
        <div>
          <label for="notes" class="block text-sm font-medium text-gray-700 mb-1">
            {isDriver ? 'Notes' : 'Comments'}
          </label>
          <Textarea
            id="notes"
            bindvalue={isDriver ? formData.notes : formData.comments}
            placeholder={isDriver ? 'Any additional notes about the ride...' : 'Comments or adjustments...'}
            rows={3}
          />
        </div>

        <!-- Buttons -->
        <div class="flex items-center justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onclick={close} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : (isDriver ? 'Report Complete' : 'Confirm')}
          </Button>
        </div>
      </form>
    </div>
  </div>
{/if}