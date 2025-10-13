<!-- src/routes/schedule/+page.svelte -->
<script lang="ts">
  import { Calendar, TimeGrid, DayGrid, Interaction } from '@event-calendar/core';
  import RoleGuard from '$lib/components/RoleGuard.svelte';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import { Calendar as CalendarIcon, Car, Users, MapPin } from '@lucide/svelte';
  
  let { data } = $props();
  
  let activeView = $state<'unavailability' | 'rides' | 'all'>('all');
  
  // Transform unavailability events
  const unavailabilityEvents = data.unavailability
    .filter((item: any) => item.unavailable_date)
    .map((item: any) => {
      const driverName = `${item.staff_profiles.first_name} ${item.staff_profiles.last_name}`;
      
      if (item.all_day) {
        return {
          id: `unavail-${item.id}`,
          title: `🚫 ${driverName} - Unavailable`,
          start: item.unavailable_date,
          allDay: true,
          backgroundColor: '#ef4444',
          borderColor: '#dc2626',
          extendedProps: {
            type: 'unavailability',
            reason: item.reason,
            driverId: item.user_id
          }
        };
      }
      
      return {
        id: `unavail-${item.id}`,
        title: `🚫 ${driverName} - Unavailable`,
        start: `${item.unavailable_date}T${item.start_time}`,
        end: `${item.unavailable_date}T${item.end_time}`,
        backgroundColor: '#ef4444',
        borderColor: '#dc2626',
        extendedProps: {
          type: 'unavailability',
          reason: item.reason,
          driverId: item.user_id
        }
      };
    });
  
  // Transform ride events
  const rideEvents = data.rides.map((ride: any) => {
    const clientName = ride.clients 
      ? `${ride.clients.first_name} ${ride.clients.last_name}`
      : 'Unknown Client';
    const driverName = ride.driver
      ? `${ride.driver.first_name} ${ride.driver.last_name}`
      : 'Unassigned';
    
    // Determine color based on status
    let backgroundColor = '#3b82f6'; // blue for scheduled
    let borderColor = '#2563eb';
    
    if (ride.status === 'Requested') {
      backgroundColor = '#6b7280'; // gray
      borderColor = '#4b5563';
    } else if (ride.status === 'Assigned') {
      backgroundColor = '#f59e0b'; // amber
      borderColor = '#d97706';
    } else if (ride.status === 'In Progress') {
      backgroundColor = '#8b5cf6'; // purple
      borderColor = '#7c3aed';
    }
    
    return {
      id: `ride-${ride.ride_id}`,
      title: `🚗 ${clientName} → ${ride.destination_name}`,
      start: ride.appointment_time,
      backgroundColor,
      borderColor,
      extendedProps: {
        type: 'ride',
        rideId: ride.ride_id,
        clientName,
        driverName,
        destination: ride.destination_name,
        dropoffAddress: ride.dropoff_address,
        status: ride.status,
        roundTrip: ride.round_trip,
        purpose: ride.purpose
      }
    };
  });
  
  // Combine events based on active view
  let displayEvents = $derived.by(() => {
    if (activeView === 'unavailability') return unavailabilityEvents;
    if (activeView === 'rides') return rideEvents;
    return [...unavailabilityEvents, ...rideEvents];
  });
  
  // Calendar options using $state for Svelte 5
  let options = $state({
    view: 'timeGridWeek',
    headerToolbar: {
      start: 'prev,next today',
      center: 'title',
      end: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    height: '700px',
    events: displayEvents,
    eventClick: (info: any) => {
      const props = info.event.extendedProps;
      
      if (props.type === 'unavailability') {
        const reason = props.reason || 'No reason provided';
        alert(`Driver Unavailability\n\nReason: ${reason}`);
      } else if (props.type === 'ride') {
        const details = `
Ride Details

Client: ${props.clientName}
Driver: ${props.driverName}
Destination: ${props.destination}
Address: ${props.dropoffAddress}
Status: ${props.status}
Purpose: ${props.purpose}
Round Trip: ${props.roundTrip ? 'Yes' : 'No'}
        `.trim();
        alert(details);
      }
    },
    slotMinTime: '06:00:00',
    slotMaxTime: '22:00:00',
    allDaySlot: true,
    nowIndicator: true,
    selectable: true,
    select: (info: any) => {
      console.log('Selected:', info);
    }
  });
  
  // Update calendar events when view changes
  $effect(() => {
    options.events = displayEvents;
  });
  
  function getStatusBadgeColor(status: string) {
    const colors = {
      'Requested': 'bg-gray-100 text-gray-800',
      'Scheduled': 'bg-blue-100 text-blue-800',
      'Assigned': 'bg-amber-100 text-amber-800',
      'In Progress': 'bg-purple-100 text-purple-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  }
</script>

<svelte:head>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@event-calendar/core@3/index.min.css">
</svelte:head>

<RoleGuard requiredRoles={['Admin', 'Dispatcher']}>
  <div class="min-h-screen bg-gray-50">
    <Breadcrumbs />

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <CalendarIcon class="w-8 h-8 text-blue-600" />
          Schedule & Availability
        </h1>
        <p class="text-gray-600 mt-2">
          View driver availability and scheduled rides
        </p>
      </div>

      <!-- View Toggle Tabs -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div class="border-b border-gray-200">
          <nav class="flex -mb-px">
            <button
              onclick={() => activeView = 'all'}
              class="px-6 py-3 text-sm font-medium border-b-2 transition-colors {activeView === 'all' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
            >
              <div class="flex items-center gap-2">
                <CalendarIcon class="w-4 h-4" />
                All Events
              </div>
            </button>
            <button
              onclick={() => activeView = 'rides'}
              class="px-6 py-3 text-sm font-medium border-b-2 transition-colors {activeView === 'rides' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
            >
              <div class="flex items-center gap-2">
                <Car class="w-4 h-4" />
                Scheduled Rides ({data.rides.length})
              </div>
            </button>
            <button
              onclick={() => activeView = 'unavailability'}
              class="px-6 py-3 text-sm font-medium border-b-2 transition-colors {activeView === 'unavailability' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
            >
              <div class="flex items-center gap-2">
                <Users class="w-4 h-4" />
                Driver Unavailability ({data.unavailability.length})
              </div>
            </button>
          </nav>
        </div>
      </div>

      <!-- Calendar -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <Calendar plugins={[TimeGrid, DayGrid, Interaction]} {options} />
      </div>

      <!-- Legend -->
      <div class="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 class="text-sm font-semibold text-gray-900 mb-3">Legend</h3>
        
        {#if activeView === 'all' || activeView === 'rides'}
          <div class="mb-4">
            <h4 class="text-xs font-medium text-gray-700 mb-2">Rides</h4>
            <div class="flex flex-wrap gap-3">
              <div class="flex items-center gap-2">
                <div class="w-4 h-4 bg-gray-600 rounded"></div>
                <span class="text-sm text-gray-700">Requested</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-4 h-4 bg-blue-500 rounded"></div>
                <span class="text-sm text-gray-700">Scheduled</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-4 h-4 bg-amber-500 rounded"></div>
                <span class="text-sm text-gray-700">Assigned</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-4 h-4 bg-purple-500 rounded"></div>
                <span class="text-sm text-gray-700">In Progress</span>
              </div>
            </div>
          </div>
        {/if}
        
        {#if activeView === 'all' || activeView === 'unavailability'}
          <div>
            <h4 class="text-xs font-medium text-gray-700 mb-2">Availability</h4>
            <div class="flex flex-wrap gap-3">
              <div class="flex items-center gap-2">
                <div class="w-4 h-4 bg-red-500 rounded"></div>
                <span class="text-sm text-gray-700">Driver Unavailable</span>
              </div>
            </div>
          </div>
        {/if}
      </div>

      <!-- Stats Summary -->
      <div class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-blue-100 rounded-lg">
              <Car class="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p class="text-sm text-gray-600">Total Rides</p>
              <p class="text-2xl font-bold text-gray-900">{data.rides.length}</p>
            </div>
          </div>
        </div>
        
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-amber-100 rounded-lg">
              <Users class="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p class="text-sm text-gray-600">Unassigned Rides</p>
              <p class="text-2xl font-bold text-gray-900">
                {data.rides.filter((r: any) => r.status === 'Requested' || r.status === 'Scheduled').length}
              </p>
            </div>
          </div>
        </div>
        
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-red-100 rounded-lg">
              <CalendarIcon class="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p class="text-sm text-gray-600">Unavailabilities</p>
              <p class="text-2xl font-bold text-gray-900">{data.unavailability.length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</RoleGuard>

<style>
  :global(.ec) {
    --ec-border-color: #e5e7eb;
    --ec-button-bg-color: #3b82f6;
    --ec-button-border-color: #2563eb;
    --ec-button-text-color: #ffffff;
    --ec-button-hover-bg-color: #2563eb;
    --ec-today-bg-color: #eff6ff;
    --ec-bg-color: #ffffff;
    font-family: system-ui, -apple-system, sans-serif;
  }
  
  :global(.ec-toolbar) {
    margin-bottom: 1rem;
  }
  
  :global(.ec-button) {
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
  }
</style>