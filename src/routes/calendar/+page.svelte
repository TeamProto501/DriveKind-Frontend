<!-- src/routes/schedule/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { Calendar } from '@event-calendar/core';
  import TimeGrid from '@event-calendar/time-grid';
  import DayGrid from '@event-calendar/day-grid';
  import Interaction from '@event-calendar/interaction';
  import RoleGuard from '$lib/components/RoleGuard.svelte';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import { Calendar as CalendarIcon } from '@lucide/svelte';
  
  let { data } = $props();
  
  let calendarEl: HTMLElement;
  let ec: any;
  
  onMount(() => {
    const events = data.unavailability.map((item: any) => {
      const driverName = `${item.staff_profiles.first_name} ${item.staff_profiles.last_name}`;
      
      if (item.all_day) {
        return {
          id: item.id,
          title: `${driverName} - Unavailable`,
          start: item.unavailable_date,
          allDay: true,
          backgroundColor: '#ef4444',
          borderColor: '#dc2626',
          extendedProps: {
            reason: item.reason,
            driverId: item.user_id
          }
        };
      }
      
      const startDateTime = `${item.unavailable_date}T${item.start_time}`;
      const endDateTime = `${item.unavailable_date}T${item.end_time}`;
      
      return {
        id: item.id,
        title: `${driverName} - Unavailable`,
        start: startDateTime,
        end: endDateTime,
        backgroundColor: '#ef4444',
        borderColor: '#dc2626',
        extendedProps: {
          reason: item.reason,
          driverId: item.user_id
        }
      };
    });
    
    ec = new Calendar({
      target: calendarEl,
      props: {
        plugins: [TimeGrid, DayGrid, Interaction],
        options: {
          view: 'timeGridWeek',
          headerToolbar: {
            start: 'prev,next today',
            center: 'title',
            end: 'dayGridMonth,timeGridWeek,timeGridDay'
          },
          height: '700px',
          events: events,
          eventClick: (info: any) => {
            const reason = info.event.extendedProps.reason;
            alert(`Unavailability reason: ${reason || 'No reason provided'}`);
          },
          slotMinTime: '06:00:00',
          slotMaxTime: '22:00:00',
          allDaySlot: true,
          nowIndicator: true,
          selectable: true,
          select: (info: any) => {
            console.log('Selected:', info);
          }
        }
      }
    });
    
    return () => {
      if (ec) ec.$destroy();
    };
  });
</script>

<svelte:head>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@event-calendar/core/index.min.css">
</svelte:head>

<RoleGuard requiredRoles={['Admin', 'Dispatcher']}>
  <div class="min-h-screen bg-gray-50">
    <Breadcrumbs />

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <CalendarIcon class="w-8 h-8 text-blue-600" />
          Driver Schedule & Availability
        </h1>
        <p class="text-gray-600 mt-2">
          View driver unavailability and manage the schedule
        </p>
      </div>

      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div bind:this={calendarEl}></div>
      </div>

      <div class="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 class="text-sm font-semibold text-gray-900 mb-3">Legend</h3>
        <div class="flex flex-wrap gap-4">
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 bg-red-500 rounded"></div>
            <span class="text-sm text-gray-700">Driver Unavailable</span>
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
    --ec-today-bg-color: #eff6ff;
  }
</style>