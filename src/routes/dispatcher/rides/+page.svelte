<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Card } from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import Textarea from "$lib/components/ui/textarea.svelte";
  import {
    Car,
    Clock,
    MapPin,
    User,
    Phone,
    Calendar,
    Search,
    Plus,
    Edit,
    AlertCircle,
    UserCheck,
    CheckCircle,
    FileText
  } from "@lucide/svelte";
  import { invalidateAll } from "$app/navigation";
  import { onMount } from "svelte";
  import type { PageData } from "./$types";
  import DriverMatchModal from "$lib/components/DriverMatchModal.svelte";
  import {
    validateAddress,
    validateCity,
    validateState,
    validateZipCode,
    validateRequired,
    validateDateTime,
    sanitizeInput,
    combineValidations,
  } from "$lib/utils/validation";
  import { page } from "$app/stores"; 

  let { data }: { data: PageData } = $props();

  let searchTerm = $state("");
  let activeTab = $state("requested");
  onMount(() => {});

  let isUpdating = $state(false);
  let showCreateModal = $state(false);
  let showEditModal = $state(false);
  let showDriverMatchModal = $state(false);
  let selectedRide: any = null;
  let selectedRideForMatch: any = null;
  let editRideIdFromUrl = $state<number | null>(null);

  const dispatcherName = $derived(() =>
    data?.profile ? `${data.profile.first_name} ${data.profile.last_name}` : ""
  );

  const isEditing = $derived(() => !!selectedRide && showEditModal);
  const userOrgId: number | null = data?.profile?.org_id ?? null;

  const filteredCalls = $derived(() => {
    const all = data?.calls ?? [];
    return userOrgId ? all.filter((c: any) => c.org_id === userOrgId) : all;
  });

  const STATUS_OPTIONS = [
    "Requested",
    "Scheduled",
    "Assigned",
    "In Progress",
    "Completed",
    "Cancelled",
    "Pending",
  ];
  const COMPLETION_STATUS_OPTIONS = [
    "Completed Round Trip",
    "Completed One Way To",
    "Completed One Way From",
    "Cancelled by Client",
    "Cancelled by Driver",
  ];

  const filteredClients = $derived(() => {
    const all = data?.clients ?? [];
    return userOrgId ? all.filter((c: any) => c.org_id === userOrgId) : all;
  });

  let filteredRides = $derived(() => {
    if (!data.rides) return [];
    return data.rides.filter((ride: any) => {
      const clientName = ride.clients
        ? `${ride.clients.first_name} ${ride.clients.last_name}`
        : "Unknown Client";
      const driverName = ride.drivers
        ? `${ride.drivers.first_name} ${ride.drivers.last_name}`
        : "";
      const matches =
        clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ride.destination_name
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (ride.alt_pickup_address &&
          ride.alt_pickup_address
            .toLowerCase()
            .includes(searchTerm.toLowerCase())) ||
        driverName.toLowerCase().includes(searchTerm.toLowerCase());
      let matchesTab = false;
      if (activeTab === "requested") matchesTab = ride.status === "Requested";
      else if (activeTab === "active")
        matchesTab = ["Scheduled", "Assigned", "In Progress"].includes(
          ride.status
        );
      else if (activeTab === "completed")
        matchesTab = ["Completed", "Cancelled"].includes(ride.status);
      return matches && matchesTab;
    });
  });

  let rideCounts = $derived(() => {
    if (!data.rides) return { requested: 0, active: 0, completed: 0 };
    return {
      requested: data.rides.filter((r: any) => r.status === "Requested").length,
      active: data.rides.filter((r: any) =>
        ["Scheduled", "Assigned", "In Progress"].includes(r.status)
      ).length,
      completed: data.rides.filter((r: any) =>
        ["Completed", "Cancelled"].includes(r.status)
      ).length,
    };
  });

  function getStatusColor(status: string) {
    switch (status) {
      case "Requested":
        return "bg-gray-100 text-gray-800";
      case "Scheduled":
        return "bg-blue-100 text-blue-800";
      case "Assigned":
        return "bg-yellow-100 text-yellow-800";
      case "In Progress":
        return "bg-orange-100 text-orange-800";
      case "Completed":
        return "bg-green-100 text-green-800";
      case "Cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }
  const formatDate = (ts: string) => new Date(ts).toLocaleDateString();
  const formatTime = (ts: string) =>
    new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const getClientName = (ride: any) =>
    ride.clients
      ? `${ride.clients.first_name} ${ride.clients.last_name}`
      : "Unknown Client";
  const getClientPhone = (ride: any) =>
    ride.clients?.primary_phone || "No phone";
  const getDriverName = (ride: any) =>
    ride.drivers
      ? `${ride.drivers.first_name} ${ride.drivers.last_name}`
      : "Unassigned";

  /* ---------------- Searchable Client Picker ---------------- */
  let clientQueryCreate = $state("");
  let clientQueryEdit = $state("");
  let showClientListCreate = $state(false);
  let showClientListEdit = $state(false);

  function norm(s: unknown) {
    return (s ?? "").toString().toLowerCase().trim();
  }
  function fullName(c: any) {
    return `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim();
  }

  function formatAddress(c: any) {
    const parts = [
      c.street_address ?? "",
      c.address2 ?? "",
      c.city ?? "",
      c.state ?? "",
      c.zip_code ?? "",
    ]
      .map((p) => (p || "").toString().trim())
      .filter(Boolean);
    return parts.join(", ");
  }

  function scoreClient(c: any, q: string) {
    if (!q) return -1;
    const nq = norm(q);

    const name = norm(fullName(c));
    const phone = norm(c.primary_phone);
    const email = norm(c.email);
    const addr = norm(formatAddress(c));
    const street = norm(c.street_address);
    const city = norm(c.city);
    const state = norm(c.state);
    const zip = norm(c.zip_code);

    if (name.startsWith(nq)) return 100 - name.indexOf(nq);
    if (phone.startsWith(nq)) return 92;
    if (email.startsWith(nq)) return 88;
    if (addr.startsWith(nq)) return 86;
    if (street?.startsWith(nq)) return 84;
    if (city?.startsWith(nq)) return 82;
    if (state?.startsWith(nq)) return 80;
    if (zip?.startsWith(nq)) return 78;

    if (name.includes(nq)) return 70 - name.indexOf(nq);
    if (phone.includes(nq)) return 64;
    if (email.includes(nq)) return 60;
    if (addr.includes(nq)) return 58;
    if (street?.includes(nq)) return 56;
    if (city?.includes(nq)) return 54;
    if (state?.includes(nq)) return 52;
    if (zip?.includes(nq)) return 50;

    return -1;
  }

  function filteredClientList(q: string) {
    const base = filteredClients();
    if (!q.trim()) return base.slice(0, 25);
    return base
      .map((c: any) => ({ c, s: scoreClient(c, q) }))
      .filter((x) => x.s >= 0)
      .sort((a, b) => b.s - a.s || fullName(a.c).localeCompare(fullName(b.c)))
      .map((x) => x.c)
      .slice(0, 25);
  }

  function selectClientById(clientId: number, isEdit = false) {
    rideForm.client_id = String(clientId);
    if (rideForm.pickup_from_home) applyClientAddressToPickup();
    const sel = filteredClients().find((c: any) => c.client_id === clientId);
    const label = sel ? fullName(sel) : "";
    if (isEdit) {
      showClientListEdit = false;
      clientQueryEdit = label;
    } else {
      showClientListCreate = false;
      clientQueryCreate = label;
    }
  }

  /* ---------------- Estimated length parsing/formatting ---------------- */
  function plural(n: number, one: string, many: string) {
    return `${n} ${n === 1 ? one : many}`;
  }
  function parseEstimatedLen(raw: unknown): { h: number; m: number } | null {
    if (raw == null) return null;
    const s = String(raw).trim().toLowerCase();
    if (!s) return null;

    let m = s.match(/^(\d+)\s*:\s*(\d{1,2})$/);
    if (m) {
      const h = parseInt(m[1], 10);
      const mi = parseInt(m[2], 10);
      if (Number.isFinite(h) && Number.isFinite(mi) && mi >= 0 && mi < 60)
        return { h, m: mi };
      return null;
    }
    m = s.match(
      /^(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)\s*(\d+)?\s*(m|min|mins|minute|minutes)?$/
    );
    if (m) {
      const hoursNum = parseFloat(m[1]);
      if (!Number.isFinite(hoursNum)) return null;
      let totalMinutes = Math.round(hoursNum * 60);
      if (m[3]) totalMinutes += parseInt(m[3], 10);
      return { h: Math.floor(totalMinutes / 60), m: totalMinutes % 60 };
    }
    m = s.match(/^(\d+)\s*(m|min|mins|minute|minutes)$/);
    if (m) {
      const mins = parseInt(m[1], 10);
      if (!Number.isFinite(mins)) return null;
      return { h: Math.floor(mins / 60), m: mins % 60 };
    }
    m = s.match(/^(\d+)$/);
    if (m) {
      const mins = parseInt(m[1], 10);
      if (!Number.isFinite(mins)) return null;
      return { h: Math.floor(mins / 60), m: mins % 60 };
    }
    return null;
  }

  let estHours = "";
  let estMinutes = "";

  function updateEstimatedLength() {
    const h = parseInt(estHours || "0", 10);
    const m = parseInt(estMinutes || "0", 10);
    const parts = [];
    if (h) parts.push(`${h} ${h === 1 ? "hr" : "hrs"}`);
    if (m) parts.push(`${m} ${m === 1 ? "min" : "mins"}`);
    rideForm.estimated_appointment_length = parts.join(" ") || "0 mins";
  }

  function canonEstimatedLen(raw: unknown): string | null {
    const parsed = parseEstimatedLen(raw);
    if (!parsed) return null;
    const parts: string[] = [];
    if (parsed.h) parts.push(plural(parsed.h, "hr", "hrs"));
    if (parsed.m) parts.push(plural(parsed.m, "min", "mins"));
    if (!parts.length) return "0 mins";
    return parts.join(" ");
  }

  /* ---------------- Form model ---------------- */
  type RideForm = {
    org_id: string;
    client_id: string;
    dispatcher_user_id: string;
    alt_pickup_address: string;
    alt_pickup_address2: string;
    alt_pickup_city: string;
    alt_pickup_state: string;
    alt_pickup_zipcode: string;
    dropoff_address: string;
    dropoff_address2: string;
    dropoff_city: string;
    dropoff_state: string;
    dropoff_zipcode: string;
    appointment_time: string;
    pickup_time: string;
    status: string;
    notes: string;
    miles_driven: string;
    hours: string;
    donation: boolean;
    donation_amount: string;
    riders: string;
    round_trip: boolean;
    purpose: string;
    estimated_appointment_length: string;
    destination_name: string;
    pickup_from_home: boolean;
    call_id: string;
    completion_status: string;
  };

  let rideForm = $state<RideForm>({
    org_id: userOrgId ? String(userOrgId) : "",
    client_id: "",
    dispatcher_user_id: data?.profile?.user_id ?? "",
    alt_pickup_address: "",
    alt_pickup_address2: "",
    alt_pickup_city: "",
    alt_pickup_state: "",
    alt_pickup_zipcode: "",
    dropoff_address: "",
    dropoff_address2: "",
    dropoff_city: "",
    dropoff_state: "",
    dropoff_zipcode: "",
    appointment_time: "",
    pickup_time: "",
    status: "Requested",
    notes: "",
    miles_driven: "",
    hours: "",
    donation: false,
    donation_amount: "",
    riders: "0",
    round_trip: false,
    purpose: "Medical",
    estimated_appointment_length: "",
    destination_name: "",
    pickup_from_home: true,
    call_id: "",
    completion_status: "",
  });

  type Destination = {
    destination_id: number;
    org_id: number;
    location_name: string | null;
    address: string | null;
    address2: string | null;
    city: string | null;
    state: string | null;
    zipcode: string | null;
  };

  const filteredDestinations = $derived(() => {
    const all = (data as any)?.destinations ?? [];
    return userOrgId ? all.filter((d: any) => d.org_id === userOrgId) : all;
  });

  let selectedDestinationId = $state<string>("");

  function applyDestinationToDropoff(destIdStr: string) {
    selectedDestinationId = destIdStr;
    const id = parseInt(destIdStr || "0", 10);
    if (!id) return;

    const dest = filteredDestinations().find((d) => d.destination_id === id);
    if (!dest) return;

    rideForm.destination_name = dest.location_name ?? "";
    rideForm.dropoff_address = dest.address ?? "";
    rideForm.dropoff_address2 = dest.address2 ?? "";
    rideForm.dropoff_city = dest.city ?? "";
    rideForm.dropoff_state = dest.state ?? "";
    rideForm.dropoff_zipcode = dest.zipcode ?? "";
  }
  function resetDestinationSelection() {
    selectedDestinationId = "";
  }

  let createStep = $state(1);
  let editStep = $state(1);
  let stepErrors = $state<string[]>([]);

  function resetRideForm() {
    rideForm = {
      org_id: userOrgId ? String(userOrgId) : "",
      client_id: "",
      dispatcher_user_id: data?.profile?.user_id ?? "",
      alt_pickup_address: "",
      alt_pickup_address2: "",
      alt_pickup_city: "",
      alt_pickup_state: "",
      alt_pickup_zipcode: "",
      dropoff_address: "",
      dropoff_address2: "",
      dropoff_city: "",
      dropoff_state: "",
      dropoff_zipcode: "",
      appointment_time: "",
      pickup_time: "",
      status: "Requested",
      notes: "",
      miles_driven: "",
      hours: "",
      donation: false,
      donation_amount: "",
      riders: "0",
      round_trip: false,
      purpose: "Medical",
      estimated_appointment_length: "",
      destination_name: "",
      pickup_from_home: true,
      call_id: "",
      completion_status: "",
    };
    stepErrors = [];
  }

  $effect(() => {
    if (!rideForm.donation) rideForm.donation_amount = "0.00";
  });

  function applyClientAddressToPickup() {
    const cid = parseInt(rideForm.client_id || "0", 10);
    if (!cid) return;
    const client = filteredClients().find((c: any) => c.client_id === cid);
    if (!client) return;
    rideForm.alt_pickup_address = client.street_address ?? "";
    rideForm.alt_pickup_address2 = client.address2 ?? "";
    rideForm.alt_pickup_city = client.city ?? "";
    rideForm.alt_pickup_state = client.state ?? "";
    rideForm.alt_pickup_zipcode = client.zip_code ?? "";
  }
  $effect(() => {
    if (rideForm.pickup_from_home && rideForm.client_id)
      applyClientAddressToPickup();
  });

  function onClientChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value;
    rideForm.client_id = val;
    if (rideForm.pickup_from_home) applyClientAddressToPickup();
  }

  function openCreateModal() {
    resetRideForm();
    resetDestinationSelection();
    clientQueryCreate = "";
    createStep = 1;
    showCreateModal = true;
  }

  function toLocalDateTimeInput(ts: string | null | undefined) {
    if (!ts) return "";
    const d = new Date(ts);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  const toISOorNull = (v: string) => {
    if (!v) return null;
    try {
      const d = new Date(v);
      if (isNaN(d.getTime())) return null;
      return d.toISOString();
    } catch {
      return null;
    }
  };

  function openEditModal(ride: any) {
    selectedRide = ride;
    resetDestinationSelection();
    rideForm = {
      org_id: userOrgId ? String(userOrgId) : (ride.org_id ?? "").toString(),
      client_id: (ride.client_id ?? "").toString(),
      dispatcher_user_id: data?.profile?.user_id ?? "",
      alt_pickup_address: ride.alt_pickup_address ?? "",
      alt_pickup_address2: ride.alt_pickup_address2 ?? "",
      alt_pickup_city: ride.alt_pickup_city ?? "",
      alt_pickup_state: ride.alt_pickup_state ?? "",
      alt_pickup_zipcode: ride.alt_pickup_zipcode ?? "",
      dropoff_address: ride.dropoff_address ?? "",
      dropoff_address2: ride.dropoff_address2 ?? "",
      dropoff_city: ride.dropoff_city ?? "",
      dropoff_state: ride.dropoff_state ?? "",
      dropoff_zipcode: ride.dropoff_zipcode ?? "",
      appointment_time: toLocalDateTimeInput(ride.appointment_time) || "",
      pickup_time: toLocalDateTimeInput(ride.pickup_time) || "",
      status: ride.status ?? "Requested",
      notes: ride.notes ?? "",
      miles_driven: ride.miles_driven?.toString?.() ?? "",
      hours: ride.hours?.toString?.() ?? "",
      donation: !!ride.donation,
      donation_amount:
        ride.donation_amount?.toString?.() ?? (ride.donation ? "0.00" : "0.00"),
      riders: (ride.riders ?? 0).toString(),
      round_trip: !!ride.round_trip,
      purpose: ride.purpose ?? "",
      estimated_appointment_length: ride.estimated_appointment_length ?? "",
      destination_name: ride.destination_name ?? "",
      pickup_from_home: !!ride.pickup_from_home,
      call_id: (ride.call_id ?? "").toString(),
      completion_status: ride.completion_status ?? "",
    };
    if (rideForm.pickup_from_home && rideForm.client_id)
      applyClientAddressToPickup();
    stepErrors = [];
    editStep = 1;

    clientQueryEdit = "";
    const sel = filteredClients().find(
      (c: any) => String(c.client_id) === String(rideForm.client_id)
    );
    if (sel) clientQueryEdit = fullName(sel);

    showEditModal = true;
  }

  function openDriverMatchModal(ride: any) {
    if (!data.session?.access_token) {
      alert("Session expired. Please refresh and try again.");
      return;
    }
    selectedRideForMatch = ride;
    showDriverMatchModal = true;
  }

  /* ---------------- diagnostics + payload helpers ---------------- */
  const DEBUG = true;
  function isBlank(v: any) {
    if (v === 0 || v === "0") return false;
    if (v === null || v === undefined) return true;
    if (typeof v === "number") return Number.isNaN(v);
    return String(v).trim() === "";
  }
  function has(v: any) {
    return !isBlank(v);
  }
  function numFromStr(s: string, fallback: number | null): number | null {
    if (!has(s)) return fallback;
    const n = parseFloat(s as any);
    return Number.isFinite(n) ? n : fallback;
  }

  function buildPayload(form: RideForm) {
    const base = selectedRide ?? {};
    const _org = has(form.org_id)
      ? String(form.org_id)
      : String(base.org_id ?? "");
    const _client = has(form.client_id)
      ? String(form.client_id)
      : String(base.client_id ?? "");
    const _dest = has(form.destination_name)
      ? form.destination_name
      : String(base.destination_name ?? "");
    const _addr = has(form.dropoff_address)
      ? form.dropoff_address
      : String(base.dropoff_address ?? "");
    const _city = has(form.dropoff_city)
      ? form.dropoff_city
      : String(base.dropoff_city ?? "");
    const _state = has(form.dropoff_state)
      ? form.dropoff_state
      : String(base.dropoff_state ?? "");
    const _zip = has(form.dropoff_zipcode)
      ? form.dropoff_zipcode
      : String(base.dropoff_zipcode ?? "");
    const apptLocal = has(form.appointment_time)
      ? form.appointment_time
      : base.appointment_time
        ? toLocalDateTimeInput(base.appointment_time)
        : "";

    const payload = {
      org_id: parseInt(_org, 10),
      client_id: parseInt(_client, 10),
      dispatcher_user_id: has(form.dispatcher_user_id)
        ? form.dispatcher_user_id
        : (base.dispatcher_user_id ?? null),

      alt_pickup_address: has(form.alt_pickup_address)
        ? sanitizeInput(form.alt_pickup_address)
        : (base.alt_pickup_address ?? null),
      alt_pickup_address2: has(form.alt_pickup_address2)
        ? sanitizeInput(form.alt_pickup_address2)
        : (base.alt_pickup_address2 ?? null),
      alt_pickup_city: has(form.alt_pickup_city)
        ? sanitizeInput(form.alt_pickup_city)
        : (base.alt_pickup_city ?? null),
      alt_pickup_state: has(form.alt_pickup_state)
        ? sanitizeInput(form.alt_pickup_state)
        : (base.alt_pickup_state ?? null),
      alt_pickup_zipcode: has(form.alt_pickup_zipcode)
        ? sanitizeInput(form.alt_pickup_zipcode)
        : (base.alt_pickup_zipcode ?? null),

      dropoff_address: sanitizeInput(_addr),
      dropoff_address2: has(form.dropoff_address2)
        ? sanitizeInput(form.dropoff_address2)
        : (base.dropoff_address2 ?? null),
      dropoff_city: sanitizeInput(_city),
      dropoff_state: sanitizeInput(_state),
      dropoff_zipcode: sanitizeInput(_zip),

      appointment_time: toISOorNull(apptLocal),
      pickup_time: toISOorNull(form.pickup_time),

      status: isEditing()
        ? has(form.status)
          ? form.status
          : (base.status ?? "Requested")
        : "Requested",
        notes: has(form.notes) ? sanitizeInput(form.notes) : (base.notes ?? null),

      miles_driven: numFromStr(form.miles_driven, base.miles_driven ?? null),
      hours: numFromStr(form.hours, base.hours ?? null),

      donation: base.donation ?? false,
      donation_amount: base.donation_amount ?? 0,

      riders: (() => {
        if (has(form.riders)) {
          const n = parseInt(form.riders, 10);
          return Number.isFinite(n) ? n : 0;
        }
        return Number(base.riders ?? 0);
      })(),

      round_trip: base.round_trip ?? false,
      purpose: has(form.purpose)
        ? sanitizeInput(form.purpose)
        : (base.purpose ?? null),

      estimated_appointment_length: (() => {
        const v = has(form.estimated_appointment_length)
          ? form.estimated_appointment_length
          : (base.estimated_appointment_length ?? null);
        const c = canonEstimatedLen(v);
        return c ?? null;
      })(),

      destination_name: sanitizeInput(_dest),
      pickup_from_home: has(form.pickup_from_home)
        ? !!form.pickup_from_home
        : !!base.pickup_from_home,
      call_id: has(form.call_id)
        ? parseInt(form.call_id, 10)
        : (base.call_id ?? null),
      completion_status: has(form.completion_status)
        ? form.completion_status
        : (base.completion_status ?? null),
    };

    if (DEBUG) console.debug("🧾 Payload:", payload);
    return payload;
  }

  function listMissingRequiredFields(payload: any, requireAppt: boolean) {
    const miss: string[] = [];
    if (isBlank(payload.org_id)) miss.push("Organization");
    if (isBlank(payload.client_id)) miss.push("Client");
    if (isBlank(payload.dropoff_address)) miss.push("Dropoff address");
    if (isBlank(payload.dropoff_city)) miss.push("Dropoff city");
    if (requireAppt && isBlank(payload.appointment_time))
      miss.push("Appointment time");
    return miss;
  }

  function pickupWindowErrors(
    apptLocal: string,
    pickupLocal: string
  ): string[] {
    const errs: string[] = [];
    if (!pickupLocal || !pickupLocal.trim()) return errs;
    if (!apptLocal || !apptLocal.trim()) {
      errs.push("Appointment time is required when pickup time is set.");
      return errs;
    }
    const appt = new Date(apptLocal);
    const pick = new Date(pickupLocal);
    if (Number.isNaN(appt.getTime())) errs.push("Appointment time is invalid.");
    if (Number.isNaN(pick.getTime())) errs.push("Pickup time is invalid.");
    if (errs.length) return errs;

    const diffMs = appt.getTime() - pick.getTime();
    if (diffMs <= 0)
      errs.push("Pickup time must be before the appointment time.");
    const diffMin = diffMs / 60000;
    if (diffMin > 120)
      errs.push(
        "Pickup time cannot be more than 2 hours before the appointment."
      );
    return errs;
  }

  function validateStep(step: number): boolean {
    stepErrors = [];
    if (step === 1) {
      const needAppt = !isEditing();
      const validators = [
        validateRequired(
          rideForm.org_id ||
            (isEditing() ? String(selectedRide?.org_id ?? "") : ""),
          "Organization"
        ),
        validateRequired(
          rideForm.client_id ||
            (isEditing() ? String(selectedRide?.client_id ?? "") : ""),
          "Client"
        ),
      ];
      if (needAppt)
        validators.push(
          validateDateTime(rideForm.appointment_time, "Appointment time")
        );

      const v = combineValidations(...validators);
      const errs: string[] = v.valid ? [] : [...v.errors];

      errs.push(
        ...pickupWindowErrors(rideForm.appointment_time, rideForm.pickup_time)
      );

      stepErrors = errs;
      return errs.length === 0;
    }
    if (step === 2) {
      const v = combineValidations(
        validateRequired(
          rideForm.dropoff_address ||
            (isEditing() ? String(selectedRide?.dropoff_address ?? "") : ""),
          "Dropoff address"
        ),
        validateCity(
          rideForm.dropoff_city ||
            (isEditing() ? String(selectedRide?.dropoff_city ?? "") : "")
        ),
        rideForm.dropoff_state && rideForm.dropoff_state.trim()
          ? validateState(rideForm.dropoff_state)
          : { valid: true, errors: [] },
        rideForm.dropoff_zipcode && String(rideForm.dropoff_zipcode).trim()
          ? validateZipCode(rideForm.dropoff_zipcode)
          : { valid: true, errors: [] },
        !rideForm.pickup_from_home && rideForm.alt_pickup_address
          ? validateAddress(
              rideForm.alt_pickup_address,
              "Alternative pickup address"
            )
          : { valid: true, errors: [] },
        !rideForm.pickup_from_home && rideForm.alt_pickup_city
          ? validateCity(rideForm.alt_pickup_city)
          : { valid: true, errors: [] },
        !rideForm.pickup_from_home &&
          rideForm.alt_pickup_state &&
          rideForm.alt_pickup_state.trim()
          ? validateState(rideForm.alt_pickup_state)
          : { valid: true, errors: [] },
        !rideForm.pickup_from_home &&
          rideForm.alt_pickup_zipcode &&
          String(rideForm.alt_pickup_zipcode).trim()
          ? validateZipCode(rideForm.alt_pickup_zipcode)
          : { valid: true, errors: [] }
      );
      if (!v.valid) stepErrors = v.errors;
      return v.valid;
    }
    if (step === 3) {
      const errs: string[] = [];
      if (
        rideForm.donation &&
        rideForm.donation_amount &&
        isNaN(Number(rideForm.donation_amount))
      ) {
        errs.push("Donation amount must be a number like 10 or 10.00");
      }
      if (rideForm.estimated_appointment_length) {
        if (!parseEstimatedLen(rideForm.estimated_appointment_length)) {
          errs.push(
            "Estimated appointment length must look like '30 mins' or '2 hrs 30 mins'."
          );
        } else {
          const c = canonEstimatedLen(rideForm.estimated_appointment_length);
          if (c) rideForm.estimated_appointment_length = c;
        }
      }
      stepErrors = errs;
      return errs.length === 0;
    }
    if (step === 4) {
      const errs: string[] = [];
      if (rideForm.miles_driven && isNaN(Number(rideForm.miles_driven)))
        errs.push("Miles driven must be a number.");
      if (rideForm.hours && isNaN(Number(rideForm.hours)))
        errs.push("Hours must be a number.");
      stepErrors = errs;
      return errs.length === 0;
    }
    return true;
  }

  function nextCreate() {
    if (validateStep(createStep)) createStep = Math.min(3, createStep + 1);
  }
  function prevCreate() {
    createStep = Math.max(1, createStep - 1);
    stepErrors = [];
  }
  function nextEdit() {
    if (validateStep(editStep)) editStep = Math.min(4, editStep + 1);
  }
  function prevEdit() {
    editStep = Math.max(1, editStep - 1);
    stepErrors = [];
  }
  function goToCreateStep(target: number) {
    // allow free backward navigation
    if (target <= createStep) {
      createStep = Math.max(1, Math.min(3, target));
      stepErrors = [];
      return;
    }
    // block forward navigation unless current step validates
    if (validateStep(createStep)) {
      createStep = Math.max(1, Math.min(3, target));
    }
  }

  function goToEditStep(target: number) {
    // allow free backward navigation
    if (target <= editStep) {
      editStep = Math.max(1, Math.min(4, target));
      stepErrors = [];
      return;
    }
    // block forward navigation unless current step validates
    if (validateStep(editStep)) {
      editStep = Math.max(1, Math.min(4, target));
    }
  }

  /* ---------------- submit ---------------- */
  async function createRide() {
    {
      const errs = pickupWindowErrors(
        rideForm.appointment_time,
        rideForm.pickup_time
      );
      if (errs.length) {
        alert("Cannot create ride:\n• " + errs.join("\n• "));
        return;
      }
    }
    const payload = buildPayload(rideForm);
    const missing = listMissingRequiredFields(payload, true);
    if (missing.length) {
      alert(`Cannot create ride:\n• ${missing.join("\n• ")}`);
      return;
    }

    isUpdating = true;
    try {
      const r = await fetch("/dispatcher/rides/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        showCreateModal = false;
        await invalidateAll();
        alert("Ride created successfully!");
      } else {
        let err: any = {};
        try {
          err = await r.json();
        } catch {}
        if ((err.error || "").toLowerCase().includes("missing")) {
          alert(
            `Failed to create ride:\n• ${listMissingRequiredFields(payload, true).join("\n• ") || "Unknown fields"}`
          );
        } else {
          alert(`Failed to create ride: ${err.error || "Unknown error"}`);
        }
      }
    } catch (e) {
      console.error(e);
      alert("Error creating ride.");
    } finally {
      isUpdating = false;
    }
  }

  async function updateRide() {
    if (!selectedRide) return;
    {
      const errs = pickupWindowErrors(
        rideForm.appointment_time,
        rideForm.pickup_time
      );
      if (errs.length) {
        alert("Cannot update ride:\n• " + errs.join("\n• "));
        return;
      }
    }
    const payload = buildPayload(rideForm);
    const missing = listMissingRequiredFields(payload, false);
    if (missing.length) {
      alert(`Cannot update ride:\n• ${missing.join("\n• ")}`);
      return;
    }

    isUpdating = true;
    try {
      const r = await fetch(
        `/dispatcher/rides/update/${selectedRide.ride_id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (r.ok) {
        showEditModal = false;
        selectedRide = null;
        await invalidateAll();
        alert("Ride updated successfully!");
      } else {
        let err: any = {};
        try {
          err = await r.json();
        } catch {}
        const msg = (err.error || "").toLowerCase();
        if (msg.includes("missing")) {
          alert(
            `Failed to update ride:\n• ${listMissingRequiredFields(payload, false).join("\n• ") || "Unknown fields"}`
          );
        } else {
          alert(`Failed to update ride: ${err.error || "Unknown error"}`);
        }
      }
    } catch (e) {
      console.error(e);
      alert("Error updating ride.");
    } finally {
      isUpdating = false;
    }
  }

  async function sendRideRequest(driverIds: string[]) {
    if (!selectedRideForMatch || driverIds.length === 0) return;
    isUpdating = true;

    try {
      const token = data.session?.access_token;
      const results = await Promise.allSettled(
        driverIds.map((driverId) =>
          fetch(
            `${import.meta.env.VITE_API_URL}/rides/${selectedRideForMatch.ride_id}/send-request`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ driver_user_id: driverId }),
            }
          ).then((r) => r.json())
        )
      );

      const successful = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      if (successful > 0) {
        showDriverMatchModal = false;
        selectedRideForMatch = null;
        await invalidateAll();
        alert(
          `Ride request sent to ${successful} driver${successful !== 1 ? "s" : ""}!${failed > 0 ? ` (${failed} failed)` : ""}`
        );
      } else {
        alert("Failed to send ride requests to any drivers");
      }
    } catch (e) {
      console.error(e);
      alert("Error sending ride requests.");
    } finally {
      isUpdating = false;
    }
  }

  onMount(() => {
    const editParam = $page.url.searchParams.get("edit");
    if (editParam) {
      const rideId = parseInt(editParam);
      if (!isNaN(rideId)) {
        const rideToEdit = data.rides?.find((r) => r.ride_id === rideId);
        if (rideToEdit) {
          openEditModal(rideToEdit);
          const url = new URL(window.location.href);
          url.searchParams.delete("edit");
          window.history.replaceState({}, "", url);
        }
      }
    }
  });
