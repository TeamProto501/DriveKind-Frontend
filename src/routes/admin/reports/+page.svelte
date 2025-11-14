<!-- Combined Reports Page: Personal PDF Generator + Admin Organization Reports -->
<!-- Combined Reports Page: Personal PDF Generator + Admin Organization Reports -->
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
  import { Download, Calendar, FileText, Clock, MapPin, Car, AlertCircle, AlertTriangle } from '@lucide/svelte';
  import SearchIcon from "@lucide/svelte/icons/search";
  import UserIcon from "@lucide/svelte/icons/user";
  import BuildingIcon from "@lucide/svelte/icons/building";
  import LoaderIcon from "@lucide/svelte/icons/loader";
  import DownloadIcon from "@lucide/svelte/icons/download";
  import ClockIcon from "@lucide/svelte/icons/clock";
  import jsPDF from 'jspdf';
  import type { RideReportData } from './+page.server';

  let { data, form }: { data: PageData; form?: ActionData } = $props();

  // Personal Report State
  let startDate = getDefaultStartDate();
  let endDate = getDefaultEndDate();
  let hoursWorked: number | null = null;
  let mileage: number | null = null;
  let rideCount: number | null = null;
  let clientsServed: number | null = null;
  let isAutoFilling = $state(false);
  let isGenerating = $state(false);
  
  const firstName = data.userProfile?.first_name || 'User';
  const lastName = data.userProfile?.last_name || 'Report';
  const organizationName = data.organization?.name || 'Organization';
  
  function getCurrentDateString(): string {
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}${day}${year}`;
  }
  
  let reportName = $state(`${lastName}${firstName} Report_${getCurrentDateString()}`);
  
  // Validation state
  let showHoursWarning = $state(false);
  let showMileageWarning = $state(false);
  let showStartDateWarning = $state(false);
  let showEndDateWarning = $state(false);

  const userRole = data.userProfile?.role 
    ? (Array.isArray(data.userProfile.role) ? data.userProfile.role[0] : data.userProfile.role)
    : 'Volunteer';
  
  const isDriver = Array.isArray(data.userProfile?.role) 
    ? data.userProfile.role.includes('Driver') 
    : data.userProfile?.role === 'Driver';

  const isAdmin = data.isAdmin || false;

  // Admin Reporting State
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

  let globalFilter = $state('');
  let driverFilter = $state('');
  let sortColumn = $state<string>('appointment_time');
  let sortDirection = $state<'asc' | 'desc'>('desc');

  let formElement: HTMLFormElement;

  function getDefaultStartDate(): string {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  }

  function getDefaultEndDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  // Handle auto-fill response
  $effect(() => {
    if (form?.success && form.autoFill) {
      hoursWorked = form.autoFill.hours;
      mileage = form.autoFill.miles;
      rideCount = form.autoFill.rides;
      clientsServed = form.autoFill.clients || 0;
      if (form.message) {
        toastStore.success(form.message);
      }
    }
  });

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

  $effect(() => {
    if (hoursWorked !== null) showHoursWarning = false;
    if (mileage !== null) showMileageWarning = false;
    if (startDate) showStartDateWarning = false;
    if (endDate) showEndDateWarning = false;
  });

  function validateForm(): boolean {
    let isValid = true;
    showStartDateWarning = false;
    showEndDateWarning = false;
    showHoursWarning = false;
    showMileageWarning = false;

    if (!startDate) {
      showStartDateWarning = true;
      toastStore.error('Please select a start date');
      isValid = false;
    }

    if (!endDate) {
      showEndDateWarning = true;
      toastStore.error('Please select an end date');
      isValid = false;
    }

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      showStartDateWarning = true;
      showEndDateWarning = true;
      toastStore.error('Start date must be before end date');
      isValid = false;
    }

    if (hoursWorked === null || hoursWorked < 0) {
      showHoursWarning = true;
      toastStore.error('Please enter valid hours worked');
      isValid = false;
    }

    if (mileage === null || mileage < 0) {
      showMileageWarning = true;
      toastStore.error('Please enter valid mileage');
      isValid = false;
    }

    if (!reportName.trim()) {
      toastStore.error('Please enter a report name');
      isValid = false;
    }

    return isValid;
  }

  function generatePDF() {
    if (!validateForm()) return;

    try {
      isGenerating = true;

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 20;

      // Header
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('Work Hours & Mileage Report', pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 12;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text(`${firstName} ${lastName}`, pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 7;
      doc.setFontSize(10);
      doc.setTextColor(100);
      const orgText = `Organization: ${organizationName}`;
      const orgTextWidth = doc.getTextWidth(orgText);
      const orgLabelWidth = doc.getTextWidth('Organization: ');
      const orgStartX = (pageWidth - orgTextWidth) / 2;
      doc.setFont('helvetica', 'bold');
      doc.text('Organization:   ', orgStartX, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(organizationName, orgStartX + orgLabelWidth, yPosition);
      
      yPosition += 7;
      doc.setFontSize(11);
      const roleText = `Role: ${userRole}`;
      const roleTextWidth = doc.getTextWidth(roleText);
      const roleLabelWidth = doc.getTextWidth('Role: ');
      const roleStartX = (pageWidth - roleTextWidth) / 2;
      doc.setFont('helvetica', 'bold');
      doc.text('Role:  ', roleStartX, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(userRole, roleStartX + roleLabelWidth, yPosition);
      
      yPosition += 7;
      const periodText = `Report Period: ${formatDate(startDate)} - ${formatDate(endDate)}`;
      const periodTextWidth = doc.getTextWidth(periodText);
      const periodLabelWidth = doc.getTextWidth('Report Period: ');
      const periodStartX = (pageWidth - periodTextWidth) / 2;
      doc.setFont('helvetica', 'bold');
      doc.text('Report Period:  ', periodStartX, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(`${formatDate(startDate)} - ${formatDate(endDate)}`, periodStartX + periodLabelWidth, yPosition);
      
      yPosition += 12;
      doc.setDrawColor(200);
      doc.line(20, yPosition, pageWidth - 20, yPosition);
      
      yPosition += 20;

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0);
      doc.text('Summary', 20, yPosition);
      
      yPosition += 15;

      const boxWidth = 120;
      const boxHeight = 25;
      const boxSpacing = 12;
      let xPosition = (pageWidth - boxWidth) / 2;

      // Total Hours Box
      doc.setFillColor(59, 130, 246);
      doc.roundedRect(xPosition, yPosition, boxWidth, boxHeight, 3, 3, 'F');
      doc.setTextColor(255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Total Hours Worked', xPosition + boxWidth / 2, yPosition + 8, { align: 'center' });
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(hoursWorked!.toFixed(2), xPosition + boxWidth / 2, yPosition + 18, { align: 'center' });

      yPosition += boxHeight + boxSpacing;

      // Total Mileage Box
      doc.setFillColor(34, 197, 94);
      doc.roundedRect(xPosition, yPosition, boxWidth, boxHeight, 3, 3, 'F');
      doc.setTextColor(255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Total Mileage', xPosition + boxWidth / 2, yPosition + 8, { align: 'center' });
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(`${mileage!.toFixed(1)} mi`, xPosition + boxWidth / 2, yPosition + 18, { align: 'center' });

      // Driver metrics
      if (isDriver && rideCount !== null) {
        yPosition += boxHeight + boxSpacing;

        doc.setFillColor(168, 85, 247);
        doc.roundedRect(xPosition, yPosition, boxWidth, boxHeight, 3, 3, 'F');
        doc.setTextColor(255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Completed Rides', xPosition + boxWidth / 2, yPosition + 8, { align: 'center' });
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(rideCount.toString(), xPosition + boxWidth / 2, yPosition + 18, { align: 'center' });

        if (clientsServed !== null) {
          yPosition += boxHeight + boxSpacing;

          doc.setFillColor(234, 88, 12);
          doc.roundedRect(xPosition, yPosition, boxWidth, boxHeight, 3, 3, 'F');
          doc.setTextColor(255);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text('Clients Served', xPosition + boxWidth / 2, yPosition + 8, { align: 'center' });
          doc.setFontSize(18);
          doc.setFont('helvetica', 'bold');
          doc.text(clientsServed.toString(), xPosition + boxWidth / 2, yPosition + 18, { align: 'center' });
        }
      }

      yPosition += boxHeight + 20;

      // Note section
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(20, yPosition, pageWidth - 40, 20, 2, 2, 'F');
      yPosition += 7;
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.setFont('helvetica', 'italic');
      doc.text('Note: Hours and mileage values are self-reported by the user.', pageWidth / 2, yPosition, { align: 'center' });
      if (isDriver && rideCount !== null) {
        yPosition += 6;
        doc.text('Ride statistics are automatically calculated from system records.', pageWidth / 2, yPosition, { align: 'center' });
      }

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );

      const fileName = `${reportName.replace(/\s+/g, '_')}.pdf`;
      doc.save(fileName);
      
      toastStore.success('Report generated successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toastStore.error('Failed to generate PDF');
    } finally {
      isGenerating = false;
    }
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Admin functions
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

  const handleEndOfDay = () => {
    const today = new Date().toISOString().split('T')[0];
    fromDate = today;
    toDate = today;
    submitForm();
  };

  const calculateTotalHours = (rideList: RideReportData[]) => {
    return rideList.reduce((total, ride) => total + (ride.hours || 0), 0);
  };

  const calculateTotalMiles = (rideList: RideReportData[]) => {
    return rideList.reduce((total, ride) => total + (ride.miles_driven || 0), 0);
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

  const exportVolunteerCSV = () => {
    if (rides.length === 0) {
      toastStore.error('No data to export');
      return;
    }

    // Group by volunteer
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
    const rows = Array.from(volunteerMap.values()).map(v => [
      `"${v.name}"`,
      v.hours.toFixed(2),
      v.clients.size,
      v.rides,
      v.miles.toFixed(1),
      '"Driver"'
    ]);

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
        <h1 class="text-3xl font-bold text-gray-900">Work Reports</h1>
        <p class="text-gray-600 mt-2">Generate personal PDF reports and view organization analytics</p>
      </div>

      <!-- PERSONAL REPORT SECTION -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <FileText class="w-5 h-5 text-blue-600" />
            Personal Work Report
          </CardTitle>
          <p class="text-sm text-muted-foreground">
            Generate a PDF report of your hours and mileage
          </p>
        </CardHeader>
        
        <CardContent class="space-y-6">
          <!-- Driver Auto-fill Section -->
          {#if isDriver}
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 class="text-sm font-medium text-blue-900 mb-2 flex items-center gap-2">
                <Car class="w-4 h-4" />
                Auto-fill from Your Rides
              </h3>
              <p class="text-xs text-blue-700 mb-3">
                Select a date range to automatically calculate hours and miles from your completed rides
              </p>
              
              <form
                method="POST"
                action="?/getDriverRides"
                use:enhance={() => {
                  isAutoFilling = true;
                  return async ({ update }) => {
                    isAutoFilling = false;
                    await update();
                  };
                }}
                class="space-y-3"
              >
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label class="text-xs">Start Date</Label>
                    <input
                      type="date"
                      name="startDate"
                      bind:value={startDate}
                      required
                      class="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <Label class="text-xs">End Date</Label>
                    <input
                      type="date"
                      name="endDate"
                      bind:value={endDate}
                      required
                      class="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <Button type="submit" disabled={isAutoFilling} class="w-full" variant="outline">
                  {#if isAutoFilling}
                    <LoaderIcon class="w-4 h-4 mr-2 animate-spin" />
                    Loading Rides...
                  {:else}
                    <Car class="w-4 h-4 mr-2" />
                    Load My Rides
                  {/if}
                </Button>
              </form>
            </div>
            <div class="border-t pt-4" />
          {/if}

          <!-- Manual Entry -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label class="block text-sm font-medium text-gray-700 mb-2">
                <Clock class="w-4 h-4 inline mr-1" />
                Total Hours * {isDriver ? '(editable)' : ''}
              </Label>
              <Input
                type="number"
                bind:value={hoursWorked}
                min="0"
                step="0.25"
                placeholder="0.00"
                required
                class={showHoursWarning ? 'border-red-500 ring-2 ring-red-200' : ''}
              />
              {#if showHoursWarning}
                <div class="flex items-center gap-1 mt-1 text-xs text-red-600">
                  <AlertTriangle class="w-3 h-3" />
                  <span>Hours is required</span>
                </div>
              {/if}
            </div>

            <div>
              <Label class="block text-sm font-medium text-gray-700 mb-2">
                <MapPin class="w-4 h-4 inline mr-1" />
                Total Miles * {isDriver ? '(editable)' : ''}
              </Label>
              <Input
                type="number"
                bind:value={mileage}
                min="0"
                step="0.1"
                placeholder="0.0"
                required
                class={showMileageWarning ? 'border-red-500 ring-2 ring-red-200' : ''}
              />
              {#if showMileageWarning}
                <div class="flex items-center gap-1 mt-1 text-xs text-red-600">
                  <AlertTriangle class="w-3 h-3" />
                  <span>Mileage is required</span>
                </div>
              {/if}
            </div>
          </div>

          {#if isDriver && rideCount !== null}
            <div class="bg-purple-50 rounded-lg p-3 text-sm border border-purple-200">
              <p class="text-purple-900 font-medium">
                📊 Based on {rideCount} completed rides serving {clientsServed} clients
              </p>
            </div>
          {/if}

          <!-- Report Name -->
          <div>
            <Label class="block text-sm font-medium text-gray-700 mb-2">Report File Name</Label>
            <Input bind:value={reportName} placeholder="Report_Name" />
            <p class="text-xs text-gray-500 mt-1">This will be the name of your downloaded PDF file</p>
          </div>

          <!-- Generate Button -->
          <Button onclick={generatePDF} disabled={isGenerating} class="w-full">
            <Download class="w-5 h-5 mr-2" />
            <span>{isGenerating ? 'Generating PDF...' : 'Generate & Download Report'}</span>
          </Button>
        </CardContent>
      </Card>

      <!-- ADMIN ORGANIZATION REPORTS SECTION -->
      {#if isAdmin}
        <div class="space-y-6">
          <div class="border-t pt-8">
            <h2 class="text-2xl font-bold text-gray-900 mb-2">Organization Reports</h2>
            <p class="text-gray-600">Generate reports and analytics for the entire organization</p>
          </div>

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
                        <Car class="h-4 w-4" />
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
                        Generate
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
                  </div>

                  <div>
                    <div class="text-xs text-gray-500 mb-1">Total Miles</div>
                    <div class="text-3xl font-bold text-blue-600">
                      {Math.floor(totalMiles).toLocaleString('en-US')}
                      <span class="text-lg text-blue-500">
                        .{Math.round((totalMiles % 1) * 10)} mi
                      </span>
                    </div>
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
                      <Car class="h-4 w-4 text-gray-500" />
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
                    <FileText class="h-12 w-12 mx-auto text-gray-400" />
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
                  <p class="mt-2 text-gray-600">Generating report...</p>
                </div>
              </CardContent>
            </Card>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</RoleGuard>