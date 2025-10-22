<script lang="ts">
  import RideMatchingForm from "$lib/components/RideMatchingForm.svelte";
  import type { RideMatchingData } from "$lib/components/RideMatchingForm.svelte";
  import { goto } from "$app/navigation";
  import { Button } from "$lib/components/ui/button";
  import { ArrowLeft } from "@lucide/svelte";

  let isSubmitting = $state(false);
  let submitError = $state<string | null>(null);
  let submitSuccess = $state(false);

  async function handleSubmit(data: RideMatchingData) {
    isSubmitting = true;
    submitError = null;
    submitSuccess = false;

    try {
      const response = await fetch('/dispatcher/rides/create-with-client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create ride');
      }

      console.log('Ride created:', result);
      submitSuccess = true;

      // Redirect to rides page after success
      setTimeout(() => {
        goto('/dispatcher/rides');
      }, 2000);

    } catch (error: any) {
      console.error('Error creating ride:', error);
      submitError = error.message || 'An error occurred while creating the ride';
    } finally {
      isSubmitting = false;
    }
  }

  function handleCancel() {
    goto('/dispatcher/rides');
  }
</script>

<svelte:head>
  <title>Create New Ride - DriveKind</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <!-- Header -->
  <div class="bg-white border-b">
    <div class="max-w-7xl mx-auto px-4 py-4">
      <div class="flex items-center gap-4">
        <Button variant="ghost" onclick={() => goto('/dispatcher/rides')}>
          <ArrowLeft class="w-4 h-4 mr-2" />
          Back to Rides
        </Button>
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Create New Ride</h1>
          <p class="text-sm text-gray-600">Fill in client information and ride details to create a new ride request</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Form Container -->
  <div class="max-w-7xl mx-auto px-4 py-8">
    {#if submitSuccess}
      <div class="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-green-900">Ride Created Successfully!</h3>
            <p class="text-green-700">Redirecting to rides page...</p>
          </div>
        </div>
      </div>
    {/if}

    {#if submitError}
      <div class="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-red-900">Error Creating Ride</h3>
            <p class="text-red-700">{submitError}</p>
          </div>
        </div>
      </div>
    {/if}

    {#if isSubmitting}
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <div>
            <h3 class="text-lg font-semibold text-blue-900">Creating Ride...</h3>
            <p class="text-blue-700">Please wait while we process your request</p>
          </div>
        </div>
      </div>
    {/if}

    <RideMatchingForm 
      onSubmit={handleSubmit}
      onCancel={handleCancel}
    />
  </div>
</div>
