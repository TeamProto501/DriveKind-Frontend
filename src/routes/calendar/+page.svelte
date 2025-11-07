<script lang="ts">
  import { Calendar, TimeGrid, DayGrid, Interaction } from '@event-calendar/core';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import RoleGuard from '$lib/components/RoleGuard.svelte';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import { Calendar as CalendarIcon, Car, Users, MapPin, Building2, X, Clock, Phone, Edit } from '@lucide/svelte';
  
  let { data } = $props();
  
  type ViewType = 'myUnavailability' | 'allUnavailability' | 'myRides' | 'allRides' | 'all';
  
  const urlTab = $page.url.searchParams.get('tab');
  const initialView = urlTab === 'myRides' ? 'myRides' : (data.isAdminOrDispatcher ? 'all' : 'myRides');
  
  let activeView = $state<ViewType>(initialView);
  let currentCalendarView = $state('timeGridWeek');
  let showSidePanel = $state(false);
  let selectedDayRides = $state<any[]>([]);
  let selectedDate = $state<string>('');
  
  let sortedSelectedDayRides = $derived(
    [...selectedDayRides].sort((a, b) => 
      new Date(a.appointment_time).getTime() - new Date(b.appointment_time).getTime()
    )
  );
  
  function minutesFromEstimated(len?: string | null): number {
    if (!len) return 0;
    const s = String(len).toLowerCase();

    // hours
    const hMatch = s.match(/(\d+)\s*(?:h|hr|hrs|hour|hours)/);
    // minutes
    const mMatch = s.match(/(\d+)\s*(?:m|min|mins|minute|minutes)/);

    const h = hMatch ? parseInt(hMatch[1], 10) : 0;
    const m = mMatch ? parseInt(mMatch[1], 10) : 0;

    return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
  }

  function addMinutesISO(startISO: string, mins: number): string | undefined {
    if (!startISO || !Number.isFinite(mins)) return undefined;
    const d = new Date(startISO);
    if (Number.isNaN(d.getTime())) return undefined;
    d.setMinutes(d.getMinutes() + mins);
    return d.toISOString();
  }

  function groupRidesByDate(rides: any[]) {
    const grouped = new Map<string, any[]>();
    rides.forEach(ride => {
      const date = new Date(ride.appointment_time).toISOString().split('T')[0];
      if (!grouped.has(date)) {
        grouped.set(date, []);
      }
      grouped.get(date)!.push(ride);
    });
    return grouped;
  }

  function groupRidesByTimeSlot(rides: any[]) {
    const grouped = new Map<string, any[]>();
    rides.forEach(ride => {
      const datetime = new Date(ride.appointment_time);
      const timeKey = datetime.toISOString();
      if (!grouped.has(timeKey)) {
        grouped.set(timeKey, []);
      }
      grouped.get(timeKey)!.push(ride);
    });
    return grouped;
  }
  
  // Transform unavailability events
  function groupUnavailabilityByDate(unavailData: any[]) {
    const grouped = new Map<string, any[]>();
    unavailData
      .filter((item: any) => item.unavailable_date)
      .forEach(item => {
        const date = item.unavailable_date;
        if (!grouped.has(date)) {
          grouped.set(date, []);
        }
        grouped.get(date)!.push(item);
      });
    return grouped;
  }

  function transformUnavailabilityEvents(unavailData: any[], isDayView = false) {
    if (isDayView) {
      // Day view: show individual unavailability at actual times
      return unavailData
        .filter((item: any) => item.unavailable_date)
        .map((item: any) => {
          const driverName = `${item.staff_profiles?.first_name || ''} ${item.staff_profiles?.last_name || ''}`.trim();
          
          if (item.all_day) {
            return {
              id: `unavail-${item.id}`,
              title: `🚫 ${driverName}`,
              start: item.unavailable_date,
              allDay: true,
              backgroundColor: '#ef4444',
              borderColor: '#dc2626',
              extendedProps: {
                type: 'unavailability',
                reason: item.reason,
                driverId: item.user_id,
                unavailData: item
              }
            };
          }
          
          return {
            id: `unavail-${item.id}`,
            title: `🚫 ${driverName}`,
            start: `${item.unavailable_date}T${item.start_time}`,
            end: `${item.unavailable_date}T${item.end_time}`,
            backgroundColor: '#ef4444',
            borderColor: '#dc2626',
            extendedProps: {
              type: 'unavailability',
              reason: item.reason,
              driverId: item.user_id,
              unavailData: item
            }
          };
        });
    } else {
      // Month/Week view: create daily summaries
      const groupedByDate = groupUnavailabilityByDate(unavailData);
      const summaryEvents: any[] = [];
      
      groupedByDate.forEach((dayUnavail, dateStr) => {
        if (dayUnavail.length === 1) {
          const item = dayUnavail[0];
          const driverName = `${item.staff_profiles?.first_name || ''} ${item.staff_profiles?.last_name || ''}`.trim();
          
          if (item.all_day) {
            summaryEvents.push({
              id: `unavail-${item.id}`,
              title: `🚫 ${driverName}`,
              start: item.unavailable_date,
              allDay: true,
              backgroundColor: '#ef4444',
              borderColor: '#dc2626',
              extendedProps: {
                type: 'unavailability',
                reason: item.reason,
                unavailData: item
              }
            });
          } else {
            summaryEvents.push({
              id: `unavail-${item.id}`,
              title: `🚫 ${driverName}`,
              start: `${item.unavailable_date}T${item.start_time}`,
              end: `${item.unavailable_date}T${item.end_time}`,
              backgroundColor: '#ef4444',
              borderColor: '#dc2626',
              extendedProps: {
                type: 'unavailability',
                reason: item.reason,
                unavailData: item
              }
            });
          }
        } else {
          // Multiple unavailability on same day - create summary
          summaryEvents.push({
            id: `unavail-summary-${dateStr}`,
            title: `🚫 ${dayUnavail.length} Unavailable`,
            start: dateStr,
            allDay: true,
            backgroundColor: '#ef4444',
            borderColor: '#dc2626',
            extendedProps: {
              type: 'unavailability-group',
              date: dateStr,
              unavailabilities: dayUnavail,
              count: dayUnavail.length
            }
          });
        }
      });
      
      return summaryEvents;
    }
  }

  // Update the calls to include isDayView parameter
  let myUnavailabilityEvents = $derived(transformUnavailabilityEvents(data.myUnavailability, currentCalendarView === 'timeGridDay'));
  let allUnavailabilityEvents = $derived(transformUnavailabilityEvents(data.allUnavailability, currentCalendarView === 'timeGridDay'));
  
  function transformRidesToEvents(rides: any[], isDayView = false) {
    if (isDayView) {
      // For day view, show rides at their actual time
      const groupedByTime = groupRidesByTimeSlot(rides);
      const events: any[] = [];
      
      groupedByTime.forEach((timeRides, timeKey) => {
        const firstRide = timeRides[0];
        const clientName = firstRide.clients 
          ? `${firstRide.clients.first_name} ${firstRide.clients.last_name}`
          : 'Unknown Client';
        
        let backgroundColor = '#3b82f6';
        let borderColor = '#2563eb';
        
        if (firstRide.status === 'Requested') {
          backgroundColor = '#6b7280';
          borderColor = '#4b5563';
        } else if (firstRide.status === 'Assigned') {
          backgroundColor = '#f59e0b';
          borderColor = '#d97706';
        } else if (firstRide.status === 'In Progress') {
          backgroundColor = '#8b5cf6';
          borderColor = '#7c3aed';
        }
        
        if (timeRides.length === 1) {
          const mins = minutesFromEstimated(firstRide.estimated_appointment_length);
          events.push({
            id: `ride-${firstRide.ride_id}`,
            title: `🚗 ${clientName} → ${firstRide.destination_name}`,
            start: firstRide.appointment_time,
            end: mins ? addMinutesISO(firstRide.appointment_time, mins) : undefined,
            backgroundColor,
            borderColor,
            extendedProps: {
              type: 'ride',
              rideData: firstRide
            }
          });
        } else {
          events.push({
            id: `ride-group-${timeKey}`,
            title: `🚗 ${timeRides.length} Rides`,
            start: firstRide.appointment_time,
            backgroundColor,
            borderColor,
            extendedProps: {
              type: 'ride-group',
              rides: timeRides,
              count: timeRides.length
            }
          });
        }
      });
      
      return events;
    } else {
      // For month/week view, continue using daily summaries
      return rides.map((ride: any) => {
        const clientName = ride.clients 
          ? `${ride.clients.first_name} ${ride.clients.last_name}`
          : 'Unknown Client';
        
        let backgroundColor = '#3b82f6';
        let borderColor = '#2563eb';
        
        if (ride.status === 'Requested') {
          backgroundColor = '#6b7280';
          borderColor = '#4b5563';
        } else if (ride.status === 'Assigned') {
          backgroundColor = '#f59e0b';
          borderColor = '#d97706';
        } else if (ride.status === 'In Progress') {
          backgroundColor = '#8b5cf6';
          borderColor = '#7c3aed';
        }
        
        const mins = minutesFromEstimated(ride.estimated_appointment_length);
        return {
          id: `ride-${ride.ride_id}`,
          title: `🚗 ${clientName} → ${ride.destination_name}`,
          start: ride.appointment_time,
          end: mins ? addMinutesISO(ride.appointment_time, mins) : undefined,
          backgroundColor,
          borderColor,
          extendedProps: {
            type: 'ride',
            rideData: ride
          }
        };
      });
    }
  }
  
  function createDailySummaryEvents(rides: any[]) {
    const groupedByDate = groupRidesByDate(rides);
    const summaryEvents: any[] = [];
    
    groupedByDate.forEach((dayRides, dateStr) => {
      summaryEvents.push({
        id: `summary-${dateStr}`,
        title: `📅 ${dayRides.length} Ride${dayRides.length > 1 ? 's' : ''}`,
        start: dateStr,
        end: dateStr,
        allDay: true,
        backgroundColor: '#3b82f6',
        borderColor: '#2563eb',
        extendedProps: {
          type: 'summary',
          date: dateStr,
          rides: dayRides,
          count: dayRides.length
        }
      });
    });
    
    return summaryEvents;
  }
  
  const isTimedView = $derived(currentCalendarView !== 'dayGridMonth');

  let myRideEvents = $derived(transformRidesToEvents(data.myRides, isTimedView));
  let allRidesDetailEvents = $derived(transformRidesToEvents(data.allRides || [], isTimedView));

  let allRidesSummaryEvents = $derived(createDailySummaryEvents(data.allRides || []));
  
  let displayEvents = $derived.by(() => {
    if (activeView === 'myUnavailability') return myUnavailabilityEvents;
    if (activeView === 'allUnavailability') return allUnavailabilityEvents;
    if (activeView === 'myRides') return myRideEvents;
    if (activeView === 'allRides') {
      return currentCalendarView === 'timeGridDay' ? allRidesDetailEvents : allRidesSummaryEvents;
    }
    return currentCalendarView === 'timeGridDay' 
      ? [...allRidesDetailEvents, ...allUnavailabilityEvents]
      : [...allRidesSummaryEvents, ...allUnavailabilityEvents];
  });
  
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
      
      if (props.type === 'summary' || props.type === 'ride-group') {
        selectedDate = props.date || new Date(info.event.start).toISOString().split('T')[0];
        selectedDayRides = props.rides;
        showSidePanel = true;
      } else if (props.type === 'unavailability-group') {
        // Show list of unavailable drivers
        const unavailList = props.unavailabilities
          .map((u: any) => {
            const name = `${u.staff_profiles?.first_name || ''} ${u.staff_profiles?.last_name || ''}`.trim();
            const reason = u.reason || 'No reason provided';
            const time = u.all_day ? 'All day' : `${u.start_time} - ${u.end_time}`;
            return `• ${name} (${time})\n  Reason: ${reason}`;
          })
          .join('\n\n');
        
        alert(`Driver Unavailability - ${formatDate(props.date)}\n\n${unavailList}`);
      } else if (props.type === 'unavailability') {
        const name = props.unavailData ? 
          `${props.unavailData.staff_profiles?.first_name || ''} ${props.unavailData.staff_profiles?.last_name || ''}`.trim() : 
          'Driver';
        const reason = props.reason || 'No reason provided';
        alert(`${name} - Unavailable\n\nReason: ${reason}`);
      } else if (props.type === 'ride') {
        selectedDate = new Date(props.rideData.appointment_time).toISOString().split('T')[0];
        selectedDayRides = [props.rideData];
        showSidePanel = true;
      }
    },
    viewDidMount: (view: any) => {
      currentCalendarView = view.type;
    },
    slotMinTime: '06:00:00',
    slotMaxTime: '22:00:00',
    allDaySlot: true,
    nowIndicator: true,
    selectable: true,
    eventOrder: 'start,-duration,allDay,title'
  });
  
  $effect(() => {
    options.events = displayEvents;
  });
  
  function closeSidePanel() {
    showSidePanel = false;
    selectedDayRides = [];
    selectedDate = '';
  }
  
  function editRide(rideId: number) {
    goto(`/dispatcher/rides?edit=${rideId}`);
  }
  
  function formatTime(timestamp: string) {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  }
  
  function formatDate(date: string) {
    return new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }
  
  function getStatusColor(status: string) {
    const colors = {
      'Requested': 'bg-gray-100 text-gray-800',
      'Scheduled': 'bg-blue-100 text-blue-800',
      'Assigned': 'bg-amber-100 text-amber-800',
      'In Progress': 'bg-purple-100 text-purple-800',
      'Completed': 'bg-green-100 text-green-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  }
</script>

<svelte:head>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@event-calendar/core@3/index.min.css">
</svelte:head>

<RoleGuard requiredRoles={['Admin', 'Dispatcher', 'Driver']}>
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
          <nav class="flex -mb-px overflow-x-auto">
            {#if data.isAdminOrDispatcher}
              <button
                onclick={() => { activeView = 'all'; showSidePanel = false; }}
                class="px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap {activeView === 'all' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
              >
                <div class="flex items-center gap-2">
                  <CalendarIcon class="w-4 h-4" />
                  All Events
                </div>
              </button>
              
              <button
                onclick={() => { activeView = 'allRides'; showSidePanel = false; }}
                class="px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap {activeView === 'allRides' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
              >
                <div class="flex items-center gap-2">
                  <Building2 class="w-4 h-4" />
                  All Organization Rides ({data.allRides?.length || 0})
                </div>
              </button>
            {/if}
            
            <button
              onclick={() => { activeView = 'myRides'; showSidePanel = false; }}
              class="px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap {activeView === 'myRides' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
            >
              <div class="flex items-center gap-2">
                <Car class="w-4 h-4" />
                My Scheduled Rides ({data.myRides.length})
              </div>
            </button>
            
            <button
              onclick={() => { activeView = 'myUnavailability'; showSidePanel = false; }}
              class="px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap {activeView === 'myUnavailability' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
            >
              <div class="flex items-center gap-2">
                <Users class="w-4 h-4" />
                My Unavailability ({data.myUnavailability.length})
              </div>
            </button>
            
            {#if data.isAdminOrDispatcher}
              <button
                onclick={() => { activeView = 'allUnavailability'; showSidePanel = false; }}
                class="px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap {activeView === 'allUnavailability' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
              >
                <div class="flex items-center gap-2">
                  <Users class="w-4 h-4" />
                  Driver Unavailability ({data.allUnavailability.length})
                </div>
              </button>
            {/if}
          </nav>
        </div>
      </div>

      <!-- Calendar Grid with Side Panel -->
      <div class="flex gap-6">
        <!-- Calendar -->
        <div class="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <Calendar plugins={[TimeGrid, DayGrid, Interaction]} {options} />
        </div>

        <!-- Side Panel for Rides -->
        {#if showSidePanel}
          <div class="w-96 bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col max-h-[700px]">
            <div class="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h3 class="text-lg font-semibold text-gray-900">Rides for {formatDate(selectedDate)}</h3>
                <p class="text-sm text-gray-600">{selectedDayRides.length} ride{selectedDayRides.length !== 1 ? 's' : ''}</p>
              </div>
              <button onclick={closeSidePanel} class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X class="w-5 h-5" />
              </button>
            </div>

            <div class="flex-1 overflow-y-auto p-4 space-y-3">
              {#each sortedSelectedDayRides as ride}
                <div class="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                  <div class="flex items-start justify-between mb-2">
                    <div class="flex-1">
                      <div class="font-medium text-gray-900">
                        {ride.clients ? `${ride.clients.first_name} ${ride.clients.last_name}` : 'Unknown Client'}
                      </div>
                      <div class="text-xs text-gray-500">
                        {ride.clients?.primary_phone || 'No phone'}
                      </div>
                    </div>
                    <span class="px-2 py-1 text-xs rounded-full {getStatusColor(ride.status)}">
                      {ride.status}
                    </span>
                  </div>

                  <div class="space-y-2 text-sm">
                    <div class="flex items-center gap-2 text-gray-600">
                      <Clock class="w-4 h-4 flex-shrink-0" />
                      {#if ride.estimated_appointment_length}
                        {#key ride.ride_id}
                          <span class="font-medium">
                            {formatTime(ride.appointment_time)} – 
                            {formatTime(addMinutesISO(ride.appointment_time, minutesFromEstimated(ride.estimated_appointment_length))!)}
                          </span>
                          <span class="text-xs text-gray-500 ml-2">({ride.estimated_appointment_length})</span>
                        {/key}
                      {:else}
                        <span class="font-medium">{formatTime(ride.appointment_time)}</span>
                      {/if}
                    </div>

                    <div class="flex items-start gap-2 text-gray-600">
                      <MapPin class="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div class="flex-1">
                        <div class="font-medium text-gray-900">{ride.destination_name}</div>
                        <div class="text-xs">{ride.dropoff_address}</div>
                        {#if ride.dropoff_city && ride.dropoff_state}
                          <div class="text-xs">{ride.dropoff_city}, {ride.dropoff_state}</div>
                        {/if}
                      </div>
                    </div>

                    {#if ride.driver}
                      <div class="text-xs text-gray-600">
                        <span class="font-medium">Driver:</span> {ride.driver.first_name} {ride.driver.last_name}
                      </div>
                    {/if}

                    {#if ride.dispatcher}
                      <div class="text-xs text-gray-600">
                        <span class="font-medium">Dispatcher:</span> {ride.dispatcher.first_name} {ride.dispatcher.last_name}
                      </div>
                    {/if}

                    {#if ride.purpose}
                      <div class="text-xs text-gray-500">
                        Purpose: {ride.purpose}
                      </div>
                    {/if}

                    {#if ride.round_trip}
                      <div class="flex items-center gap-1 text-xs text-blue-600">
                        <Car class="w-3 h-3" />
                        <span>Round Trip</span>
                      </div>
                    {/if}
                  </div>

                  {#if data.isAdminOrDispatcher}
                    <button
                      onclick={() => editRide(ride.ride_id)}
                      class="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      <Edit class="w-4 h-4" />
                      Edit Ride
                    </button>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      <!-- Legend -->
      <div class="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 class="text-sm font-semibold text-gray-900 mb-3">Legend</h3>
        
        {#if activeView === 'allRides'}
          <div>
            <p class="text-sm text-gray-600 mb-2">Click on any ride to see details.</p>
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 bg-blue-500 rounded"></div>
              <span class="text-sm text-gray-700">Scheduled Rides</span>
            </div>
          </div>
        {:else if activeView === 'all'}
          <div class="space-y-3">
            <div>
              <h4 class="text-xs font-medium text-gray-700 mb-2">Rides</h4>
              <p class="text-xs text-gray-600 mb-2">Click on any ride to see details.</p>
              <div class="flex items-center gap-2">
                <div class="w-4 h-4 bg-blue-500 rounded"></div>
                <span class="text-sm text-gray-700">Scheduled Rides</span>
              </div>
            </div>
            <div>
              <h4 class="text-xs font-medium text-gray-700 mb-2">Availability</h4>
              <div class="flex items-center gap-2">
                <div class="w-4 h-4 bg-red-500 rounded"></div>
                <span class="text-sm text-gray-700">Driver Unavailable</span>
              </div>
            </div>
          </div>
        {:else if activeView === 'myRides'}
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
        {:else}
          <div>
            <h4 class="text-xs font-medium text-gray-700 mb-2">Availability</h4>
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 bg-red-500 rounded"></div>
              <span class="text-sm text-gray-700">Unavailable</span>
            </div>
          </div>
        {/if}
      </div>

      <!-- Stats Summary -->
      <div class="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-blue-100 rounded-lg">
              <Car class="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p class="text-sm text-gray-600">My Rides</p>
              <p class="text-2xl font-bold text-gray-900">{data.myRides.length}</p>
            </div>
          </div>
        </div>
        
        {#if data.isAdminOrDispatcher}
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-green-100 rounded-lg">
                <Building2 class="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p class="text-sm text-gray-600">All Org Rides</p>
                <p class="text-2xl font-bold text-gray-900">{data.allRides?.length || 0}</p>
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
                  {(data.allRides || []).filter((r: any) => r.status === 'Requested' || r.status === 'Scheduled').length}
                </p>
              </div>
            </div>
          </div>
        {/if}
        
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-red-100 rounded-lg">
              <CalendarIcon class="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p class="text-sm text-gray-600">My Unavailability</p>
              <p class="text-2xl font-bold text-gray-900">{data.myUnavailability.length}</p>
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