</script>

<svelte:head>
  <title>Ride Management - DriveKind</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 p-6">
  <div class="max-w-7xl mx-auto space-y-6">
    <!-- Header -->
    <div class="bg-white rounded-lg shadow-sm border p-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Ride Management</h1>
          <p class="text-gray-600 mt-1">
            Manage and track ride requests and assignments
          </p>
        </div>
        <button
          onclick={openCreateModal}
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus class="w-4 h-4" />
          New Ride
        </button>
      </div>
    </div>

    <!-- Error -->
    {#if data.error}
      <div class="bg-red-50 border border-red-200 rounded-lg p-4">
        <p class="text-red-800">{data.error}</p>
      </div>
    {/if}

    <!-- Tabs -->
    <div class="bg-white rounded-lg shadow-sm border">
      <div class="border-b border-gray-200">
        <div class="flex space-x-8 px-6">
          <button
            onclick={() => (activeTab = "requested")}
            class="py-4 px-1 border-b-2 font-medium text-sm transition-colors {activeTab ===
            'requested'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
          >
            Requested {#if rideCounts().requested > 0}<span
                class="ml-2 py-0.5 px-2 rounded-full text-xs bg-gray-100 text-gray-600"
                >{rideCounts().requested}</span
              >{/if}
          </button>
          <button
            onclick={() => (activeTab = "active")}
            class="py-4 px-1 border-b-2 font-medium text-sm transition-colors {activeTab ===
            'active'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
          >
            Scheduled/In Progress {#if rideCounts().active > 0}<span
                class="ml-2 py-0.5 px-2 rounded-full text-xs bg-blue-100 text-blue-600"
                >{rideCounts().active}</span
              >{/if}
          </button>
          <button
            onclick={() => (activeTab = "completed")}
            class="py-4 px-1 border-b-2 font-medium text-sm transition-colors {activeTab ===
            'completed'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
          >
            Completed/Cancelled {#if rideCounts().completed > 0}<span
                class="ml-2 py-0.5 px-2 rounded-full text-xs bg-green-100 text-green-600"
                >{rideCounts().completed}</span
              >{/if}
          </button>
        </div>
      </div>

      <!-- Search -->
      <div class="p-6 border-b border-gray-200">
        <div class="relative">
          <Search
            class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4"
          />
          <input
            type="text"
            placeholder="Search rides..."
            bind:value={searchTerm}
            class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <!-- Rides List -->
      <div class="divide-y divide-gray-200">
        {#each filteredRides() as ride}
          <div class="p-6 hover:bg-gray-50 transition-colors">
            <div class="flex items-start justify-between">
              <div class="space-y-3 flex-1">
                <div class="flex items-center gap-3">
                  <h3 class="text-lg font-semibold text-gray-900">
                    {getClientName(ride)}
                  </h3>
                  <span
                    class="px-2 py-1 text-xs font-medium rounded-full {getStatusColor(
                      ride.status
                    )}">{ride.status.toUpperCase()}</span
                  >
                  <span
                    class="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800"
                    >{ride.purpose}</span
                  >
                </div>

                <!-- 2 columns × 3 rows (Notes on the right) -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                  <!-- Row 1 -->
                  <div class="flex items-center gap-2">
                    <Phone class="w-4 h-4 text-gray-400" />
                    {getClientPhone(ride)}
                  </div>
                  {#if ride.status === "Completed" && ride.notes && ride.notes.trim()}
                    <div class="flex items-start gap-2">
                      <FileText class="w-4 h-4 text-gray-400 mt-0.5" />
                      <div class="min-w-0">
                        <span class="font-medium">Notes:</span>
                        <span class="ml-1 whitespace-pre-wrap break-words">{ride.notes}</span>
                      </div>
                    </div>
                  {/if}

                  <!-- Row 2 -->
                  <div class="flex items-center gap-2">
                    <Calendar class="w-4 h-4 text-gray-400" />
                    {formatDate(ride.appointment_time)} at {formatTime(ride.appointment_time)}
                  </div>
                  <div class="flex items-center gap-2">
                    <MapPin class="w-4 h-4 text-gray-400" />
                    <div>
                      <span class="font-medium">Destination:</span>
                      <span class="ml-1">{ride.destination_name || '—'}</span>
                    </div>
                  </div>

                  <!-- Row 3 -->
                  <div class="flex items-center gap-2">
                    <User class="w-4 h-4 text-gray-400" />
                    <div>
                      <span class="font-medium">Driver:</span>
                      <span class="ml-1">{getDriverName(ride)}</span>
                    </div>
                  </div>
                  <div class="flex items-start gap-2">
                    <AlertCircle class="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <span class="font-medium">Limitations:</span>
                      <span class="ml-1">{ride.clients?.other_limitations || 'None'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="flex gap-2 ml-4">
                {#if ride.status === "Requested"}
                  <button
                    onclick={() => openDriverMatchModal(ride)}
                    disabled={isUpdating}
                    class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    <UserCheck class="w-4 h-4" /> Send Request
                  </button>
                {/if}
                <button
                  onclick={() => openEditModal(ride)}
                  disabled={isUpdating}
                  class="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-colors disabled:opacity-50"
                >
                  <Edit class="w-4 h-4" /> Edit
                </button>
              </div>
            </div>
          </div>
        {/each}
      </div>

      {#if filteredRides().length === 0}
        <div class="p-12 text-center">
          <Car class="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 class="text-lg font-semibold text-gray-900 mb-2">
            No rides found
          </h3>
          <p class="text-gray-600">
            No rides match your current tab and filters.
          </p>
        </div>
      {/if}
    </div>
  </div>
</div>

<!-- ======= CREATE MODAL ======= -->
{#if showCreateModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div
      class="bg-white rounded-lg p-6 max-w-3xl max-h-[90vh] overflow-y-auto w-full mx-4"
    >
      <div class="mb-4">
        <h2 class="text-xl font-semibold">Create New Ride</h2>
        <p class="text-sm text-gray-600">
          Fill in the details below. Items marked * are required.
        </p>
      </div>

     <!-- Stepper (CREATE) -->
    <div class="flex items-center justify-center gap-3 mb-4 select-none">
      {#each [1, 2, 3] as s}
        <div class="flex items-center gap-2">
          <button
            type="button"
            title={`Go to step ${s}`}
            onclick={() => goToCreateStep(s)}
            class="w-8 h-8 rounded-full flex items-center justify-center text-sm
                  transition-colors cursor-pointer
                  {createStep === s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}"
            aria-current={createStep === s ? 'step' : undefined}
            aria-label={`Step ${s}`}
          >
            {s}
          </button>
          {#if s < 3}
            <!-- svelte-ignore element_invalid_self_closing_tag -->
            <button
              type="button"
              aria-label={`Jump toward step ${s + 1}`}
              onclick={() => goToCreateStep(s + 1)}
              class="w-8 h-[2px] rounded {createStep > s ? 'bg-blue-600' : 'bg-gray-200 hover:bg-gray-300'}"
            />
          {/if}
        </div>
      {/each}
    </div>

      {#if stepErrors.length}
        <div
          class="mb-4 bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-base"
        >
          <div class="font-medium mb-1">Please fix the following:</div>
          <ul class="list-disc ml-5">
            {#each stepErrors as e}<li>{e}</li>{/each}
          </ul>
        </div>
      {/if}

      {#if createStep === 1}
        <!-- Who & When -->
        <div class="border rounded-lg p-4 mb-2">
          <h3 class="font-semibold mb-3">Who &amp; When</h3>

          <div class="grid gap-3 md:grid-cols-3">
            <div class="md:col-span-2">
              <label for="client_id">Client *</label>
              <div class="relative">
                <Input
                  id="client_id"
                  placeholder="Type name, phone, email, or address…"
                  bind:value={clientQueryCreate}
                  onfocus={() => (showClientListCreate = true)}
                  oninput={() => (showClientListCreate = true)}
                  class="w-full"
                />
                <input type="hidden" value={rideForm.client_id} />
                {#if showClientListCreate}
                  <div
                    class="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow"
                  >
                    {#each filteredClientList(clientQueryCreate) as c}
                      <button
                        type="button"
                        class="w-full text-left px-3 py-2 hover:bg-gray-50"
                        onclick={() => selectClientById(c.client_id, false)}
                      >
                        <div class="font-medium">
                          {c.first_name} {c.last_name}
                        </div>
                        <div class="text-xs text-gray-500">
                          {c.primary_phone || "—"}{c.email ? ` • ${c.email}` : ""}
                        </div>
                        <div class="text-[11px] text-gray-400">
                          {formatAddress(c) || "—"}
                        </div>


                        <!-- Mobility Device -->
                        {#if c.mobility_assistance_enum}
                          <div class="mt-1 text-[11px] text-blue-600 flex items-start gap-1">
                            <span class="font-medium">Mobility Device:</span>
                            <span class="capitalize">{c.mobility_assistance_enum}</span>
                          </div>
                        {/if}
                        <!-- Mobility Device -->
                        {#if c.mobility_assistance_enum}
                          <div class="mt-1 text-[11px] text-blue-600 flex items-start gap-1">
                            <span class="font-medium">Mobility Device:</span>
                            <span class="capitalize">{c.mobility_assistance_enum}</span>
                          </div>
                        {/if}

                        <!-- Mobility Device -->
                        {#if c.mobility_assistance_enum}
                          <div class="mt-1 text-[11px] text-blue-600 flex items-start gap-1">
                            <span class="font-medium">Mobility Device:</span>
                            <span class="capitalize">{c.mobility_assistance_enum}</span>
                          </div>
                        {/if}

                        <!-- Mobility Device -->
                        {#if c.mobility_assistance_enum}
                          <div class="mt-1 text-[11px] text-blue-600 flex items-start gap-1">
                            <span class="font-medium">Mobility Device:</span>
                            <span class="capitalize">{c.mobility_assistance_enum}</span>
                          </div>
                        {/if}

                        <!-- Mobility Device -->
                        {#if c.mobility_assistance_enum}
                          <div class="mt-1 text-[11px] text-blue-600 flex items-start gap-1">
                            <span class="font-medium">Mobility Device:</span>
                            <span class="capitalize">{c.mobility_assistance_enum}</span>
                          </div>
                        {/if}
                        <!-- NEW: Limitations line -->
                        <div class="mt-1 text-[11px] text-gray-600 flex items-start gap-1">
                          <AlertCircle class="w-3 h-3 mt-0.5 text-gray-400" />
                          <span>
                            <span class="font-medium">Limitations:</span>
                            {c.other_limitations || 'None'}
                          </span>
                        </div>
                      </button>
                    {/each}
                    {#if filteredClientList(clientQueryCreate).length === 0}
                      <div class="px-3 py-2 text-sm text-gray-500">
                        No matches
                      </div>
                    {/if}
                  </div>
                {/if}
              </div>
              <p class="text-xs text-gray-500 mt-1">
                Only clients in your organization are shown.
              </p>
            </div>

            <div>
              <label for="dispatcher_display">Dispatcher</label>
              <Input
                id="dispatcher_display"
                value={dispatcherName()}
                disabled
                class="bg-gray-100"
              />
              <p class="text-xs text-gray-500 mt-1">Auto-set to you.</p>
            </div>

            <div class="md:col-span-3">
              <label for="call_id">Linked Call</label>
              <select
                id="call_id"
                bind:value={rideForm.call_id}
                class="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Select a call (optional)…</option>
                {#each filteredCalls() as call}
                  <option value={String(call.call_id)}>
                    {call.call_id} • {new Date(call.call_time).toLocaleString()}
                    • {call.call_type} • {call.caller_first_name}
                    {call.caller_last_name}
                  </option>
                {/each}
              </select>
            </div>
          </div>

          <div class="grid gap-3 md:grid-cols-2 mt-3">
            <div>
              <label for="appointment_time">Appointment Time *</label>
              <Input
                id="appointment_time"
                type="datetime-local"
                bind:value={rideForm.appointment_time}
                aria-label="Appointment Time"
              />
              <p class="text-xs text-gray-500 mt-1">
                Date &amp; time of the appointment.
              </p>
            </div>
            <div>
              <label for="pickup_time">Pickup Time</label>
              <Input
                id="pickup_time"
                type="datetime-local"
                bind:value={rideForm.pickup_time}
                aria-label="Pickup Time"
              />
              <p class="text-xs text-gray-500 mt-1">
                Optional pickup date &amp; time.
              </p>
            </div>
          </div>
        </div>
      {/if}

      {#if createStep === 2}
        <!-- CREATE • Step 2: Pickup & Dropoff -->
        <div class="border rounded-lg p-4 mb-2">
          <h3 class="font-semibold mb-3">Pickup &amp; Dropoff</h3>

          <div class="mb-3">
            <div class="flex items-center gap-2">
              <input
                id="pickup_from_home"
                type="checkbox"
                bind:checked={rideForm.pickup_from_home}
              />
              <label for="pickup_from_home">Pickup from client's home</label>
            </div>
            <p class="text-xs text-gray-500 mt-1">
              If checked, pickup address is auto-filled from the client and
              locked.
            </p>
          </div>

          <div class="grid gap-3">
            <div>
              <label for="alt_pickup_address">Pickup Street Address</label>
              <Input
                id="alt_pickup_address"
                bind:value={rideForm.alt_pickup_address}
                class={rideForm.pickup_from_home ? "bg-gray-100" : ""}
                disabled={rideForm.pickup_from_home}
                placeholder="561 Timber Glen Trail"
              />
            </div>

            <div class="grid gap-3 md:grid-cols-3">
              <div>
                <label for="alt_pickup_city">Pickup City</label>
                <Input
                  id="alt_pickup_city"
                  bind:value={rideForm.alt_pickup_city}
                  class={rideForm.pickup_from_home ? "bg-gray-100" : ""}
                  disabled={rideForm.pickup_from_home}
                  placeholder="Penfield"
                />
              </div>
              <div>
                <label for="alt_pickup_state">Pickup State</label>
                <Input
                  id="alt_pickup_state"
                  bind:value={rideForm.alt_pickup_state}
                  class={rideForm.pickup_from_home ? "bg-gray-100" : ""}
                  disabled={rideForm.pickup_from_home}
                  placeholder="NY"
                />
              </div>
              <div>
                <label for="alt_pickup_zipcode">Pickup ZIP</label>
                <Input
                  id="alt_pickup_zipcode"
                  bind:value={rideForm.alt_pickup_zipcode}
                  class={rideForm.pickup_from_home ? "bg-gray-100" : ""}
                  disabled={rideForm.pickup_from_home}
                  placeholder="14625"
                />
              </div>
            </div>

            <div>
              <label for="alt_pickup_address2">Pickup Address 2</label>
              <Input
                id="alt_pickup_address2"
                bind:value={rideForm.alt_pickup_address2}
                class={rideForm.pickup_from_home ? "bg-gray-100" : ""}
                disabled={rideForm.pickup_from_home}
                placeholder="Apt, Suite, etc."
              />
            </div>
          </div>

          <div class="mt-6">
            <label for="saved_destination_create">Use a saved destination</label
            >
            <select
              id="saved_destination_create"
              bind:value={selectedDestinationId}
              onchange={(e) =>
                applyDestinationToDropoff(
                  (e.target as HTMLSelectElement).value
                )}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">— Select saved destination (optional) —</option>
              {#each filteredDestinations() as d}
                <option value={String(d.destination_id)}>
                  {d.location_name || "(No name)"} • {d.address}
                  {d.city ? `, ${d.city}` : ""}{d.state
                    ? `, ${d.state}`
                    : ""}{d.zipcode ? ` ${d.zipcode}` : ""}
                </option>
              {/each}
            </select>
            <p class="text-xs text-gray-500 mt-1">
              Choosing one fills the dropoff fields below.
            </p>
          </div>

          <div class="mt-6">
            <label class="text-sm font-semibold text-gray-700"
              >Dropoff Location</label
            >
            <p class="text-xs text-gray-500">
              Where the client will be dropped off.
            </p>
          </div>

          <div class="mt-3 grid gap-3">
            <div>
              <label for="destination_name"
                >Destination Name <span class="text-gray-500 font-normal"
                  >(optional)</span
                ></label
              >
              <Input
                id="destination_name"
                bind:value={rideForm.destination_name}
                placeholder="e.g., RGH Medical Center"
              />
            </div>

            <div class="grid gap-3 md:grid-cols-2">
              <div>
                <label for="dropoff_address">Dropoff Street Address *</label>
                <Input
                  id="dropoff_address"
                  bind:value={rideForm.dropoff_address}
                  placeholder="1000 South Ave"
                />
              </div>
              <div>
                <label for="dropoff_address2">Dropoff Address 2</label>
                <Input
                  id="dropoff_address2"
                  bind:value={rideForm.dropoff_address2}
                  placeholder="Suite, Floor, etc."
                />
              </div>
            </div>

            <div class="grid gap-3 md:grid-cols-3">
              <div>
                <label for="dropoff_city">Dropoff City *</label><Input
                  id="dropoff_city"
                  bind:value={rideForm.dropoff_city}
                  placeholder="e.g., Rochester"
                />
              </div>
              <div>
                <label for="dropoff_state"
                  >Dropoff State <span class="text-gray-500 font-normal"
                    >(optional)</span
                  ></label
                ><Input
                  id="dropoff_state"
                  bind:value={rideForm.dropoff_state}
                  placeholder="e.g., NY"
                />
              </div>
              <div>
                <label for="dropoff_zipcode"
                  >Dropoff ZIP <span class="text-gray-500 font-normal"
                    >(optional)</span
                  ></label
                ><Input
                  id="dropoff_zipcode"
                  bind:value={rideForm.dropoff_zipcode}
                  placeholder="e.g., 14620"
                />
              </div>
            </div>
          </div>
        </div>
      {/if}

      {#if createStep === 3}
        <div class="border rounded-lg p-4 mb-2">
          <h3 class="font-semibold mb-3">Ride Details</h3>

          <div class="grid gap-3 md:grid-cols-3">
            <div>
              <label
                for="purpose"
                class="block text-sm font-medium text-gray-700">Purpose</label
              >
              <Input
                id="purpose"
                bind:value={rideForm.purpose}
                placeholder="e.g., Medical"
              />
            </div>
            <div>
              <label
                for="estimated_appointment_length"
                class="block text-sm font-medium text-gray-700"
                >Estimated appointment length</label
              >
              <div class="flex gap-2 items-end">
                <div class="flex-1">
                  <label for="est_hours">Hours</label>
                  <Input
                    id="est_hours"
                    type="number"
                    min="0"
                    bind:value={estHours}
                    placeholder="0"
                    oninput={() => updateEstimatedLength()}
                  />
                </div>
                <div class="flex-1">
                  <label for="est_minutes">Minutes</label>
                  <Input
                    id="est_minutes"
                    type="number"
                    min="0"
                    max="59"
                    bind:value={estMinutes}
                    placeholder="0"
                    oninput={() => updateEstimatedLength()}
                  />
                </div>
              </div>
            </div>
            <div>
              <label
                for="riders"
                class="block text-sm font-medium text-gray-700"
                ># of additional passengers (excluding client)</label
              >
              <Input
                id="riders"
                type="number"
                min="0"
                bind:value={rideForm.riders}
              />
            </div>
          </div>

          <!-- Notes (create) -->
          <div class="mt-3">
            <label for="notes" class="block text-sm font-medium text-gray-700">Notes for driver</label>
            <Textarea
              id="notes"
              bind:value={rideForm.notes}
              placeholder="Anything special the driver should know"
              rows={3}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p class="text-xs text-gray-500 mt-1">These notes will show on the ride and on completed rides.</p>
          </div>
        </div>
      {/if}


      <div class="flex items-center justify-between mt-6">
        <div>
          {#if createStep > 1}
            <button
              onclick={prevCreate}
              class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >Back</button
            >
          {/if}
        </div>
        <div class="flex gap-2">
          <button
            onclick={() => (showCreateModal = false)}
            class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >Cancel</button
          >
          {#if createStep < 3}
            <button
              onclick={nextCreate}
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Next
            </button>
          {:else}
            <button
              onclick={createRide}
              disabled={isUpdating}
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isUpdating ? "Creating..." : "Create Ride"}
            </button>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- ======= EDIT MODAL ======= -->
{#if showEditModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div
      class="bg-white rounded-lg p-6 max-w-3xl max-h-[90vh] overflow-y-auto w-full mx-4"
    >
      <div class="mb-4">
        <h2 class="text-xl font-semibold">Edit Ride</h2>
        <p class="text-sm text-gray-600">
          Update the ride information. Items marked * are required.
        </p>
      </div>

      <!-- Stepper (EDIT) -->
      <div class="flex items-center justify-center gap-3 mb-4 select-none">
        {#each [1, 2, 3, 4] as s}
          <div class="flex items-center gap-2">
            <button
              type="button"
              title={`Go to step ${s}`}
              onclick={() => goToEditStep(s)}
              class="w-8 h-8 rounded-full flex items-center justify-center text-sm
                    transition-colors cursor-pointer
                    {editStep === s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}"
              aria-current={editStep === s ? 'step' : undefined}
              aria-label={`Step ${s}`}
            >
              {s}
            </button>
            {#if s < 4}
              <!-- svelte-ignore element_invalid_self_closing_tag -->
              <button
                type="button"
                aria-label={`Jump toward step ${s + 1}`}
                onclick={() => goToEditStep(s + 1)}
                class="w-8 h-[2px] rounded {editStep > s ? 'bg-blue-600' : 'bg-gray-200 hover:bg-gray-300'}"
              />
            {/if}
          </div>
        {/each}
      </div>

      {#if stepErrors.length}
        <div
          class="mb-4 bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-base"
        >
          <div class="font-medium mb-1">Please fix the following:</div>
          <ul class="list-disc ml-5">
            {#each stepErrors as e}<li>{e}</li>{/each}
          </ul>
        </div>

                        <!-- Mobility Device -->
                        {#if c.mobility_assistance_enum}
                          <div class="mt-1 text-[11px] text-blue-600 flex items-start gap-1">
                            <span class="font-medium">Mobility Device:</span>
                            <span class="capitalize">{c.mobility_assistance_enum}</span>
                          </div>
                        {/if}
      {/if}

      {#if editStep === 1}
        <div class="border rounded-lg p-4 mb-2">
          <h3 class="font-semibold mb-3">Who &amp; When</h3>

          <div class="grid gap-3 md:grid-cols-3">
            <div class="md:col-span-2">
              <label for="e_client_id">Client *</label>
              <div class="relative">
                <Input
                  id="e_client_id"
                  placeholder="Type name, phone, email, or address…"
                  bind:value={clientQueryEdit}
                  onfocus={() => (showClientListEdit = true)}
                  oninput={() => (showClientListEdit = true)}
                  class="w-full"
                />
                <input type="hidden" value={rideForm.client_id} />
                {#if showClientListEdit}
                  <div
                    class="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow"
                  >
                    {#each filteredClientList(clientQueryEdit) as c}
                      <button
                        type="button"
                        class="w-full text-left px-3 py-2 hover:bg-gray-50"
                        onclick={() => selectClientById(c.client_id, true)}
                      >
                        <div class="font-medium">
                          {c.first_name} {c.last_name}
                        </div>
                        <div class="text-xs text-gray-500">
                          {c.primary_phone || "—"}{c.email ? ` • ${c.email}` : ""}
                        </div>
                        <div class="text-[11px] text-gray-400">
                          {formatAddress(c) || "—"}
                        </div>
                        <!-- Mobility Device -->
                        {#if c.mobility_assistance_enum}
                          <div class="mt-1 text-[11px] text-blue-600 flex items-start gap-1">
                            <span class="font-medium">Mobility Device:</span>
                            <span class="capitalize">{c.mobility_assistance_enum}</span>
                          </div>
                        {/if}
                        <!-- NEW: Limitations line -->
                        <div class="mt-1 text-[11px] text-gray-600 flex items-start gap-1">
                          <AlertCircle class="w-3 h-3 mt-0.5 text-gray-400" />
                          <span>
                            <span class="font-medium">Limitations:</span>
                            {c.other_limitations || 'None'}
                          </span>
                        </div>
                      </button>
                    {/each}
                    {#if filteredClientList(clientQueryEdit).length === 0}
                      <div class="px-3 py-2 text-sm text-gray-500">
                        No matches
                      </div>
                    {/if}
                  </div>
                {/if}
              </div>
            </div>

            <div>
              <label for="e_dispatcher_display">Dispatcher</label>
              <Input
                id="e_dispatcher_display"
                value={dispatcherName()}
                disabled
                class="bg-gray-100"
              />
            </div>

            <div class="md:col-span-3">
              <label for="e_call_id">Linked Call</label>
              <select
                id="e_call_id"
                bind:value={rideForm.call_id}
                class="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Select a call (optional)…</option>
                {#each filteredCalls() as call}
                  <option value={String(call.call_id)}>
                    {call.call_id} • {new Date(call.call_time).toLocaleString()}
                    • {call.call_type} • {call.caller_first_name}
                    {call.caller_last_name}
                  </option>
                {/each}
              </select>
            </div>
          </div>

          <div class="grid gap-3 md:grid-cols-2 mt-3">
            <div>
              <label for="e_appointment_time">Appointment Time *</label>
              <Input
                id="e_appointment_time"
                type="datetime-local"
                bind:value={rideForm.appointment_time}
                aria-label="Appointment Time"
              />
              <p class="text-xs text-gray-500 mt-1">
                Date &amp; time of the appointment.
              </p>
            </div>
            <div>
              <label for="e_pickup_time">Pickup Time</label>
              <Input
                id="e_pickup_time"
                type="datetime-local"
                bind:value={rideForm.pickup_time}
                aria-label="Pickup Time"
              />
              <p class="text-xs text-gray-500 mt-1">
                Optional pickup date &amp; time.
              </p>
            </div>
          </div>
        </div>
      {/if}

      {#if editStep === 2}
        <!-- EDIT • Step 2: Pickup & Dropoff -->
        <div class="border rounded-lg p-4 mb-2">
          <h3 class="font-semibold mb-3">Pickup &amp; Dropoff</h3>

          <div class="mb-3">
            <div class="flex items-center gap-2">
              <input
                id="e_pickup_from_home"
                type="checkbox"
                bind:checked={rideForm.pickup_from_home}
              />
              <label for="e_pickup_from_home">Pickup from client's home</label>
            </div>
            <p class="text-xs text-gray-500 mt-1">
              If checked, pickup address is auto-filled from the client and
              locked.
            </p>
          </div>

          <div class="grid gap-3">
            <div>
              <label for="e_alt_pickup_address">Pickup Street Address</label>
              <Input
                id="e_alt_pickup_address"
                bind:value={rideForm.alt_pickup_address}
                class={rideForm.pickup_from_home ? "bg-gray-100" : ""}
                disabled={rideForm.pickup_from_home}
                placeholder="561 Timber Glen Trail"
              />
            </div>

            <div class="grid gap-3 md:grid-cols-3">
              <div>
                <label for="e_alt_pickup_city">Pickup City</label>
                <Input
                  id="e_alt_pickup_city"
                  bind:value={rideForm.alt_pickup_city}
                  class={rideForm.pickup_from_home ? "bg-gray-100" : ""}
                  disabled={rideForm.pickup_from_home}
                  placeholder="Penfield"
                />
              </div>
              <div>
                <label for="e_alt_pickup_state">Pickup State</label>
                <Input
                  id="e_alt_pickup_state"
                  bind:value={rideForm.alt_pickup_state}
                  class={rideForm.pickup_from_home ? "bg-gray-100" : ""}
                  disabled={rideForm.pickup_from_home}
                  placeholder="NY"
                />
              </div>
              <div>
                <label for="e_alt_pickup_zipcode">Pickup ZIP</label>
                <Input
                  id="e_alt_pickup_zipcode"
                  bind:value={rideForm.alt_pickup_zipcode}
                  class={rideForm.pickup_from_home ? "bg-gray-100" : ""}
                  disabled={rideForm.pickup_from_home}
                  placeholder="14625"
                />
              </div>
            </div>

            <div>
              <label for="e_alt_pickup_address2">Pickup Address 2</label>
              <Input
                id="e_alt_pickup_address2"
                bind:value={rideForm.alt_pickup_address2}
                class={rideForm.pickup_from_home ? "bg-gray-100" : ""}
                disabled={rideForm.pickup_from_home}
                placeholder="Apt, Suite, etc."
              />
            </div>
          </div>

          <div class="mt-6">
            <label for="saved_destination_edit">Use a saved destination</label>
            <select
              id="saved_destination_edit"
              bind:value={selectedDestinationId}
              onchange={(e) =>
                applyDestinationToDropoff(
                  (e.target as HTMLSelectElement).value
                )}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">— Select saved destination (optional) —</option>
              {#each filteredDestinations() as d}
                <option value={String(d.destination_id)}>
                  {d.location_name || "(No name)"} • {d.address}
                  {d.city ? `, ${d.city}` : ""}{d.state
                    ? `, ${d.state}`
                    : ""}{d.zipcode ? ` ${d.zipcode}` : ""}
                </option>
              {/each}
            </select>
            <p class="text-xs text-gray-500 mt-1">
              Choosing one fills the dropoff fields below.
            </p>
          </div>

          <div class="mt-6">
            <label class="text-sm font-semibold text-gray-700"
              >Dropoff Location</label
            >
            <p class="text-xs text-gray-500">
              Where the client will be dropped off.
            </p>
          </div>

          <div class="mt-3 grid gap-3">
            <div>
              <label for="e_destination_name">Destination Name *</label><Input
                id="e_destination_name"
                bind:value={rideForm.destination_name}
                placeholder="e.g., RGH Medical Center"
              />
            </div>
            <div class="grid gap-3 md:grid-cols-2">
              <div>
                <label for="e_dropoff_address">Dropoff Street Address *</label
                ><Input
                  id="e_dropoff_address"
                  bind:value={rideForm.dropoff_address}
                  placeholder="1000 South Ave"
                />
              </div>
              <div>
                <label for="e_dropoff_address2">Dropoff Address 2</label><Input
                  id="e_dropoff_address2"
                  bind:value={rideForm.dropoff_address2}
                  placeholder="Suite, Floor, etc."
                />
              </div>
            </div>
            <div class="grid gap-3 md:grid-cols-3">
              <div>
                <label for="e_dropoff_city">Dropoff City *</label><Input
                  id="e_dropoff_city"
                  bind:value={rideForm.dropoff_city}
                  placeholder="e.g., Rochester"
                />
              </div>
              <div>
                <label for="e_dropoff_state">Dropoff State *</label><Input
                  id="e_dropoff_state"
                  bind:value={rideForm.dropoff_state}
                  placeholder="e.g., NY"
                />
              </div>
              <div>
                <label for="e_dropoff_zipcode">Dropoff ZIP *</label><Input
                  id="e_dropoff_zipcode"
                  bind:value={rideForm.dropoff_zipcode}
                  placeholder="e.g., 14620"
                />
              </div>
            </div>
          </div>
        </div>
      {/if}

      {#if editStep === 3}
        <div class="border rounded-lg p-4 mb-2">
          <h3 class="font-semibold mb-3">Ride Details</h3>

          <div class="grid gap-3 md:grid-cols-3">
            <div>
              <label
                for="e_purpose"
                class="block text-sm font-medium text-gray-700">Purpose</label
              >
              <Input
                id="e_purpose"
                bind:value={rideForm.purpose}
                placeholder="e.g., Medical"
              />
            </div>
            <div>
              <label
                for="e_est_len"
                class="block text-sm font-medium text-gray-700"
                >Estimated appointment length</label
              >
              <div class="flex gap-2 items-end">
                <div class="flex-1">
                  <label for="est_hours">Hours</label>
                  <Input
                    id="est_hours"
                    type="number"
                    min="0"
                    bind:value={estHours}
                    placeholder="0"
                    oninput={() => updateEstimatedLength()}
                  />
                </div>
                <div class="flex-1">
                  <label for="est_minutes">Minutes</label>
                  <Input
                    id="est_minutes"
                    type="number"
                    min="0"
                    max="59"
                    bind:value={estMinutes}
                    placeholder="0"
                    oninput={() => updateEstimatedLength()}
                  />
                </div>
              </div>
            </div>
            <div>
              <label
                for="e_riders"
                class="block text-sm font-medium text-gray-700"
                ># of additional passengers (excluding client)</label
              >
              <Input
                id="e_riders"
                type="number"
                min="0"
                bind:value={rideForm.riders}
              />
            </div>
          </div>

          <div class="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <label
                for="e_status"
                class="block text-sm font-medium text-gray-700">Status</label
              >
              <select
                id="e_status"
                bind:value={rideForm.status}
                class="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {#each STATUS_OPTIONS as s}<option value={s}>{s}</option>{/each}
              </select>
              <p class="text-xs text-gray-500 mt-1">
                Status is automatically managed but can be manually adjusted if
                needed.
              </p>
            </div>
            <div>
              <label
                for="e_completion_status"
                class="block text-sm font-medium text-gray-700"
                >Completion status</label
              >
              <select
                id="e_completion_status"
                bind:value={rideForm.completion_status}
                class="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">—</option>
                {#each COMPLETION_STATUS_OPTIONS as s}<option value={s}
                    >{s}</option
                  >{/each}
              </select>
              <p class="text-xs text-gray-500 mt-1">
                Type of completion (round trip, one-way, etc.)
              </p>
            </div>
          </div>
        </div>
      {/if}

      {#if editStep === 4}
        <div class="border rounded-lg p-4 mb-2">
          <h3 class="font-semibold mb-3">Completion / Metrics (Optional)</h3>

          <div class="grid gap-4 md:grid-cols-2">
            <div>
              <label
                for="e_miles"
                class="block text-sm font-medium text-gray-700"
                >Miles driven</label
              >
              <Input
                id="e_miles"
                type="number"
                step="0.1"
                bind:value={rideForm.miles_driven}
                placeholder="e.g., 12.5"
              />
              <p class="text-xs text-gray-500 mt-1">
                Total miles for this ride.
              </p>
            </div>

            <div>
              <label
                for="e_hours"
                class="block text-sm font-medium text-gray-700"
                >Hours worked</label
              >
              <Input
                id="e_hours"
                type="number"
                step="0.1"
                bind:value={rideForm.hours}
                placeholder="e.g., 1.5"
              />
              <p class="text-xs text-gray-500 mt-1">
                Driving and waiting time combined.
              </p>
            </div>

            <div class="mt-4">
              <label
                for="e_completion_status_step4"
                class="block text-sm font-medium text-gray-700"
                >Completion Status</label
              >
              <select
                id="e_completion_status_step4"
                bind:value={rideForm.completion_status}
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">— Select completion type —</option>
                {#each COMPLETION_STATUS_OPTIONS as s}
                  <option value={s}>{s}</option>
                {/each}
              </select>
              <p class="text-xs text-gray-500 mt-1">
                Type of completion (round trip, one-way, etc.)
              </p>
            </div>

            <!-- Notes (edit/completion) -->
            <div class="mt-4 md:col-span-2">
              <label for="e_completion_notes" class="block text-sm font-medium text-gray-700">Completion Notes</label>
              <Textarea
                id="e_completion_notes"
                bind:value={rideForm.notes}
                placeholder="Any notes about the ride completion..."
                rows={3}
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p class="text-xs text-gray-500 mt-1">These notes will appear on completed rides.</p>
            </div>
          </div>
        </div>
      {/if}

      <div class="flex items-center justify-between mt-6">
        <div>
          {#if editStep > 1}
            <button
              onclick={prevEdit}
              class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >Back</button
            >
          {/if}
        </div>
        <div class="flex gap-2">
          <button
            onclick={() => (showEditModal = false)}
            class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >Cancel</button
          >
          {#if editStep < 4}
            <button
              onclick={nextEdit}
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Next
            </button>
          {:else}
            <button
              onclick={updateRide}
              disabled={isUpdating}
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isUpdating ? "Updating..." : "Update Ride"}
            </button>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}
<DriverMatchModal
  bind:show={showDriverMatchModal}
  ride={selectedRideForMatch}
  token={data.session?.access_token}
  onSelectDriver={sendRideRequest}
  isLoading={isUpdating}
/>
