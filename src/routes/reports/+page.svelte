<script lang="ts">
  import RoleGuard from '$lib/components/RoleGuard.svelte';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import { Download, Calendar, FileText, Clock, MapPin, Car, AlertCircle, AlertTriangle, ChevronDown } from '@lucide/svelte';
  import { API_BASE_URL } from '$lib/api';
  import { toastStore } from '$lib/toast';
  import type { PageData } from './$types';
  import jsPDF from 'jspdf';

  let { data }: { data: PageData } = $props();

  type RideStats = {
    scheduled: number;
    completed: number;
    total: number;
  };

  let startDate = getDefaultStartDate();
  let endDate = getDefaultEndDate();
  let manualHoursWorked: number = 0;
  let manualMileage: number = 0;
  
  // Role selection
  const userRoles = Array.isArray(data.userProfile?.role) 
    ? data.userProfile.role 
    : (data.userProfile?.role ? [data.userProfile.role] : ['Volunteer']);
  
  let selectedRole = $state(userRoles[0] || 'Volunteer');
  let isDriverRole = $derived(selectedRole === 'Driver');
  
  // Selected rides for drivers
  let selectedRideIds = $state<Set<number>>(new Set());
  
  // Calculate totals from selected rides
  let ridesHours = $derived(() => {
    if (!isDriverRole || selectedRideIds.size === 0) return 0;
    return Array.from(selectedRideIds)
      .map(id => data.completedRides.find(r => r.ride_id === id))
      .filter(r => r && r.hours)
      .reduce((sum, r) => sum + (r!.hours || 0), 0);
  });
  
  let ridesMileage = $derived(() => {
    if (!isDriverRole || selectedRideIds.size === 0) return 0;
    return Array.from(selectedRideIds)
      .map(id => data.completedRides.find(r => r.ride_id === id))
      .filter(r => r && r.miles_driven)
      .reduce((sum, r) => sum + (r!.miles_driven || 0), 0);
  });
  
  // Total calculations (manual + rides)
  let totalHours = $derived(manualHoursWorked + ridesHours());
  let totalMileage = $derived(manualMileage + ridesMileage());
  
  // Filter rides by date range
  let filteredRides = $derived(() => {
    if (!data.completedRides) return [];
    return data.completedRides.filter(ride => {
      const rideDate = new Date(ride.appointment_time);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return rideDate >= start && rideDate <= end;
    });
  });
  
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
  
  let reportName = `${lastName}${firstName} Report_${getCurrentDateString()}`;
  
  let isGenerating = false;
  let isFetchingRides = false;
  let rideStats: RideStats | null = null;

  let showHoursWarning = false;
  let showMileageWarning = false;
  let showStartDateWarning = false;
  let showEndDateWarning = false;

  function getDefaultStartDate(): string {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  }

  function getDefaultEndDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  async function fetchRideStats() {
    if (!isDriverRole) return;

    try {
      isFetchingRides = true;

      const response = await fetch(
        `${API_BASE_URL}/reports/rides/stats?start_date=${startDate}&end_date=${endDate}`,
        {
          headers: {
            'Authorization': `Bearer ${data.session.access_token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch ride statistics');
      }

      rideStats = await response.json();
    } catch (error) {
      console.error('Error fetching ride stats:', error);
      toastStore.error('Failed to load ride statistics');
      rideStats = null;
    } finally {
      isFetchingRides = false;
    }
  }

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

    if (manualHoursWorked < 0) {
      showHoursWarning = true;
      toastStore.error('Hours cannot be negative');
      isValid = false;
    }

    if (manualMileage < 0) {
      showMileageWarning = true;
      toastStore.error('Mileage cannot be negative');
      isValid = false;
    }

    if (!reportName.trim()) {
      toastStore.error('Please enter a report name');
      isValid = false;
    }

    return isValid;
  }

  function toggleRide(rideId: number) {
    if (selectedRideIds.has(rideId)) {
      selectedRideIds.delete(rideId);
    } else {
      selectedRideIds.add(rideId);
    }
    selectedRideIds = new Set(selectedRideIds); // Trigger reactivity
  }

  async function generateReport() {
    if (!validateForm()) return;

    if (isDriverRole && !rideStats) {
      await fetchRideStats();
    }

    generatePDF();
  }

  function generatePDF() {
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
      const roleText = `Role: ${selectedRole}`;
      const roleTextWidth = doc.getTextWidth(roleText);
      const roleLabelWidth = doc.getTextWidth('Role: ');
      const roleStartX = (pageWidth - roleTextWidth) / 2;
      doc.setFont('helvetica', 'bold');
      doc.text('Role:  ', roleStartX, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(selectedRole, roleStartX + roleLabelWidth, yPosition);
      
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

      // Summary Section
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
      doc.text(totalHours.toFixed(2), xPosition + boxWidth / 2, yPosition + 18, { align: 'center' });

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
      doc.text(`${totalMileage.toFixed(1)} mi`, xPosition + boxWidth / 2, yPosition + 18, { align: 'center' });

      if (isDriverRole && rideStats) {
        yPosition += boxHeight + boxSpacing;

        doc.setFillColor(168, 85, 247);
        doc.roundedRect(xPosition, yPosition, boxWidth, boxHeight, 3, 3, 'F');
        doc.setTextColor(255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Scheduled Rides', xPosition + boxWidth / 2, yPosition + 8, { align: 'center' });
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(rideStats.scheduled.toString(), xPosition + boxWidth / 2, yPosition + 18, { align: 'center' });

        yPosition += boxHeight + boxSpacing;

        doc.setFillColor(234, 88, 12);
        doc.roundedRect(xPosition, yPosition, boxWidth, boxHeight, 3, 3, 'F');
        doc.setTextColor(255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Completed Rides', xPosition + boxWidth / 2, yPosition + 8, { align: 'center' });
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(rideStats.completed.toString(), xPosition + boxWidth / 2, yPosition + 18, { align: 'center' });
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
      if (isDriverRole) {
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

  $: if (isDriverRole && startDate && endDate) {
    fetchRideStats();
  }

  $: if (manualHoursWorked >= 0) showHoursWarning = false;
  $: if (manualMileage >= 0) showMileageWarning = false;
  $: if (startDate) showStartDateWarning = false;
  $: if (endDate) showEndDateWarning = false;
  
  // Clear selected rides when role changes
  $: if (!isDriverRole) {
    selectedRideIds = new Set();
  }
</script>

<RoleGuard requiredRoles={['Admin', 'Driver', 'Dispatcher', 'Volunteer']}>
  <div class="min-h-screen bg-gray-50">
    <Breadcrumbs />
    
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Work Reports</h1>
        <p class="text-gray-600 mt-2">Generate a PDF report of your hours worked and mileage.</p>
      </div>

      <!-- Info Banner -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
        <AlertCircle class="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div class="text-sm text-blue-900">
          <p class="font-medium mb-1">How to use this report generator:</p>
          <ul class="list-disc list-inside space-y-1 text-blue-800">
            <li>Select which role you're reporting as</li>
            <li>Select the date range for your report period</li>
            {#if isDriverRole}
              <li>Optionally select completed rides to auto-fill hours and mileage</li>
            {/if}
            <li>Enter any additional hours and mileage not covered by rides</li>
            <li>Download your report as a PDF</li>
          </ul>
        </div>
      </div>
      
      <!-- Report Generator Card -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200">
        <div class="px-6 py-4 border-b border-gray-200">
          <div class="flex items-center gap-2">
            <FileText class="w-5 h-5 text-blue-600" />
            <h2 class="text-lg font-medium text-gray-900">Report Generator</h2>
          </div>
        </div>
        
        <div class="p-6 space-y-6">
          <!-- Role Selection -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Reporting As *
            </label>
            <select
              bind:value={selectedRole}
              class="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {#each userRoles as role}
                <option value={role}>{role}</option>
              {/each}
            </select>
            <p class="text-xs text-gray-500 mt-1">Select the role you're reporting work for</p>
          </div>

          <!-- Date Range Selection -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                <Calendar class="w-4 h-4 inline mr-1" />
                Start Date *
              </label>
              <input
                type="date"
                bind:value={startDate}
                class="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 {showStartDateWarning ? 'border-red-500 ring-2 ring-red-200' : ''}"
                required
              />
              {#if showStartDateWarning}
                <div class="flex items-center gap-1 mt-1 text-xs text-red-600">
                  <AlertTriangle class="w-3 h-3" />
                  <span>Start date is required</span>
                </div>
              {/if}
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                <Calendar class="w-4 h-4 inline mr-1" />
                End Date *
              </label>
              <input
                type="date"
                bind:value={endDate}
                class="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 {showEndDateWarning ? 'border-red-500 ring-2 ring-red-200' : ''}"
                required
              />
              {#if showEndDateWarning}
                <div class="flex items-center gap-1 mt-1 text-xs text-red-600">
                  <AlertTriangle class="w-3 h-3" />
                  <span>End date is required</span>
                </div>
              {/if}
            </div>
          </div>

          <!-- Completed Rides Selection (Driver only) -->
          {#if isDriverRole && filteredRides().length > 0}
            <div class="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 class="text-sm font-semibold text-purple-900 mb-3 flex items-center gap-2">
                <Car class="w-4 h-4" />
                Select Completed Rides
              </h3>
              <p class="text-xs text-purple-700 mb-3">
                Select rides to automatically include their hours and mileage in your report
              </p>
              
              <div class="space-y-2 max-h-60 overflow-y-auto">
                {#each filteredRides() as ride}
                  <label class="flex items-start gap-3 p-3 bg-white rounded-lg border border-purple-200 hover:border-purple-400 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedRideIds.has(ride.ride_id)}
                      onchange={() => toggleRide(ride.ride_id)}
                      class="mt-1 h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <div class="flex-1 text-sm">
                      <div class="font-medium text-gray-900">
                        {ride.clients ? `${ride.clients.first_name} ${ride.clients.last_name}` : 'Unknown Client'} → {ride.destination_name}
                      </div>
                      <div class="text-xs text-gray-600 mt-1">
                        {new Date(ride.appointment_time).toLocaleDateString()} • 
                        {ride.hours ? `${ride.hours}h` : '0h'} • 
                        {ride.miles_driven ? `${ride.miles_driven}mi` : '0mi'}
                      </div>
                    </div>
                  </label>
                {/each}
              </div>
              
              {#if selectedRideIds.size > 0}
                <div class="mt-3 pt-3 border-t border-purple-200">
                  <div class="text-sm text-purple-900">
                    <strong>{selectedRideIds.size}</strong> ride{selectedRideIds.size !== 1 ? 's' : ''} selected • 
                    <strong>{ridesHours().toFixed(2)}h</strong> • 
                    <strong>{ridesMileage().toFixed(1)}mi</strong>
                  </div>
                </div>
              {/if}
            </div>
          {/if}

          <!-- Manual Hours and Mileage Input -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                <Clock class="w-4 h-4 inline mr-1" />
                Additional Hours
              </label>
              <input
                type="number"
                bind:value={manualHoursWorked}
                min="0"
                step="0.5"
                placeholder="Enter hours (e.g., 5)"
                class="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 {showHoursWarning ? 'border-red-500 ring-2 ring-red-200' : ''}"
              />
              {#if isDriverRole && selectedRideIds.size > 0}
                <p class="text-xs text-gray-500 mt-1">
                  {ridesHours().toFixed(2)}h from rides + {manualHoursWorked}h manual = <strong>{totalHours.toFixed(2)}h total</strong>
                </p>
              {/if}
              {#if showHoursWarning}
                <div class="flex items-center gap-1 mt-1 text-xs text-red-600">
                  <AlertTriangle class="w-3 h-3" />
                  <span>Hours cannot be negative</span>
                </div>
              {/if}
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                <MapPin class="w-4 h-4 inline mr-1" />
                Additional Mileage
              </label>
              <input
                type="number"
                bind:value={manualMileage}
                min="0"
                step="0.1"
                placeholder="Enter miles (e.g., 50.5)"
                class="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 {showMileageWarning ? 'border-red-500 ring-2 ring-red-200' : ''}"
              />
              {#if isDriverRole && selectedRideIds.size > 0}
                <p class="text-xs text-gray-500 mt-1">
                  {ridesMileage().toFixed(1)}mi from rides + {manualMileage}mi manual = <strong>{totalMileage.toFixed(1)}mi total</strong>
                </p>
              {/if}
              {#if showMileageWarning}
                <div class="flex items-center gap-1 mt-1 text-xs text-red-600">
                  <AlertTriangle class="w-3 h-3" />
                  <span>Mileage cannot be negative</span>
                </div>
              {/if}
            </div>
          </div>

          <!-- Driver Ride Stats -->
          {#if isDriverRole}
            <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 class="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Car class="w-4 h-4" />
                Your Ride Statistics
                {#if isFetchingRides}
                  <span class="text-xs text-gray-500">(Loading...)</span>
                {/if}
              </h3>
              
              {#if rideStats}
                <div class="grid grid-cols-2 gap-4">
                  <div class="bg-white rounded-lg p-3 border border-gray-200">
                    <p class="text-xs text-gray-600 mb-1">Scheduled Rides</p>
                    <p class="text-2xl font-bold text-purple-600">{rideStats.scheduled}</p>
                  </div>
                  <div class="bg-white rounded-lg p-3 border border-gray-200">
                    <p class="text-xs text-gray-600 mb-1">Completed Rides</p>
                    <p class="text-2xl font-bold text-orange-600">{rideStats.completed}</p>
                  </div>
                </div>
                <p class="text-xs text-gray-500 mt-2">
                  Statistics automatically calculated for {formatDate(startDate)} - {formatDate(endDate)}
                </p>
              {:else if !isFetchingRides}
                <p class="text-sm text-gray-500">Select a date range to view ride statistics</p>
              {/if}
            </div>
          {/if}

          <!-- Report Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Report File Name *
            </label>
            <input
              type="text"
              bind:value={reportName}
              placeholder="Enter report name"
              class="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p class="text-xs text-gray-500 mt-1">This will be the name of your downloaded PDF file</p>
          </div>

          <!-- Generate Button -->
          <div class="pt-4">
            <button
              on:click={generateReport}
              disabled={isGenerating || (isDriverRole && isFetchingRides)}
              class="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <Download class="w-5 h-5" />
              <span>{isGenerating ? 'Generating PDF...' : 'Generate & Download Report'}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Preview Summary -->
      {#if totalHours >= 0 && totalMileage >= 0}
        <div class="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 class="text-sm font-semibold text-gray-900 mb-4">Report Preview</h3>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-{isDriverRole ? '4' : '2'} gap-4">
            <div class="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div class="flex items-center gap-2 mb-2">
                <Clock class="w-5 h-5 text-blue-600" />
                <span class="text-sm font-medium text-blue-900">Total Hours</span>
              </div>
              <p class="text-2xl font-bold text-blue-600">{totalHours.toFixed(2)}</p>
            </div>

            <div class="bg-green-50 rounded-lg p-4 border border-green-200">
              <div class="flex items-center gap-2 mb-2">
                <MapPin class="w-5 h-5 text-green-600" />
                <span class="text-sm font-medium text-green-900">Total Mileage</span>
              </div>
              <p class="text-2xl font-bold text-green-600">{totalMileage.toFixed(1)} mi</p>
            </div>

            {#if isDriverRole && rideStats}
              <div class="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <div class="flex items-center gap-2 mb-2">
                  <Car class="w-5 h-5 text-purple-600" />
                  <span class="text-sm font-medium text-purple-900">Scheduled</span>
                </div>
                <p class="text-2xl font-bold text-purple-600">{rideStats.scheduled}</p>
              </div>

              <div class="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <div class="flex items-center gap-2 mb-2">
                  <Car class="w-5 h-5 text-orange-600" />
                  <span class="text-sm font-medium text-orange-900">Completed</span>
                </div>
                <p class="text-2xl font-bold text-orange-600">{rideStats.completed}</p>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>
</RoleGuard>
