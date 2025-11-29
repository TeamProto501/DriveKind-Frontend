<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '$lib/components/ui/table';
  import { Label } from '$lib/components/ui/label';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { toastStore } from '$lib/toast';
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
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
  import PhoneCallIcon from "@lucide/svelte/icons/phone-call";
  import XIcon from "@lucide/svelte/icons/x";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import type { RideReportData } from './+page.server';

  let { data, form }: { data: PageData; form?: ActionData } = $props();

  // Tab state - initialize from URL or default to 'personal'
  const urlTab = $page.url.searchParams.get('tab');
  const initialTab = (urlTab === 'callLogs' || urlTab === 'organization' || urlTab === 'personal') 
    ? urlTab 
    : 'personal';
  let activeTab = $state<'personal' | 'organization' | 'callLogs'>(initialTab as any);

  // Personal Report State
  let selectedRole = $state<string>('');
  let personalHours = $state<number>(0);
  let personalMiles = $state<number>(0);
  let personalClients = $state<number>(0);
  let personalRides = $state<number>(0);
  let isLoadingPersonalRides = $state(false);
  let personalExportFileName = $state('');

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

  // Export filename customization
  let exportFileName = $state('');

  let globalFilter = $state('');
  let sortColumn = $state<string>('appointment_time');
  let sortDirection = $state<'asc' | 'desc'>('desc');
  
  // Column filters for results table
  let filterDriver = $state('');
  let filterClient = $state('');
  let filterPurpose = $state('');
  let filterDestination = $state('');
  let filterDateFrom = $state('');
  let filterDateTo = $state('');
  let showFilters = $state(false);

  let formElement: HTMLFormElement;

  const firstName = data.userProfile?.first_name || 'User';
  const lastName = data.userProfile?.last_name || 'Report';
  const organizationName = data.organization?.name || 'Organization';
  const isAdmin = data.isAdmin || false;

  // Get user's available roles
  const availableRoles = Array.isArray(data.userProfile?.role) 
    ? data.userProfile.role 
    : data.userProfile?.role ? [data.userProfile.role] : [];

  // Set default role
  if (availableRoles.length > 0 && !selectedRole) {
    selectedRole = availableRoles[0];
  }

  // Generate default filename based on selection
  function generateDefaultFileName() {
    const today = new Date();
    const dateStr = `${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}${today.getFullYear()}`;
    
    if (filterType === 'driver' && selectedId) {
      const driver = data.drivers.find(d => d.user_id === selectedId);
      if (driver) {
        return `${driver.first_name}_${driver.last_name} Monthly Report_${dateStr}`;
      }
    } else if (filterType === 'client' && selectedId) {
      const client = data.clients.find(c => c.client_id.toString() === selectedId);
      if (client) {
        return `${client.first_name}_${client.last_name} Monthly Report_${dateStr}`;
      }
    } else if (filterType === 'organization') {
      return `${organizationName.replace(/\s+/g, '_')} Monthly Report_${dateStr}`;
    }
    return `Report_${dateStr}`;
  }

  // Generate default filename for personal report
  function generatePersonalFileName() {
    const today = new Date();
    const dateStr = `${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}${today.getFullYear()}`;
    return `${firstName}_${lastName} Monthly Report_${dateStr}`;
  }

  // Handle personal rides response
  $effect(() => {
    if (form?.success && form.personalAutoFill) {
      personalHours = form.personalAutoFill.hours;
      personalMiles = form.personalAutoFill.miles;
      personalRides = form.personalAutoFill.rides;
      personalClients = form.personalAutoFill.clients;
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
      // Generate default filename when results load
      exportFileName = generateDefaultFileName();
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
      if (ride.driver_name) uniqueDrivers.add(ride.driver_name);
    });
    return Array.from(uniqueDrivers).sort();
  };

  const getUniqueClientOptions = () => {
    const uniqueClients = new Set<string>();
    rides.forEach(ride => {
      if (ride.client_name) uniqueClients.add(ride.client_name);
    });
    return Array.from(uniqueClients).sort();
  };

  const getUniquePurposeOptions = () => {
    const uniquePurposes = new Set<string>();
    rides.forEach(ride => {
      if (ride.purpose) uniquePurposes.add(ride.purpose);
    });
    return Array.from(uniquePurposes).sort();
  };

  const getUniqueDestinationOptions = () => {
    const uniqueDestinations = new Set<string>();
    rides.forEach(ride => {
      if (ride.destination_name) uniqueDestinations.add(ride.destination_name);
    });
    return Array.from(uniqueDestinations).sort();
  };

  const getFilteredRides = () => {
    let filtered = rides;

    // Apply column filters
    if (filterDriver) {
      filtered = filtered.filter(ride => ride.driver_name === filterDriver);
    }
    
    if (filterClient) {
      filtered = filtered.filter(ride => ride.client_name === filterClient);
    }
    
    if (filterPurpose) {
      filtered = filtered.filter(ride => ride.purpose === filterPurpose);
    }
    
    if (filterDestination) {
      filtered = filtered.filter(ride => ride.destination_name === filterDestination);
    }
    
    if (filterDateFrom) {
      const fromTimestamp = new Date(filterDateFrom).getTime();
      filtered = filtered.filter(ride => new Date(ride.appointment_time).getTime() >= fromTimestamp);
    }
    
    if (filterDateTo) {
      const toDate = new Date(filterDateTo);
      toDate.setDate(toDate.getDate() + 1);
      filtered = filtered.filter(ride => new Date(ride.appointment_time).getTime() < toDate.getTime());
    }

    // Apply global search
    if (globalFilter) {
      const searchLower = globalFilter.toLowerCase();
      filtered = filtered.filter(ride => 
        ride.driver_name?.toLowerCase().includes(searchLower) ||
        ride.client_name?.toLowerCase().includes(searchLower) ||
        ride.alt_pickup_address?.toLowerCase().includes(searchLower) ||
        ride.destination_name?.toLowerCase().includes(searchLower) ||
        ride.dropoff_address?.toLowerCase().includes(searchLower) ||
        ride.purpose?.toLowerCase().includes(searchLower)
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

  const clearAllFilters = () => {
    globalFilter = '';
    filterDriver = '';
    filterClient = '';
    filterPurpose = '';
    filterDestination = '';
    filterDateFrom = '';
    filterDateTo = '';
  };

  const hasActiveFilters = $derived(
    globalFilter || filterDriver || filterClient || filterPurpose || 
    filterDestination || filterDateFrom || filterDateTo
  );

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
      personalClients || 0,
      personalRides || 0,
      personalMiles.toFixed(1),
      `"${selectedRole}"`
    ];

    const csv = [headers.join(','), row.join(',')].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fileName = personalExportFileName || generatePersonalFileName();
    a.download = `${fileName.replace(/\s+/g, '_')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toastStore.success('Personal report exported');
  };

  // User CSV Export (for Driver reports) - renamed from Volunteer CSV
  const exportUserCSV = () => {
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
      const volTotalHours = v.hours + (additionalHours || 0);
      const volTotalMiles = v.miles + (additionalMiles || 0);
      
      return [
        `"${v.name}"`,
        volTotalHours.toFixed(2),
        v.clients.size,
        v.rides,
        volTotalMiles.toFixed(1),
        '"Driver"'
      ];
    });

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fileName = exportFileName || generateDefaultFileName();
    a.download = `${fileName.replace(/\s+/g, '_')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toastStore.success('User report exported');
  };

  // Client CSV Export (for Client reports) - Demographics Report
  const exportClientCSV = () => {
    if (rides.length === 0) {
      toastStore.error('No data to export');
      return;
    }

    // Get unique clients from rides
    const uniqueClientIds = new Set<number>();
    rides.forEach(ride => {
      if (ride.client_id) {
        uniqueClientIds.add(ride.client_id);
      }
    });

    // Get client details from data.clients
    const clientsInReport = data.clients.filter(c => uniqueClientIds.has(c.client_id));

    // Calculate demographics
    let maleCount = 0;
    let femaleCount = 0;
    let nonBinaryCount = 0;
    let unknownGenderCount = 0;

    let livesAloneYes = 0;
    let livesAloneNo = 0;
    let livesAloneUnknown = 0;

    let ageUnder40 = 0;
    let age40to54 = 0;
    let age55to59 = 0;
    let age60to64 = 0;
    let age65to74 = 0;
    let age75to84 = 0;
    let ageOver85 = 0;
    let ageUnknown = 0;

    const today = new Date();
    const currentYear = today.getFullYear();

    clientsInReport.forEach(client => {
      // Gender count
      const gender = (client.gender || '').toLowerCase();
      if (gender === 'male' || gender === 'm') {
        maleCount++;
      } else if (gender === 'female' || gender === 'f') {
        femaleCount++;
      } else if (gender === 'non-binary' || gender === 'nonbinary' || gender === 'nb') {
        nonBinaryCount++;
      } else {
        unknownGenderCount++;
      }

      // Lives alone count
      if (client.lives_alone === true) {
        livesAloneYes++;
      } else if (client.lives_alone === false) {
        livesAloneNo++;
      } else {
        livesAloneUnknown++;
      }

      // Age range count
      if (client.date_of_birth) {
        const birthDate = new Date(client.date_of_birth);
        const age = currentYear - birthDate.getFullYear();
        
        if (age < 40) {
          ageUnder40++;
        } else if (age >= 40 && age <= 54) {
          age40to54++;
        } else if (age >= 55 && age <= 59) {
          age55to59++;
        } else if (age >= 60 && age <= 64) {
          age60to64++;
        } else if (age >= 65 && age <= 74) {
          age65to74++;
        } else if (age >= 75 && age <= 84) {
          age75to84++;
        } else if (age >= 85) {
          ageOver85++;
        } else {
          ageUnknown++;
        }
      } else {
        ageUnknown++;
      }
    });

    const totalClients = clientsInReport.length;

    // Create CSV content
    const csvLines = [
      `Station Name,${organizationName}`,
      `Report Period,${fromDate || 'N/A'} to ${toDate || 'N/A'}`,
      ``,
      `1. Unduplicated Clients by Gender`,
      `Male,Female,Non-Binary,Unknown,TOTAL`,
      `${maleCount},${femaleCount},${nonBinaryCount},${unknownGenderCount},${totalClients}`,
      ``,
      `2. Lives Alone`,
      `Yes,No,Unknown,TOTAL`,
      `${livesAloneYes},${livesAloneNo},${livesAloneUnknown},${totalClients}`,
      ``,
      `3. Age Range`,
      `Under 40,40-54,55-59,60-64,65-74,75-84,Over 85,Unknown,TOTAL`,
      `${ageUnder40},${age40to54},${age55to59},${age60to64},${age65to74},${age75to84},${ageOver85},${ageUnknown},${totalClients}`
    ];

    const csvContent = csvLines.join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fileName = exportFileName || generateDefaultFileName();
    a.download = `${fileName.replace(/\s+/g, '_')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toastStore.success('Client demographics report exported');
  };

  // Table Results CSV Export - exports the current filtered/searched view
  const exportTableResultsCSV = () => {
    const filteredRides = getFilteredRides();
    
    if (filteredRides.length === 0) {
      toastStore.error('No data to export');
      return;
    }

    const headers = ['Date', 'Driver', 'Client', 'Purpose', 'Pickup', 'Destination', 'Hours', 'Miles', 'Donation'];
    const csvContent = [
      headers.join(','),
      ...filteredRides.map(ride => {
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
    const fileName = exportFileName || generateDefaultFileName();
    a.download = `${fileName.replace(/\s+/g, '_')}_Table_Results.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toastStore.success(`Exported ${filteredRides.length} rides to CSV`);
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
    exportFileName = '';
    globalFilter = '';
    filterDriver = '';
    filterClient = '';
    filterPurpose = '';
    filterDestination = '';
    filterDateFrom = '';
    filterDateTo = '';
    showFilters = false;
    sortColumn = 'appointment_time';
    sortDirection = 'desc';
  });

  // -----------------------------
  // CALL LOGS TAB STATE
  // -----------------------------

  type CallRowFromServer = {
    call_id: number;
    user_id: string | null;
    client_id: number | null;
    org_id: number | null;
    call_type: string | null;
    call_time: string | null;
    other_type: string | null;
    phone_number: string | null;
    forwarded_to_name: string | null;
    caller_first_name: string | null;
    caller_last_name: string | null;
  };

  type DisplayCallRow = {
    call_id: number;
    dispatcher: string;
    client: string;
    caller_name: string;
    call_time: string | null;
    phone_number: string | null;
    call_type: string | null;
    other_type: string | null;
    forwarded_to_name: string | null;
  };

  const CALL_TYPE_OPTIONS = [
    "Ride Request",
    "Cancelled Ride",
    "Hasnt heard from driver",
    "Prospective Volunteer",
    "Other",
  ];

  // Get calls data from server
  let rawCallRows = $derived(((data as any).calls ?? []) as CallRowFromServer[]);
  let staffProfilesForCalls = $derived(((data as any).staffProfiles ?? []) as any[]);
  let clientsForCalls = $derived(((data as any).callClients ?? []) as any[]);

  // Helper functions
  function formatCallTime(dt: string | null): string | null {
    if (!dt) return null;
    const isoish = dt.replace(" ", "T");
    const d = new Date(isoish);
    if (Number.isNaN(d.getTime())) return dt;
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function toMillis(dt: string | null): number {
    if (!dt) return 0;
    const isoish = dt.replace(" ", "T");
    const t = Date.parse(isoish);
    return Number.isNaN(t) ? 0 : t;
  }

  function getNowLocal(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  }

  // Create maps for lookup
  let staffById = $derived.by(() => {
    const map = new Map<string, any>();
    for (const sp of staffProfilesForCalls) {
      if (sp.user_id) map.set(sp.user_id, sp);
    }
    return map;
  });

  let clientById = $derived.by(() => {
    const map = new Map<number, any>();
    for (const c of clientsForCalls) {
      if (c.client_id != null) map.set(c.client_id, c);
    }
    return map;
  });

  // Sort calls by time descending
  let sortedCallRows = $derived(
    [...rawCallRows].sort(
      (a, b) => toMillis(b.call_time) - toMillis(a.call_time)
    )
  );

  // Build display rows
  let displayCallRows = $derived.by(() => {
    return sortedCallRows.map((row) => {
      const dispatcher = row.user_id ? staffById.get(row.user_id) : undefined;
      const dispatcherName = dispatcher
        ? `${dispatcher.first_name ?? ""} ${dispatcher.last_name ?? ""}`.trim()
        : row.user_id ?? "";

      const client =
        row.client_id != null ? clientById.get(row.client_id) : undefined;
      const clientName = client
        ? `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim()
        : "";

      const manualCallerName = `${row.caller_first_name ?? ""} ${
        row.caller_last_name ?? ""
      }`.trim();

      const callerName = clientName || manualCallerName;

      return {
        call_id: row.call_id,
        dispatcher: dispatcherName,
        client: clientName,
        caller_name: callerName,
        call_time: formatCallTime(row.call_time),
        phone_number: row.phone_number,
        call_type: row.call_type,
        other_type: row.other_type,
        forwarded_to_name: row.forwarded_to_name,
      };
    });
  });

  // Create Call Modal State
  let showCreateCallModal = $state(false);
  let newSelectedDispatcherId = $state("");
  let newSelectedClientId = $state("");
  let newCallTimeLocal = $state("");
  let newPhoneNumber = $state("");
  let newCallType = $state("");
  let newOtherType = $state("");
  let newForwardedToName = $state("");
  let newCallerFirstName = $state("");
  let newCallerLastName = $state("");

  let newCallerLockedToClient = $derived(!!newSelectedClientId);

  // Options for dropdowns
  let dispatcherOptions = $derived(
    staffProfilesForCalls.map((sp) => {
      const name = `${sp.first_name ?? ""} ${sp.last_name ?? ""}`.trim();
      return {
        value: sp.user_id,
        label: name || sp.user_id
      };
    })
  );

  let clientOptions = $derived(
    clientsForCalls.map((c) => {
      const name = `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim();
      return {
        value: String(c.client_id),
        label: name || `Client #${c.client_id}`
      };
    })
  );

  function openCreateCall() {
    newSelectedDispatcherId = "";
    newSelectedClientId = "";
    newCallTimeLocal = getNowLocal();
    newPhoneNumber = "";
    newCallType = "";
    newOtherType = "";
    newForwardedToName = "";
    newCallerFirstName = "";
    newCallerLastName = "";
    showCreateCallModal = true;
  }

  function closeCreateCall() {
    showCreateCallModal = false;
  }

  function handleNewClientChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    newSelectedClientId = select.value;

    if (!newSelectedClientId) {
      return;
    }

    const client = clientById.get(Number(newSelectedClientId));
    if (client) {
      newCallerFirstName = client.first_name ?? "";
      newCallerLastName = client.last_name ?? "";
      if (client.primary_phone) {
        newPhoneNumber = client.primary_phone;
      }
    }
  }

  // Handle form submission response
  $effect(() => {
    if (form?.error && activeTab === 'callLogs') {
      toastStore.error(form.error);
      showCreateCallModal = true; // Keep modal open on error
    }
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
            onclick={() => { activeTab = 'personal'; goto('?tab=personal', { replaceState: true }); }}
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
              onclick={() => { activeTab = 'organization'; goto('?tab=organization', { replaceState: true }); }}
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
          <button
            onclick={() => { activeTab = 'callLogs'; goto('?tab=callLogs', { replaceState: true }); }}
            class={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'callLogs'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <PhoneCallIcon class="w-4 h-4 inline mr-2" />
            Call Logs
          </button>
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

            <!-- Driver Auto-fill from Rides -->
            {#if selectedRole === 'Driver'}
              <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 class="text-sm font-medium text-blue-900 mb-2 flex items-center gap-2">
                  <CarIcon class="w-4 h-4" />
                  Auto-fill from Your Rides
                </h3>
                <p class="text-xs text-blue-700 mb-3">
                  Load your completed rides from the past month to auto-populate hours, miles, and ride counts
                </p>
                
                <form
                  method="POST"
                  action="?/getPersonalDriverRides"
                  use:enhance={() => {
                    isLoadingPersonalRides = true;
                    return async ({ update }) => {
                      isLoadingPersonalRides = false;
                      await update();
                    };
                  }}
                >
                  <Button type="submit" disabled={isLoadingPersonalRides} class="w-full" variant="outline">
                    {#if isLoadingPersonalRides}
                      <LoaderIcon class="w-4 h-4 mr-2 animate-spin" />
                      Loading Rides...
                    {:else}
                      <CarIcon class="w-4 h-4 mr-2" />
                      Load My Rides (Past Month)
                    {/if}
                  </Button>
                </form>
              </div>
              <div class="border-t pt-4" />
            {/if}

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
                  {#if selectedRole === 'Driver'}
                    <div>
                      <p class="text-xs text-gray-500">Clients Served</p>
                      <p class="font-medium text-purple-600">{personalClients}</p>
                    </div>
                    <div>
                      <p class="text-xs text-gray-500">One-way Rides</p>
                      <p class="font-medium text-orange-600">{personalRides}</p>
                    </div>
                  {/if}
                </div>
              </div>
            {/if}

            <!-- Filename customization for personal report -->
            <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <Label class="text-sm font-medium mb-2 block">Export Filename</Label>
              <Input
                bind:value={personalExportFileName}
                placeholder={generatePersonalFileName()}
                class="text-sm"
              />
              <p class="text-xs text-gray-500 mt-1">Customize the filename for your export (without extension)</p>
            </div>

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

                <!-- Additional Hours/Miles (only for Driver reports) -->
                {#if filterType === 'driver'}
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
                {/if}
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
                    <Button variant="outline" onclick={exportTableResultsCSV} size="sm">
                      <DownloadIcon class="h-4 w-4 mr-2" />
                      Table Results CSV
                    </Button>
                    {#if filterType === 'driver'}
                      <Button variant="outline" onclick={exportUserCSV} size="sm">
                        <DownloadIcon class="h-4 w-4 mr-2" />
                        User Report CSV
                      </Button>
                    {:else if filterType === 'client'}
                      <Button variant="outline" onclick={exportClientCSV} size="sm">
                        <DownloadIcon class="h-4 w-4 mr-2" />
                        Client Report CSV
                      </Button>
                    {:else}
                      <!-- Organization - show both -->
                      <Button variant="outline" onclick={exportUserCSV} size="sm">
                        <DownloadIcon class="h-4 w-4 mr-2" />
                        User Report CSV
                      </Button>
                      <Button variant="outline" onclick={exportClientCSV} size="sm">
                        <UserIcon class="h-4 w-4 mr-2" />
                        Client Report CSV
                      </Button>
                    {/if}
                  </div>
                {/if}
              </CardHeader>
              
              {#if rides.length > 0}
                <CardContent class="space-y-4">
                  <!-- Filename customization -->
                  <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <Label class="text-sm font-medium mb-2 block">Export Filename</Label>
                    <Input
                      bind:value={exportFileName}
                      placeholder={generateDefaultFileName()}
                      class="text-sm"
                    />
                    <p class="text-xs text-gray-500 mt-1">Customize the filename for your export (without extension)</p>
                  </div>

                  <div class="flex items-center gap-4">
                    <div class="flex items-center gap-2">
                      <SearchIcon class="h-4 w-4 text-gray-500" />
                      <Input
                        placeholder="Search all columns..."
                        bind:value={globalFilter}
                        class="max-w-sm"
                      />
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onclick={() => showFilters = !showFilters}
                    >
                      {showFilters ? 'Hide Filters' : 'Show Filters'}
                    </Button>
                    {#if hasActiveFilters}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onclick={clearAllFilters}
                        class="text-red-600 hover:text-red-700"
                      >
                        Clear All Filters
                      </Button>
                    {/if}
                  </div>

                  <!-- Expanded Filters -->
                  {#if showFilters}
                    <div class="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-4">
                      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <Label class="text-xs text-gray-500 mb-1 block">Driver</Label>
                          <select
                            bind:value={filterDriver}
                            class="w-full px-3 py-2 border rounded-md text-sm"
                          >
                            <option value="">All Drivers</option>
                            {#each getUniqueDriverOptions() as driverName}
                              <option value={driverName}>{driverName}</option>
                            {/each}
                          </select>
                        </div>
                        <div>
                          <Label class="text-xs text-gray-500 mb-1 block">Client</Label>
                          <select
                            bind:value={filterClient}
                            class="w-full px-3 py-2 border rounded-md text-sm"
                          >
                            <option value="">All Clients</option>
                            {#each getUniqueClientOptions() as clientName}
                              <option value={clientName}>{clientName}</option>
                            {/each}
                          </select>
                        </div>
                        <div>
                          <Label class="text-xs text-gray-500 mb-1 block">Purpose</Label>
                          <select
                            bind:value={filterPurpose}
                            class="w-full px-3 py-2 border rounded-md text-sm"
                          >
                            <option value="">All Purposes</option>
                            {#each getUniquePurposeOptions() as purpose}
                              <option value={purpose}>{purpose}</option>
                            {/each}
                          </select>
                        </div>
                        <div>
                          <Label class="text-xs text-gray-500 mb-1 block">Destination</Label>
                          <select
                            bind:value={filterDestination}
                            class="w-full px-3 py-2 border rounded-md text-sm"
                          >
                            <option value="">All Destinations</option>
                            {#each getUniqueDestinationOptions() as destination}
                              <option value={destination}>{destination}</option>
                            {/each}
                          </select>
                        </div>
                        <div>
                          <Label class="text-xs text-gray-500 mb-1 block">Date From</Label>
                          <input
                            type="date"
                            bind:value={filterDateFrom}
                            class="w-full px-3 py-2 border rounded-md text-sm"
                          />
                        </div>
                        <div>
                          <Label class="text-xs text-gray-500 mb-1 block">Date To</Label>
                          <input
                            type="date"
                            bind:value={filterDateTo}
                            class="w-full px-3 py-2 border rounded-md text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  {/if}

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

      <!-- CALL LOGS TAB -->
      {#if activeTab === 'callLogs'}
        <div class="space-y-4">
          <div class="flex justify-between items-center">
            <div>
              <h2 class="text-base font-semibold text-gray-900">Call Logs</h2>
              <p class="text-sm text-gray-600 mt-1">View and log all incoming and outgoing calls</p>
            </div>
            <Button onclick={openCreateCall}>
              <PlusIcon class="w-4 h-4 mr-2" />
              Add Call
            </Button>
          </div>

          <Card>
            <CardContent class="pt-6">
              {#if displayCallRows.length > 0}
                <div class="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Call ID</TableHead>
                        <TableHead>Dispatcher</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Caller Name</TableHead>
                        <TableHead>Call Time</TableHead>
                        <TableHead>Phone Number</TableHead>
                        <TableHead>Call Type</TableHead>
                        <TableHead>Other Type</TableHead>
                        <TableHead>Forwarded To</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {#each displayCallRows as call}
                        <TableRow>
                          <TableCell class="font-medium">{call.call_id}</TableCell>
                          <TableCell>{call.dispatcher || 'N/A'}</TableCell>
                          <TableCell>{call.client || 'N/A'}</TableCell>
                          <TableCell>{call.caller_name || 'N/A'}</TableCell>
                          <TableCell>{call.call_time || 'N/A'}</TableCell>
                          <TableCell>{call.phone_number || 'N/A'}</TableCell>
                          <TableCell>{call.call_type || 'N/A'}</TableCell>
                          <TableCell>{call.other_type || 'N/A'}</TableCell>
                          <TableCell>{call.forwarded_to_name || 'N/A'}</TableCell>
                        </TableRow>
                      {/each}
                    </TableBody>
                  </Table>
                </div>
              {:else}
                <div class="text-center py-8">
                  <PhoneCallIcon class="h-12 w-12 mx-auto text-gray-400" />
                  <h3 class="mt-4 text-lg font-medium">No calls logged</h3>
                  <p class="text-gray-600">
                    Get started by adding your first call log.
                  </p>
                </div>
              {/if}
            </CardContent>
          </Card>
        </div>
      {/if}
    </div>
  </div>
</RoleGuard>

<!-- CREATE CALL MODAL -->
{#if showCreateCallModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
    <div class="w-full max-w-xl rounded-lg bg-white p-6 shadow-lg">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-lg font-semibold">
          Add Call
        </h3>
        <button
          type="button"
          class="text-gray-400 hover:text-gray-600"
          onclick={closeCreateCall}
        >
          <XIcon class="h-5 w-5" />
        </button>
      </div>

      <form method="POST" action="?/createCall" use:enhance class="space-y-4">
        <!-- Dispatcher / Client selects -->
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label class="block text-sm font-medium text-gray-700 mb-1">
              Dispatcher *
            </Label>
            <select
              name="user_id"
              bind:value={newSelectedDispatcherId}
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">
                — Select dispatcher —
              </option>
              {#each dispatcherOptions as opt}
                <option value={opt.value}>{opt.label}</option>
              {/each}
            </select>
          </div>

          <div>
            <Label class="block text-sm font-medium text-gray-700 mb-1">
              Client (optional)
            </Label>
            <select
              name="client_id"
              bind:value={newSelectedClientId}
              onchange={handleNewClientChange}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">
                — No client selected —
              </option>
              {#each clientOptions as opt}
                <option value={opt.value}>{opt.label}</option>
              {/each}
            </select>
          </div>
        </div>

        <!-- Call time -->
        <div>
          <Label class="block text-sm font-medium text-gray-700 mb-1">
            Call Time *
          </Label>
          <input
            type="datetime-local"
            name="call_time"
            bind:value={newCallTimeLocal}
            max={getNowLocal()}
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <!-- Phone / Call Type -->
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label class="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </Label>
            <Input
              type="text"
              name="phone_number"
              bind:value={newPhoneNumber}
              placeholder="(555) 123-4567"
            />
          </div>
          <div>
            <Label class="block text-sm font-medium text-gray-700 mb-1">
              Call Type *
            </Label>
            <select
              name="call_type"
              bind:value={newCallType}
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">
                — Select call type —
              </option>
              {#each CALL_TYPE_OPTIONS as opt}
                <option value={opt}>{opt}</option>
              {/each}
            </select>
          </div>
        </div>

        <!-- Other type / Forwarded to -->
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            {#if newCallType === "Other"}
              <Label class="block text-sm font-medium text-gray-700 mb-1">
                Other Type
              </Label>
              <Input
                type="text"
                name="other_type"
                bind:value={newOtherType}
                placeholder="Specify other type..."
              />
            {:else}
              <input type="hidden" name="other_type" value={newOtherType} />
            {/if}
          </div>
          <div>
            <Label class="block text-sm font-medium text-gray-700 mb-1">
              Forwarded To (Name)
            </Label>
            <Input
              type="text"
              name="forwarded_to_name"
              bind:value={newForwardedToName}
              placeholder="Name if forwarded..."
            />
          </div>
        </div>

        <!-- Caller name (manual vs client) -->
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label class="block text-sm font-medium text-gray-700 mb-1">
              Caller First Name {newCallerLockedToClient ? '' : '*'}
            </Label>
            <Input
              type="text"
              name="caller_first_name"
              bind:value={newCallerFirstName}
              disabled={newCallerLockedToClient}
              required={!newCallerLockedToClient}
              placeholder="First name"
            />
          </div>
          <div>
            <Label class="block text-sm font-medium text-gray-700 mb-1">
              Caller Last Name {newCallerLockedToClient ? '' : '*'}
            </Label>
            <Input
              type="text"
              name="caller_last_name"
              bind:value={newCallerLastName}
              disabled={newCallerLockedToClient}
              required={!newCallerLockedToClient}
              placeholder="Last name"
            />
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onclick={closeCreateCall}
          >
            Cancel
          </Button>
          <Button
            type="submit"
          >
            Create Call
          </Button>
        </div>
      </form>
    </div>
  </div>
{/if}