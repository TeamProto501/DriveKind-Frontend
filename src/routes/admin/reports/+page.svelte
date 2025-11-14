<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '$lib/components/ui/table';
  import { Label } from '$lib/components/ui/label';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { toastStore } from '$lib/toast';
  import { enhance } from '$app/forms';
  import RoleGuard from '$lib/components/RoleGuard.svelte';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import SearchIcon from "@lucide/svelte/icons/search";
  import UserIcon from "@lucide/svelte/icons/user";
  import CarIcon from "@lucide/svelte/icons/car";
  import BuildingIcon from "@lucide/svelte/icons/building";
  import LoaderIcon from "@lucide/svelte/icons/loader";
  import DownloadIcon from "@lucide/svelte/icons/download";
  import ClockIcon from "@lucide/svelte/icons/clock";
  import FileTextIcon from "@lucide/svelte/icons/file-text";
  import type { RideReportData } from './+page.server';

  let { data, form }: { data: PageData; form?: ActionData } = $props();

  // Tab state
  let activeTab = $state<'personal' | 'organization'>('personal');

  // Personal Report State
  let selectedRole = $state<string>('');
  let personalHours = $state<number>(0);
  let personalMiles = $state<number>(0);

  // Organization Reporting State
  let filterType = $state<'driver' | 'client' | 'organization'>('driver');
  let selectedId = $state<string>('');
  let rides = $state<RideReportData[]>([]);
  let isLoading = $state(false);
  let hasSearched = $state(false);
  let totalHours = $state(0);
  let totalMiles = $state(0);
  let totalDonations = $state(0);
  let fromDate = $state('');
  let toDate = $state('');
  let additionalHours = $state<number>(0);
  let additionalMiles = $state<number>(0);

  let globalFilter = $state('');
  let driverFilter = $state('');
  let sortColumn = $state<string>('appointment_time');
  let sortDirection = $state<'asc' | 'desc'>('desc');

  let formElement: HTMLFormElement;

  const firstName = data.userProfile?.first_name || 'User';
  const lastName = data.userProfile?.last_name || 'Report';
  const isAdmin = data.isAdmin || false;

  // Get user's available roles
  const availableRoles = Array.isArray(data.userProfile?.role) 
    ? data.userProfile.role 
    : data.userProfile?.role ? [data.userProfile.role] : [];

  // Set default role
  if (availableRoles.length > 0 && !selectedRole) {
    selectedRole = availableRoles[0];
  }

  // Handle admin rides response
  $effect(() => {
    if (form?.success && form.rides) {
      rides = form.rides;
      hasSearched = true;
      if (form.message) {
        if (form.rides.length === 0) {
          toastStore.info(form.message);
        } else {
          toastStore.success(form.message);
        }
      }
    } else if (form?.error) {
      toastStore.error(form.error);
      rides = [];
      hasSearched = false;
    }
  });

  $effect(() => {
    totalHours = calculateTotalHours(rides);
    totalMiles = calculateTotalMiles(rides);
    totalDonations = calculateTotalDonations(rides);
  });

  // Organization Report Functions
  const getFilterOptions = () => {
    switch (filterType) {
      case 'driver':
        return data.drivers.map(d => ({
          value: d.user_id,
          label: `${d.first_name} ${d.last_name}`
        }));
      case 'client':
        return data.clients.map(c => ({
          value: c.client_id.toString(),
          label: `${c.first_name} ${c.last_name}`
        }));
      default:
        return [];
    }
  };

  const submitForm = () => {
    if (!selectedId && filterType !== 'organization') {
      toastStore.error('Please select a filter option');
      return;
    }
    if (filterType === 'organization') {
      selectedId = 'all';
    }
    formElement.requestSubmit();
  };

  const calculateTotalHours = (rideList: RideReportData[]) => {
    const rideHours = rideList.reduce((total, ride) => total + (ride.hours || 0), 0);
    return rideHours + (additionalHours || 0);
  };

  const calculateTotalMiles = (rideList: RideReportData[]) => {
    const rideMiles = rideList.reduce((total, ride) => total + (ride.miles_driven || 0), 0);
    return rideMiles + (additionalMiles || 0);
  };

  const calculateTotalDonations = (rideList: RideReportData[]) => {
    return rideList.reduce((total, ride) => total + (ride.donation_amount || 0), 0);
  };

  const calculateAverageHours = (rideList: RideReportData[]) => {
    if (rideList.length === 0) return 0;
    return calculateTotalHours(rideList) / rideList.length;
  };

  const getUniqueDriverOptions = () => {
    const uniqueDrivers = new Set<string>();
    rides.forEach(ride => {
      uniqueDrivers.add(ride.driver_name || 'Unknown Driver');
    });
    return Array.from(uniqueDrivers).sort();
  };

  const getFilteredRides = () => {
    let filtered = rides;

    if (driverFilter) {
      filtered = filtered.filter(ride => ride.driver_name === driverFilter);
    }

    if (globalFilter) {
      const searchLower = globalFilter.toLowerCase();
      filtered = filtered.filter(ride => 
        ride.driver_name?.toLowerCase().includes(searchLower) ||
        ride.client_name?.toLowerCase().includes(searchLower) ||
        ride.alt_pickup_address?.toLowerCase().includes(searchLower) ||
        ride.destination_name?.toLowerCase().includes(searchLower) ||
        ride.dropoff_address?.toLowerCase().includes(searchLower)
      );
    }

    return [...filtered].sort((a, b) => {
      let aVal: any = a[sortColumn as keyof RideReportData];
      let bVal: any = b[sortColumn as keyof RideReportData];

      if (sortColumn === 'appointment_time') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortColumn = column;
      sortDirection = 'asc';
    }
  };

  const formatDateShort = (dateStr: string) => {
    if (!dateStr) return 'Unknown';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return 'Invalid Date';
    }
  };

  // Personal Report CSV Export
  const exportPersonalReportCSV = () => {
    if (personalHours === 0 && personalMiles === 0) {
      toastStore.error('Please enter hours or miles to export');
      return;
    }

    if (!selectedRole) {
      toastStore.error('Please select a role');
      return;
    }

    const volunteerName = `${firstName} ${lastName}`;
    const headers = ['Volunteer Name', '# Hours', '# Clients', '# one-way rides', 'Total # of miles', 'Position'];
    const row = [
      `"${volunteerName}"`,
      personalHours.toFixed(2),
      0, // No clients for personal report
      0, // No rides for personal report
      personalMiles.toFixed(1),
      `"${selectedRole}"`
    ];

    const csv = [headers.join(','), row.join(',')].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `personal-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toastStore.success('Personal report exported');
  };

  // Organization Volunteer CSV Export
  const exportVolunteerCSV = () => {
    if (rides.length === 0 && !additionalHours && !additionalMiles) {
      toastStore.error('No data to export');
      return;
    }

    const volunteerMap = new Map();
    
    rides.forEach(ride => {
      const name = ride.driver_name || 'Unknown';
      if (!volunteerMap.has(name)) {
        volunteerMap.set(name, {
          name,
          hours: 0,
          clients: new Set(),
          rides: 0,
          miles: 0
        });
      }
      
      const vol = volunteerMap.get(name);
      vol.hours += ride.hours || 0;
      vol.miles += ride.miles_driven || 0;
      vol.rides += 1;
      if (ride.client_name) vol.clients.add(ride.client_name);
    });

    const headers = ['Volunteer Name', '# Hours', '# Clients', '# one-way rides', 'Total # of miles', 'Position'];
    const rows = Array.from(volunteerMap.values()).map(v => {
      const totalHours = v.hours + (additionalHours || 0);
      const totalMiles = v.miles + (additionalMiles || 0);
      
      return [
        `"${v.name}"`,
        totalHours.toFixed(2),
        v.clients.size,
        v.rides,
        totalMiles.toFixed(1),
        '"Driver"'
      ];
    });

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `volunteer-hours-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toastStore.success('Volunteer report exported');
  };

  const exportRidesCSV = () => {
    if (rides.length === 0) {
      toastStore.error('No data to export');
      return;
    }

    const headers = ['Date', 'Driver', 'Client', 'Purpose', 'Pickup', 'Destination', 'Hours', 'Miles', 'Donation'];
    const csvContent = [
      headers.join(','),
      ...rides.map(ride => {
        return [
          `"${ride.appointment_time ? new Date(ride.appointment_time).toLocaleDateString() : 'Unknown'}"`,
          `"${ride.driver_name || 'Unknown'}"`,
          `"${ride.client_name || 'Unknown'}"`,
          `"${ride.purpose || 'N/A'}"`,
          `"${ride.alt_pickup_address || 'From Home'}"`,
          `"${ride.destination_name || 'N/A'}"`,
          ride.hours || 0,
          ride.miles_driven || 0,
          ride.donation_amount || 0
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rides-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toastStore.success('Rides report exported');
  };

  $effect(() => {
    filterType;
    if (filterType !== 'organization') {
      selectedId = '';
    }
    rides = [];
    hasSearched = false;
    totalHours = 0;
    totalMiles = 0;
    totalDonations = 0;
    fromDate = '';
    toDate = '';
    additionalHours = 0;
    additionalMiles = 0;
    globalFilter = '';
    driverFilter = '';
    sortColumn = 'appointment_time';
    sortDirection = 'desc';
  });
</script>

<svelte:head>
  <title>Reports | DriveKind</title>
</svelte:head>

<RoleGuard requiredRoles={['Admin', 'Driver', 'Dispatcher', 'Volunteer']}>
  <div class="min-h-screen bg-gray-50">
    <Breadcrumbs />
    
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <!-- Page Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Reports</h1>
        <p class="text-gray-600 mt-2">Generate personal reports and organization analytics</p>
      </div>

      <!-- Tab Navigation -->
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex space-x-8">
          <button
            onclick={() => activeTab = 'personal'}
            class={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'personal'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <UserIcon class="w-4 h-4 inline mr-2" />
            Personal Report
          </button>
          {#if isAdmin}
            <button
              onclick={() => activeTab = 'organization'}
              class={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'organization'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BuildingIcon class="w-4 h-4 inline mr-2" />
              Organization Reports
            </button>
          {/if}
        </nav>
      </div>

      <!-- PERSONAL REPORT TAB -->
      {#if activeTab === 'personal'}
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <FileTextIcon class="w-5 h-5 text-blue-600" />
              Personal Report
            </CardTitle>
            <p class="text-sm text-muted-foreground">
              Generate a CSV report of your volunteer hours and mileage
            </p>
          </CardHeader>
          
          <CardContent class="space-y-6">
            <!-- Role Selection -->
            <div>
              <Label class="block text-sm font-medium text-gray-700 mb-2">
                Report As (Role) *
              </Label>
              <select
                bind:value={selectedRole}
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {#each availableRoles as role}
                  <option value={role}>{role}</option>
                {/each}
              </select>
              <p class="text-xs text-gray-500 mt-1">Select which role to report your hours under</p>
            </div>

            <!-- Hours and Miles Entry -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label class="block text-sm font-medium text-gray-700 mb-2">
                  <ClockIcon class="w-4 h-4 inline mr-1" />
                  Hours
                </Label>
                <Input
                  type="number"
                  bind:value={personalHours}
                  min="0"
                  step="0.25"
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label class="block text-sm font-medium text-gray-700 mb-2">
                  <CarIcon class="w-4 h-4 inline mr-1" />
                  Miles
                </Label>
                <Input
                  type="number"
                  bind:value={personalMiles}
                  min="0"
                  step="0.1"
                  placeholder="0.0"
                />
              </div>
            </div>

            <!-- Preview -->
            {#if personalHours > 0 || personalMiles > 0}
              <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 class="text-sm font-medium text-gray-900 mb-2">Report Preview</h3>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <p class="text-xs text-gray-500">Volunteer</p>
                    <p class="font-medium">{firstName} {lastName}</p>
                  </div>
                  <div>
                    <p class="text-xs text-gray-500">Position</p>
                    <p class="font-medium">{selectedRole}</p>
                  </div>
                  <div>
                    <p class="text-xs text-gray-500">Hours</p>
                    <p class="font-medium text-blue-600">{personalHours.toFixed(2)}</p>
                  </div>
                  <div>
                    <p class="text-xs text-gray-500">Miles</p>
                    <p class="font-medium text-green-600">{personalMiles.toFixed(1)}</p>
                  </div>
                </div>
              </div>
            {/if}

            <!-- Generate Button -->
            <Button onclick={exportPersonalReportCSV} class="w-full">
              <DownloadIcon class="w-5 h-5 mr-2" />
              Generate Personal Report
            </Button>
          </CardContent>
        </Card>
      {/if}

      <!-- ORGANIZATION REPORTS TAB -->
      {#if activeTab === 'organization' && isAdmin}
        <div class="space-y-6">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Filter Section -->
            <Card class="lg:col-span-2">
              <CardHeader>
                <CardTitle class="flex items-center gap-2">
                  <SearchIcon class="h-5 w-5" />
                  Report Filters
                </CardTitle>
              </CardHeader>
              <CardContent class="space-y-4">
                <div class="space-y-3">
                  <Label class="text-sm font-medium">Report Type</Label>
                  <div class="flex gap-6">
                    <div class="flex items-center space-x-2">
                      <input 
                        type="radio" 
                        id="driver" 
                        name="filterType" 
                        value="driver" 
                        bind:group={filterType}
                        class="h-4 w-4"
                      />
                      <label for="driver" class="text-sm font-medium flex items-center gap-2 cursor-pointer">
                        <CarIcon class="h-4 w-4" />
                        By Driver
                      </label>
                    </div>
                    <div class="flex items-center space-x-2">
                      <input 
                        type="radio" 
                        id="client" 
                        name="filterType" 
                        value="client" 
                        bind:group={filterType}
                        class="h-4 w-4"
                      />
                      <label for="client" class="text-sm font-medium flex items-center gap-2 cursor-pointer">
                        <UserIcon class="h-4 w-4" />
                        By Client
                      </label>
                    </div>
                    <div class="flex items-center space-x-2">
                      <input 
                        type="radio" 
                        id="organization" 
                        name="filterType" 
                        value="organization" 
                        bind:group={filterType}
                        class="h-4 w-4"
                      />
                      <label for="organization" class="text-sm font-medium flex items-center gap-2 cursor-pointer">
                        <BuildingIcon class="h-4 w-4" />
                        Whole Organization
                      </label>
                    </div>
                  </div>
                </div>

                <div class="space-y-2">
                  <Label class="text-sm font-medium">
                    Select {filterType === 'driver' ? 'Driver' : filterType === 'client' ? 'Client' : 'Option'}
                  </Label>
                  <div class="flex gap-3">
                    <select 
                      bind:value={selectedId}
                      disabled={filterType === 'organization'}
                      class="w-full px-3 py-2 border rounded-md disabled:opacity-50"
                    >
                      <option value="">{filterType === 'organization' ? 'Not applicable' : `Choose a ${filterType}...`}</option>
                      {#if filterType !== 'organization'}
                        {#each getFilterOptions() as option}
                          <option value={option.value}>{option.label}</option>
                        {/each}
                      {/if}
                    </select>
                    <Button
                      onclick={submitForm}
                      disabled={(filterType !== 'organization' && !selectedId) || isLoading}
                      class="whitespace-nowrap"
                    >
                      {#if isLoading}
                        <LoaderIcon class="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      {:else}
                        <SearchIcon class="h-4 w-4 mr-2" />
                        Load Rides
                      {/if}
                    </Button>
                  </div>
                </div>

                <div class="space-y-2">
                  <Label class="text-sm font-medium">Date Range (Optional)</Label>
                  <div class="flex gap-3">
                    <div class="flex-1">
                      <Label class="text-xs text-gray-500">From</Label>
                      <input
                        type="date"
                        bind:value={fromDate}
                        class="w-full px-3 py-2 border rounded-md text-sm"
                      />
                    </div>
                    <div class="flex-1">
                      <Label class="text-xs text-gray-500">To</Label>
                      <input
                        type="date"
                        bind:value={toDate}
                        class="w-full px-3 py-2 border rounded-md text-sm"
                      />
                    </div>
                  </div>
                </div>

                <!-- Additional Hours/Miles -->
                <div class="space-y-2">
                  <Label class="text-sm font-medium">Additional Hours/Miles (Optional)</Label>
                  <p class="text-xs text-muted-foreground">Add extra hours or miles not tracked in rides</p>
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <Label class="text-xs text-gray-500">Additional Hours</Label>
                      <Input
                        type="number"
                        bind:value={additionalHours}
                        min="0"
                        step="0.25"
                        placeholder="0.00"
                        class="text-sm"
                      />
                    </div>
                    <div>
                      <Label class="text-xs text-gray-500">Additional Miles</Label>
                      <Input
                        type="number"
                        bind:value={additionalMiles}
                        min="0"
                        step="0.1"
                        placeholder="0.0"
                        class="text-sm"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <!-- Summary Card -->
            <Card>
              <CardHeader class="pb-2">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <div class="p-2 rounded-lg bg-primary/10">
                      <ClockIcon class="h-5 w-5" />
                    </div>
                    <p class="text-sm font-medium text-gray-600">Total Hours</p>
                  </div>
                  <div class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {rides.length} rides
                  </div>
                </div>
              </CardHeader>
              <CardContent class="pt-0">
                <div class="space-y-4">
                  <div>
                    <div class="text-xs text-gray-500 mb-1">Total Volunteer Hours</div>
                    <div class="text-4xl font-black">
                      {Math.floor(totalHours)}
                      <span class="text-xl text-gray-500 font-bold">
                        .{((totalHours % 1) * 60).toFixed(0).padStart(2, '0')} hrs
                      </span>
                    </div>
                    {#if additionalHours > 0}
                      <p class="text-xs text-gray-500 mt-1">
                        Includes {additionalHours.toFixed(2)} additional hours
                      </p>
                    {/if}
                  </div>

                  <div>
                    <div class="text-xs text-gray-500 mb-1">Total Miles</div>
                    <div class="text-3xl font-bold text-blue-600">
                      {Math.floor(totalMiles).toLocaleString('en-US')}
                      <span class="text-lg text-blue-500">
                        .{Math.round((totalMiles % 1) * 10)} mi
                      </span>
                    </div>
                    {#if additionalMiles > 0}
                      <p class="text-xs text-blue-500 mt-1">
                        Includes {additionalMiles.toFixed(1)} additional miles
                      </p>
                    {/if}
                  </div>

                  {#if rides.length > 0}
                    <div class="flex gap-4">
                      <div>
                        <div class="text-xs text-gray-500 mb-1">Donations</div>
                        <div class="text-2xl font-bold text-green-600">
                          ${Math.floor(totalDonations).toLocaleString('en-US')}
                        </div>
                      </div>
                      <div>
                        <div class="text-xs text-gray-500 mb-1">Avg Hours</div>
                        <div class="text-2xl font-bold text-purple-600">
                          {calculateAverageHours(rides).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  {/if}
                </div>
              </CardContent>
            </Card>
          </div>

          <!-- Hidden Form -->
          <form
            bind:this={formElement}
            method="POST"
            action="?/fetchRides"
            use:enhance={() => {
              isLoading = true;
              return async ({ update }) => {
                isLoading = false;
                await update();
              };
            }}
            style="display: none;"
          >
            <input type="hidden" name="filterType" value={filterType} />
            <input type="hidden" name="selectedId" value={selectedId} />
            <input type="hidden" name="fromDate" value={fromDate} />
            <input type="hidden" name="toDate" value={toDate} />
          </form>

          <!-- Results -->
          {#if hasSearched}
            <Card>
              <CardHeader class="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Report Results</CardTitle>
                  <p class="text-sm text-gray-600">
                    {rides.length} completed ride{rides.length !== 1 ? 's' : ''} found
                  </p>
                </div>
                {#if rides.length > 0}
                  <div class="flex gap-2">
                    <Button variant="outline" onclick={exportRidesCSV} size="sm">
                      <DownloadIcon class="h-4 w-4 mr-2" />
                      Rides CSV
                    </Button>
                    <Button variant="outline" onclick={exportVolunteerCSV} size="sm">
                      <UserIcon class="h-4 w-4 mr-2" />
                      Volunteer CSV
                    </Button>
                  </div>
                {/if}
              </CardHeader>
              
              {#if rides.length > 0}
                <CardContent class="space-y-4">
                  <div class="flex items-center gap-4">
                    <div class="flex items-center gap-2">
                      <SearchIcon class="h-4 w-4 text-gray-500" />
                      <Input
                        placeholder="Search rides..."
                        bind:value={globalFilter}
                        class="max-w-sm"
                      />
                    </div>
                    <div class="flex items-center gap-2">
                      <CarIcon class="h-4 w-4 text-gray-500" />
                      <select
                        bind:value={driverFilter}
                        class="px-3 py-2 border rounded-md text-sm min-w-[150px]"
                      >
                        <option value="">All Drivers</option>
                        {#each getUniqueDriverOptions() as driverName}
                          <option value={driverName}>{driverName}</option>
                        {/each}
                      </select>
                    </div>
                  </div>

                  <div class="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead class="cursor-pointer" onclick={() => handleSort('appointment_time')}>
                            Date {sortColumn === 'appointment_time' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                          </TableHead>
                          <TableHead class="cursor-pointer" onclick={() => handleSort('driver_name')}>
                            Driver {sortColumn === 'driver_name' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                          </TableHead>
                          <TableHead class="cursor-pointer" onclick={() => handleSort('client_name')}>
                            Client {sortColumn === 'client_name' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                          </TableHead>
                          <TableHead>Purpose</TableHead>
                          <TableHead>Pickup</TableHead>
                          <TableHead>Destination</TableHead>
                          <TableHead class="cursor-pointer" onclick={() => handleSort('hours')}>
                            Hours {sortColumn === 'hours' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                          </TableHead>
                          <TableHead class="cursor-pointer" onclick={() => handleSort('miles_driven')}>
                            Miles {sortColumn === 'miles_driven' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                          </TableHead>
                          <TableHead class="cursor-pointer" onclick={() => handleSort('donation_amount')}>
                            Donation {sortColumn === 'donation_amount' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {#each getFilteredRides() as ride}
                          <TableRow>
                            <TableCell>{formatDateShort(ride.appointment_time)}</TableCell>
                            <TableCell>{ride.driver_name || 'Unknown'}</TableCell>
                            <TableCell>{ride.client_name || 'Unknown'}</TableCell>
                            <TableCell>{ride.purpose || 'N/A'}</TableCell>
                            <TableCell class="max-w-[200px] truncate">{ride.alt_pickup_address || 'From Home'}</TableCell>
                            <TableCell class="max-w-[200px] truncate">{ride.destination_name || 'N/A'}</TableCell>
                            <TableCell>{ride.hours ? `${ride.hours.toFixed(2)} hrs` : '0 hrs'}</TableCell>
                            <TableCell>{ride.miles_driven ? `${ride.miles_driven.toFixed(1)} mi` : '0 mi'}</TableCell>
                            <TableCell>{ride.donation_amount ? `$${ride.donation_amount.toLocaleString()}` : '$0'}</TableCell>
                          </TableRow>
                        {/each}
                      </TableBody>
                    </Table>
                  </div>

                  <div class="text-sm text-gray-600 text-center">
                    Showing {getFilteredRides().length} of {rides.length} result(s)
                  </div>
                </CardContent>
              {:else}
                <CardContent>
                  <div class="text-center py-8">
                    <FileTextIcon class="h-12 w-12 mx-auto text-gray-400" />
                    <h3 class="mt-4 text-lg font-medium">No completed rides found</h3>
                    <p class="text-gray-600">
                      No completed rides were found for the selected {filterType}.
                    </p>
                  </div>
                </CardContent>
              {/if}
            </Card>
          {/if}

          {#if isLoading}
            <Card>
              <CardContent class="py-8">
                <div class="text-center">
                  <LoaderIcon class="h-8 w-8 mx-auto animate-spin text-blue-600" />
                  <p class="mt-2 text-gray-600">Loading rides...</p>
                </div>
              </CardContent>
            </Card>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</RoleGuard>