<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '$lib/components/ui/table';
  import { Label } from '$lib/components/ui/label';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { toastStore } from '$lib/toast';
  import { enhance } from '$app/forms';
  import SearchIcon from "@lucide/svelte/icons/search";
  import FileTextIcon from "@lucide/svelte/icons/file-text";
  import UserIcon from "@lucide/svelte/icons/user";
  import CarIcon from "@lucide/svelte/icons/car";
  import BuildingIcon from "@lucide/svelte/icons/building";
  import LoaderIcon from "@lucide/svelte/icons/loader";
  import DownloadIcon from "@lucide/svelte/icons/download";
  import CalendarIcon from "@lucide/svelte/icons/calendar";
  import ClockIcon from "@lucide/svelte/icons/clock";

  import type { RideReportData } from './+page.server';

  const { data, form }: { data: PageData; form: ActionData } = $props();

  // Reactive state
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

  // Table state
  let globalFilter = $state('');
  let driverFilter = $state('');
  let sortColumn = $state<string>('scheduled_time');
  let sortDirection = $state<'asc' | 'desc'>('desc');

  // Form element reference
  let formElement: HTMLFormElement;

  // Get options for the selected filter type
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

  // Handle form submission for fetching rides
  const submitForm = () => {
    if (!selectedId && filterType !== 'organization') {
      toastStore.error('Please select a filter option');
      return;
    }
    // Set a dummy value for organization reports
    if (filterType === 'organization') {
      selectedId = 'all';
    }
    formElement.requestSubmit();
  };

  // Handle End of Day quick filter
  const handleEndOfDay = () => {
    const today = new Date().toISOString().split('T')[0];
    fromDate = today;
    toDate = today;

    submitForm();
  };

  // Calculate total hours of all rides
  const calculateTotalHours = (rideList: RideReportData[]) => {
    return rideList.reduce((total, ride) => {
      const hours = ride.hours || 0;
      return total + hours;
    }, 0);
  };

  // Calculate total miles of all rides
  const calculateTotalMiles = (rideList: RideReportData[]) => {
    return rideList.reduce((total, ride) => {
      const miles = ride.miles_driven || 0;
      return total + miles;
    }, 0);
  };

  // Calculate total donations
  const calculateTotalDonations = (rideList: RideReportData[]) => {
    return rideList.reduce((total, ride) => {
      const donation = ride.donation_amount || 0;
      return total + donation;
    }, 0);
  };

  // Calculate average hours per ride
  const calculateAverageHours = (rideList: RideReportData[]) => {
    if (rideList.length === 0) return 0;
    const total = calculateTotalHours(rideList);
    return total / rideList.length;
  };

  // Get unique drivers from current rides
  const getUniqueDriverOptions = () => {
    const uniqueDrivers = new Set<string>();
    rides.forEach(ride => {
      if (ride.driver_name) {
        uniqueDrivers.add(ride.driver_name);
      } else {
        uniqueDrivers.add('Unknown Driver');
      }
    });
    return Array.from(uniqueDrivers).sort();
  };

  // Update rides and totals when form result changes
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

  // Update totals when rides change
  $effect(() => {
    totalHours = calculateTotalHours(rides);
    totalMiles = calculateTotalMiles(rides);
    totalDonations = calculateTotalDonations(rides);
  });

  // Reset selection when filter type changes
  $effect(() => {
    filterType; // Track filterType changes
    // Don't reset if switching to organization type (it's automatic)
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
    globalFilter = '';
    driverFilter = '';
    sortColumn = 'appointment_time';
    sortDirection = 'desc';
  });

  // Get filtered and sorted rides
  const getFilteredRides = () => {
    let filtered = rides;

    // Apply driver filter
    if (driverFilter) {
      filtered = filtered.filter(ride => ride.driver_name === driverFilter);
    }

    // Apply global search filter
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

    // Sort
    const sorted = [...filtered].sort((a, b) => {
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

    return sorted;
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortColumn = column;
      sortDirection = 'asc';
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Unknown';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return 'Invalid Date';
    }
  };

  // Export functionality
  const exportToCSV = () => {
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
    a.download = `drivekind-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toastStore.success('Report exported successfully');
  };
</script>

<svelte:head>
  <title>Reports - Driver Hours | DriveKind</title>
</svelte:head>

<div class="container mx-auto p-6 space-y-6">
  <!-- Page Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">Reports</h1>
      <p class="text-muted-foreground">Generate reports for driver hours and completed rides</p>
    </div>
    <FileTextIcon class="h-8 w-8 text-muted-foreground" />
  </div>

  <!-- Filter and Summary Section -->
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
        <!-- Filter Type Selection -->
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
                class="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
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
                class="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
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
                class="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
              />
              <label for="organization" class="text-sm font-medium flex items-center gap-2 cursor-pointer">
                <BuildingIcon class="h-4 w-4" />
                Whole Organization
              </label>
            </div>
          </div>
        </div>

        <!-- Dynamic Dropdown -->
        <div class="space-y-2">
          <Label class="text-sm font-medium">
            Select {filterType === 'driver' ? 'Driver' : filterType === 'client' ? 'Client' : 'Option'}
          </Label>
          <div class="flex gap-3">
            <select 
              bind:value={selectedId}
              disabled={filterType === 'organization'}
              class="w-full px-3 py-2 border border-input bg-background text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">{filterType === 'organization' ? 'Not applicable for organization report' : `Choose a ${filterType}...`}</option>
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
                Generate Report
              {/if}
            </Button>
          </div>
        </div>

        <!-- Date Range Filter -->
        <div class="space-y-2">
          <Label class="text-sm font-medium">Date Range (Optional)</Label>
          <p class="text-xs text-muted-foreground mb-2">Filter rides by scheduled date</p>
          <div class="flex gap-3 items-end">
            <div class="flex-1">
              <Label class="text-xs text-muted-foreground">From</Label>
              <input
                type="date"
                bind:value={fromDate}
                class="w-full px-3 py-2 border border-input bg-background text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                placeholder="Start date"
              />
            </div>
            <div class="flex-1">
              <Label class="text-xs text-muted-foreground">To</Label>
              <input
                type="date"
                bind:value={toDate}
                class="w-full px-3 py-2 border border-input bg-background text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                placeholder="End date"
              />
            </div>
            {#if filterType !== 'organization'}
              <Button 
                variant="outline"
                onclick={handleEndOfDay} 
                disabled={!selectedId || isLoading}
                class="whitespace-nowrap"
              >
                <CalendarIcon class="h-4 w-4 mr-2" />
                End of Day
              </Button>
            {/if}
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Total Hours Summary -->
    <Card class="relative overflow-hidden border-2 border-border/50 bg-gradient-to-br from-background via-background to-muted/20">
      <CardHeader class="pb-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="p-2 rounded-lg bg-primary/10 text-primary">
              <ClockIcon class="h-5 w-5" />
            </div>
            <div>
              <p class="text-sm font-medium text-muted-foreground">Total Hours</p>
            </div>
          </div>
          <div class="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
            {rides.length} rides
          </div>
        </div>
      </CardHeader>
      <CardContent class="pt-0">
        <div class="space-y-4">
          <!-- Main Total Hours -->
          <div class="relative">
            <div class="text-xs text-muted-foreground mb-1">Total Volunteer Hours</div>
            <div class="text-4xl font-black tracking-tighter text-foreground leading-none">
              {Math.floor(totalHours)}
              <span class="text-xl text-muted-foreground font-bold">
                .{((totalHours % 1) * 60).toFixed(0).padStart(2, '0')} hrs
              </span>
            </div>
          </div>

          <!-- Total Miles -->
          <div class="relative">
            <div class="text-xs text-muted-foreground mb-1">Total Miles Driven</div>
            <div class="text-3xl font-bold tracking-tight text-blue-600 leading-none">
              {Math.floor(totalMiles).toLocaleString('en-US')}
              <span class="text-lg text-blue-500 font-semibold">
                .{Math.round((totalMiles % 1) * 10)} mi
              </span>
            </div>
          </div>

          <!-- Total Donations -->
          {#if rides.length > 0}
            <div class="flex gap-6">
              <div class="relative">
                <div class="text-xs text-muted-foreground mb-1">Donations</div>
                <div class="text-2xl font-bold tracking-tight text-green-600 leading-none">
                  ${Math.floor(totalDonations).toLocaleString('en-US')}
                  <span class="text-base text-green-500 font-semibold">
                    .{(totalDonations % 1).toFixed(2).slice(2)}
                  </span>
                </div>
              </div>

              <!-- Average Hours -->
              <div class="relative">
                <div class="text-xs text-muted-foreground mb-1">Avg Hours</div>
                <div class="text-2xl font-bold tracking-tight text-purple-600 leading-none">
                  {calculateAverageHours(rides).toFixed(2)}
                  <span class="text-base text-purple-500 font-semibold">
                    hrs
                  </span>
                </div>
              </div>
            </div>
          {/if}
          
          <!-- Stats Row -->
          {#if rides.length > 0}
            <div class="flex items-center justify-between text-xs pt-2 border-t border-border/50">
              <div class="flex items-center gap-1">
                <span class="text-muted-foreground">Rides Completed:</span>
                <span class="font-mono font-semibold text-primary">
                  {rides.length}
                </span>
              </div>
              <div class="text-xs text-muted-foreground">
                {rides.filter(r => r.donation_amount && r.donation_amount > 0).length} with donations
              </div>
            </div>
          {:else}
            <div class="text-sm text-muted-foreground pt-2 border-t border-border/50">
              No data loaded
            </div>
          {/if}
        </div>
      </CardContent>
    </Card>
  </div>

  <!-- Hidden form for server actions -->
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

  <!-- Results Section -->
  {#if hasSearched}
    <Card>
      <CardHeader class="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Report Results</CardTitle>
          <p class="text-sm text-muted-foreground">
            {rides.length} completed ride{rides.length !== 1 ? 's' : ''} found
          </p>
        </div>
        {#if rides.length > 0}
          <div class="flex gap-2">
            <Button variant="outline" onclick={exportToCSV}>
              <DownloadIcon class="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        {/if}
      </CardHeader>
      
      {#if rides.length > 0}
        <CardContent class="space-y-4">
          <!-- Search and Filter -->
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2">
              <SearchIcon class="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search rides..."
                bind:value={globalFilter}
                class="max-w-sm"
              />
            </div>
            <div class="flex items-center gap-2">
              <CarIcon class="h-4 w-4 text-muted-foreground" />
              <select
                bind:value={driverFilter}
                class="px-3 py-2 border border-input bg-background text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 min-w-[150px]"
              >
                <option value="">All Drivers</option>
                {#each getUniqueDriverOptions() as driverName}
                  <option value={driverName}>{driverName}</option>
                {/each}
              </select>
            </div>
          </div>

          <!-- Table -->
          <div class="rounded-md border max-w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead class="cursor-pointer select-none" onclick={() => handleSort('appointment_time')}>
                    Date {sortColumn === 'appointment_time' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                  </TableHead>
                  <TableHead class="cursor-pointer select-none" onclick={() => handleSort('driver_name')}>
                    Driver {sortColumn === 'driver_name' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                  </TableHead>
                  <TableHead class="cursor-pointer select-none" onclick={() => handleSort('client_name')}>
                    Client {sortColumn === 'client_name' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                  </TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Pickup</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead class="cursor-pointer select-none" onclick={() => handleSort('hours')}>
                    Hours {sortColumn === 'hours' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                  </TableHead>
                  <TableHead class="cursor-pointer select-none" onclick={() => handleSort('miles_driven')}>
                    Miles {sortColumn === 'miles_driven' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                  </TableHead>
                  <TableHead class="cursor-pointer select-none" onclick={() => handleSort('donation_amount')}>
                    Donation {sortColumn === 'donation_amount' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {#each getFilteredRides() as ride}
                  <TableRow>
                    <TableCell>{formatDate(ride.appointment_time)}</TableCell>
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

          <!-- Results Summary -->
          <div class="text-sm text-muted-foreground text-center">
            Showing {getFilteredRides().length} of {rides.length} result(s)
          </div>
        </CardContent>
      {:else}
        <CardContent>
          <div class="text-center py-8">
            <FileTextIcon class="h-12 w-12 mx-auto text-muted-foreground/50" />
            <h3 class="mt-4 text-lg font-medium">No completed rides found</h3>
            <p class="text-muted-foreground">
              No completed rides were found for the selected {filterType}.
            </p>
          </div>
        </CardContent>
      {/if}
    </Card>
  {/if}

  <!-- Loading State -->
  {#if isLoading}
    <Card>
      <CardContent class="py-8">
        <div class="text-center">
          <LoaderIcon class="h-8 w-8 mx-auto animate-spin text-primary" />
          <p class="mt-2 text-muted-foreground">Generating report...</p>
        </div>
      </CardContent>
    </Card>
  {/if}
</div>
