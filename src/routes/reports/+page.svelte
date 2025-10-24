<script lang="ts">
  import RoleGuard from '$lib/components/RoleGuard.svelte';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import { Download, Calendar, FileText, Clock, MapPin, Car, AlertCircle } from '@lucide/svelte';
  import { API_BASE_URL } from '$lib/api';
  import { toastStore } from '$lib/toast';
  import type { PageData } from './$types';
  import jsPDF from 'jspdf';

  export let data: PageData;

  type RideStats = {
    scheduled: number;
    completed: number;
    total: number;
  };

  let startDate = getDefaultStartDate();
  let endDate = getDefaultEndDate();
  let hoursWorked: number | null = null;
  let mileage: number | null = null;
  let reportName = `${data.userProfile.first_name}_${data.userProfile.last_name}_Report`;
  let isGenerating = false;
  let isFetchingRides = false;
  let rideStats: RideStats | null = null;

  const userRole = Array.isArray(data.userProfile.role) 
    ? data.userProfile.role[0] 
    : data.userProfile.role;
  const isDriver = userRole === 'Driver';

  function getDefaultStartDate(): string {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  }

  function getDefaultEndDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  async function fetchRideStats() {
    if (!isDriver) return;

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
    if (!startDate || !endDate) {
      toastStore.error('Please select both start and end dates');
      return false;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toastStore.error('Start date must be before end date');
      return false;
    }

    if (hoursWorked === null || hoursWorked < 0) {
      toastStore.error('Please enter valid hours worked');
      return false;
    }

    if (mileage === null || mileage < 0) {
      toastStore.error('Please enter valid mileage');
      return false;
    }

    if (!reportName.trim()) {
      toastStore.error('Please enter a report name');
      return false;
    }

    return true;
  }

  async function generateReport() {
    if (!validateForm()) return;

    // Fetch ride stats for drivers if not already fetched
    if (isDriver && !rideStats) {
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
      doc.text(`${data.userProfile.first_name} ${data.userProfile.last_name}`, pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 8;
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`${userRole}`, pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 8;
      doc.text(`Report Period: ${formatDate(startDate)} - ${formatDate(endDate)}`, pageWidth / 2, yPosition, { align: 'center' });
      
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

      // Summary boxes
      const boxWidth = isDriver ? 85 : 85;
      const boxHeight = 25;
      const boxSpacing = 10;
      let xPosition = isDriver ? 15 : 30;

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

      xPosition += boxWidth + boxSpacing;

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

      // Driver-specific metrics (rides)
      if (isDriver && rideStats) {
        yPosition += boxHeight + boxSpacing;
        xPosition = 15;

        // Scheduled Rides Box
        doc.setFillColor(168, 85, 247);
        doc.roundedRect(xPosition, yPosition, boxWidth, boxHeight, 3, 3, 'F');
        doc.setTextColor(255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Scheduled Rides', xPosition + boxWidth / 2, yPosition + 8, { align: 'center' });
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(rideStats.scheduled.toString(), xPosition + boxWidth / 2, yPosition + 18, { align: 'center' });

        xPosition += boxWidth + boxSpacing;

        // Completed Rides Box
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

      yPosition += boxHeight + 25;

      // Details Section
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0);
      doc.text('Report Details', 20, yPosition);

      yPosition += 12;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60);

      // Report period
      doc.setFont('helvetica', 'bold');
      doc.text('Report Period:', 25, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(`${formatDate(startDate)} - ${formatDate(endDate)}`, 70, yPosition);

      yPosition += 8;

      // Hours worked
      doc.setFont('helvetica', 'bold');
      doc.text('Hours Worked:', 25, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(`${hoursWorked!.toFixed(2)} hours`, 70, yPosition);

      yPosition += 8;

      // Mileage
      doc.setFont('helvetica', 'bold');
      doc.text('Total Mileage:', 25, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(`${mileage!.toFixed(1)} miles`, 70, yPosition);

      if (isDriver && rideStats) {
        yPosition += 8;
        doc.setFont('helvetica', 'bold');
        doc.text('Scheduled Rides:', 25, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.text(`${rideStats.scheduled} rides`, 70, yPosition);

        yPosition += 8;
        doc.setFont('helvetica', 'bold');
        doc.text('Completed Rides:', 25, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.text(`${rideStats.completed} rides`, 70, yPosition);
      }

      yPosition += 15;

      // Note section
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(20, yPosition, pageWidth - 40, 25, 2, 2, 'F');
      yPosition += 8;
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.setFont('helvetica', 'italic');
      doc.text('Note: Hours and mileage values are self-reported by the user.', 25, yPosition);
      if (isDriver) {
        yPosition += 6;
        doc.text('Ride statistics are automatically calculated from system records.', 25, yPosition);
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

      // Save PDF
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

  // Auto-fetch ride stats when dates change (for drivers)
  $: if (isDriver && startDate && endDate) {
    fetchRideStats();
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
            <li>Select the date range for your report period</li>
            <li>Enter the total hours you worked during this period</li>
            <li>Enter the total mileage you tracked during this period</li>
            {#if isDriver}
              <li>Your ride statistics will be automatically calculated from system records</li>
            {/if}
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
                class="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                <Calendar class="w-4 h-4 inline mr-1" />
                End Date *
              </label>
              <input
                type="date"
                bind:value={endDate}
                class="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          <!-- Hours and Mileage Input -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                <Clock class="w-4 h-4 inline mr-1" />
                Total Hours Worked *
              </label>
              <input
                type="number"
                bind:value={hoursWorked}
                min="0"
                step="0.5"
                placeholder="Enter hours (e.g., 30)"
                class="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                <MapPin class="w-4 h-4 inline mr-1" />
                Total Mileage *
              </label>
              <input
                type="number"
                bind:value={mileage}
                min="0"
                step="0.1"
                placeholder="Enter miles (e.g., 150)"
                class="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          <!-- Driver Ride Stats (Auto-populated) -->
          {#if isDriver}
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
              disabled={isGenerating || (isDriver && isFetchingRides)}
              class="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <Download class="w-5 h-5" />
              <span>{isGenerating ? 'Generating PDF...' : 'Generate & Download Report'}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Preview Summary (if values entered) -->
      {#if hoursWorked !== null && mileage !== null && hoursWorked >= 0 && mileage >= 0}
        <div class="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 class="text-sm font-semibold text-gray-900 mb-4">Report Preview</h3>
          
          <div class="grid grid-cols-2 md:grid-cols-{isDriver ? '4' : '2'} gap-4">
            <!-- Total Hours -->
            <div class="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div class="flex items-center gap-2 mb-2">
                <Clock class="w-5 h-5 text-blue-600" />
                <span class="text-sm font-medium text-blue-900">Total Hours</span>
              </div>
              <p class="text-2xl font-bold text-blue-600">
                {hoursWorked.toFixed(2)}
              </p>
            </div>

            <!-- Total Mileage -->
            <div class="bg-green-50 rounded-lg p-4 border border-green-200">
              <div class="flex items-center gap-2 mb-2">
                <MapPin class="w-5 h-5 text-green-600" />
                <span class="text-sm font-medium text-green-900">Total Mileage</span>
              </div>
              <p class="text-2xl font-bold text-green-600">
                {mileage.toFixed(1)} mi
              </p>
            </div>

            {#if isDriver && rideStats}
              <!-- Scheduled Rides -->
              <div class="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <div class="flex items-center gap-2 mb-2">
                  <Car class="w-5 h-5 text-purple-600" />
                  <span class="text-sm font-medium text-purple-900">Scheduled</span>
                </div>
                <p class="text-2xl font-bold text-purple-600">
                  {rideStats.scheduled}
                </p>
              </div>

              <!-- Completed Rides -->
              <div class="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <div class="flex items-center gap-2 mb-2">
                  <Car class="w-5 h-5 text-orange-600" />
                  <span class="text-sm font-medium text-orange-900">Completed</span>
                </div>
                <p class="text-2xl font-bold text-orange-600">
                  {rideStats.completed}
                </p>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>
</RoleGuard>
