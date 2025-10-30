<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import Label from "$lib/components/ui/label.svelte";
  import Textarea from "$lib/components/ui/textarea.svelte";
  import { X } from "@lucide/svelte";

  let { 
    show = $bindable(false),
    ride,
    isDriver = false,
    onSubmit,
    isSubmitting = false
  } = $props();

  let formData = $state({
    hours: '',
    miles_driven: '',
    donation_received: false,
    donation_amount: '',
    completion_status: '',
    comments: ''
  });

  function handleSubmit() {
    onSubmit(formData);
  }

  function closeModal() {
    show = false;
  }

  // Reset form when modal opens
  $effect(() => {
    if (show) {
      formData = {
        hours: ride?.hours?.toString() || '',
        miles_driven: ride?.miles_driven?.toString() || '',
        donation_received: ride?.donation || false,
        donation_amount: ride?.donation_amount?.toString() || '',
        completion_status: ride?.completion_status || '',
        comments: ''
      };
    }
  });

  function getClientName() {
    if (ride?.clients) {
      return `${ride.clients.first_name} ${ride.clients.last_name}`;
    }
    return 'Unknown Client';
  }

  function getDriverName() {
    if (ride?.drivers) {
      return `${ride.drivers.first_name} ${ride.drivers.last_name}`;
    }
    return 'Unknown Driver';
  }

  function formatDate(timestamp: string) {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
</script>

{#if show}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-xl font-semibold">
            {isDriver ? 'Report Ride Completion' : 'Confirm Ride Completion'}
          </h2>
          <p class="text-sm text-gray-600">
            {isDriver ? 'Enter ride details to report completion' : 'Review and confirm the ride completion details'}
          </p>
        </div>
        <button onclick={closeModal} class="text-gray-400 hover:text-gray-600">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Ride Summary -->
      <div class="bg-gray-50 rounded-lg p-4 mb-6 space-y-2 text-sm">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <span class="font-medium text-gray-700">Client:</span>
            <span class="ml-2 text-gray-900">{getClientName()}</span>
          </div>
          <div>
            <span class="font-medium text-gray-700">Driver:</span>
            <span class="ml-2 text-gray-900">{getDriverName()}</span>
          </div>
          <div>
            <span class="font-medium text-gray-700">Date:</span>
            <span class="ml-2 text-gray-900">{formatDate(ride?.appointment_time)}</span>
          </div>
          <div>
            <span class="font-medium text-gray-700">Passengers:</span>
            <span class="ml-2 text-gray-900">{ride?.riders || 1}</span>
          </div>
          <div class="col-span-2">
            <span class="font-medium text-gray-700">Destination:</span>
            <span class="ml-2 text-gray-900">{ride?.destination_name}</span>
          </div>
        </div>
      </div>

      <!-- Completion Form -->
      <div class="space-y-4">
        <!-- Completion Status -->
        <div>
          <Label for="completion_status">Completion Status *</Label>
          <select 
            id="completion_status"
            bind:value={formData.completion_status}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="">Select completion status</option>
            <option value="Completed Round Trip">Completed Round Trip</option>
            <option value="Completed One Way To">Completed One Way To</option>
            <option value="Completed One Way From">Completed One Way From</option>
            <option value="Cancelled by Client">Cancelled by Client</option>
            <option value="Cancelled by Driver">Cancelled by Driver</option>
          </select>
        </div>
        
        <!-- Hours and Miles -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <Label for="hours">Hours Worked *</Label>
            <input 
              id="hours"
              type="number"
              step="0.01"
              min="0"
              bind:value={formData.hours}
              placeholder="e.g., 2.50"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p class="text-xs text-gray-500 mt-1">Format: XX.XX (e.g., 2.50 for 2.5 hours)</p>
          </div>

          <div>
            <Label for="miles_driven">Miles Driven *</Label>
            <input 
              id="miles_driven"
              type="number"
              step="0.1"
              min="0"
              bind:value={formData.miles_driven}
              placeholder="e.g., 15.5"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p class="text-xs text-gray-500 mt-1">Format: XX.X (e.g., 15.5 miles)</p>
          </div>
        </div>

        <!-- Donation -->
        <div>
          <div class="flex items-center space-x-2 mb-2">
            <input 
              type="checkbox" 
              id="donation_received" 
              bind:checked={formData.donation_received}
              class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <Label for="donation_received" class="mb-0 cursor-pointer">Donation Received?</Label>
          </div>

          {#if formData.donation_received}
            <div class="ml-6">
              <Label for="donation_amount">Donation Amount (Optional)</Label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input 
                  id="donation_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  bind:value={formData.donation_amount}
                  placeholder="0.00"
                  class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          {/if}
        </div>

        <!-- Comments -->
        <div>
          <Label for="comments">Comments / Notes (Optional)</Label>
          <Textarea 
            id="comments"
            bind:value={formData.comments}
            placeholder="Add any additional notes or comments about this ride..."
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex justify-end gap-2 mt-6">
        <button 
          onclick={closeModal}
          class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button 
          onclick={handleSubmit}
          disabled={isSubmitting || !formData.hours || !formData.miles_driven || !formData.completion_status}
          class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Submitting...' : (isDriver ? 'Report Complete' : 'Confirm Completion')}
        </button>
      </div>
    </div>
  </div>
{/if}