<script lang="ts">
  import RoleGuard from "$lib/components/RoleGuard.svelte";
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte";
  import {
    Building2,
    Globe,
    Mail,
    Phone,
    MapPin,
    Clock,
    Link as LinkIcon,
    User,
    Users,
    Edit,
    Save,
    X,
    AlertTriangle,
  } from "@lucide/svelte";
  import { supabase } from "$lib/supabase";

  let { data } = $props();

  // Use data.session instead of getContext
  const session = data.session;

  type OrgRow = Record<string, any> & { org_id: number };

  let isLoading = $state(false);
  let loadError = $state("");
  let org = $state(data.organization);
  let originalOrg = $state(
    data.organization ? JSON.parse(JSON.stringify(data.organization)) : null
  );
  let orgId = $state(data.organization?.org_id ?? null);

  // Edit modal (now wizard)
  let showEditModal = $state(false);
  let isSaving = $state(false);
  let editStep = $state(0);
  const STEP_LABELS = [
    "Overview",
    "Address",
    "Operations",
    "Primary Contact",
    "Secondary Contact",
    "Login",
    "Review",
  ] as const;

  // ---- Helpers (display formatting, unchanged) ----
  const dayMap: Record<string, string> = {
    Su: "Sunday",
    Mo: "Monday",
    Tu: "Tuesday",
    We: "Wednesday",
    Th: "Thursday",
    Fr: "Friday",
    Sa: "Saturday",
  };
  function hhToLabel(hh: string) {
    const n = Number(hh);
    if (isNaN(n)) return hh;
    const ampm = n < 12 ? "AM" : "PM";
    const hour12 = ((n + 11) % 12) + 1;
    return `${hour12}:00 ${ampm}`;
  }
  function formatWorkingHours(str?: string | null) {
    if (!str) return [] as { day: string; open: string; close: string }[];
    const tokens = String(str)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const out: { day: string; open: string; close: string }[] = [];
    for (const t of tokens) {
      const m = t.match(/^([A-Z][a-z])(\d{2})-(\d{2})$/);
      if (!m) continue;
      const [, d, start, end] = m;
      out.push({
        day: dayMap[d] ?? d,
        open: hhToLabel(start),
        close: hhToLabel(end),
      });
    }
    return out;
  }

  // Days Off helpers
  const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  function ordinal(n: number) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }
  function formatDaysOff(str?: string | null): string[] {
    if (!str) return [];
    return String(str)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((tok) => {
        let m = tok.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
        if (m) {
          const mm = Math.max(1, Math.min(12, parseInt(m[1], 10)));
          const dd = Math.max(1, Math.min(31, parseInt(m[2], 10)));
          let year = parseInt(m[3], 10);

          return `${MONTHS[mm - 1]} ${ordinal(dd)}, ${year}`;
        }

        m = tok.match(/^(\d{1,2})\/(\d{1,2})$/);
        if (m) {
          const mm = Math.max(1, Math.min(12, parseInt(m[1], 10)));
          const dd = Math.max(1, Math.min(31, parseInt(m[2], 10)));
          return `${MONTHS[mm - 1]} ${ordinal(dd)}`;
        }

        return "";
      })
      .filter(Boolean);
  }

  /**
   * Username hint generator.
   * Supports "F1L" and "F{n}L{m}" (e.g., F2L3 => "Jodoe" for John Doe)
   */
  /* function usernameExample(code: string | null | undefined, first = 'John', last = 'Doe') {
		if (!code) return '';
		const c = String(code).toUpperCase().trim();

		if (c === 'F1L') {
			const ex = `${(first[0] ?? '').toLowerCase()}${(last ?? '').toLowerCase()}`;
			return `Format “F1L”: first initial + last name. Example: ${first} ${last} → ${ex}`;
		}

		const m = c.match(/^F(\d+)L(\d+)$/);
		if (m) {
			const n = parseInt(m[1], 10);
			const k = parseInt(m[2], 10);
			const firstPart = (first ?? '').slice(0, Math.max(0, n));
			const lastPart = (last ?? '').slice(0, Math.max(0, k)).toLowerCase();
			const ex = `${firstPart}${lastPart}`;
			return `Format “F${n}L${k}”: first ${n} of first + first ${k} of last. Example: ${first} ${last} → ${ex}`;
		}
		return '';
	} */

  // ---- Derived via effect ----
  type HoursRow = { day: string; open: string; close: string };
  let workingHoursRows = $state<HoursRow[]>([]);
  let daysOffList = $state<string[]>([]);
  let statusLabel = $state<"Active" | "Inactive">("Inactive");
  let statusPillClasses = $state("bg-red-100 text-red-800"); // default red

  $effect(() => {
    workingHoursRows = org ? formatWorkingHours(org.working_hours) : [];
    const rawDays = (org && (org.days_off ?? org["days-off"])) as
      | string
      | null
      | undefined;
    daysOffList = formatDaysOff(rawDays);

    const rawStatus =
      (org && (org.org_status ?? org.org_status_enum ?? org.status)) ?? "";
    const s = String(rawStatus).trim().toLowerCase();
    statusLabel =
      s === "active" ? "Active" : s === "inactive" ? "Inactive" : "Inactive";
    statusPillClasses =
      statusLabel === "Active"
        ? "bg-green-100 text-green-800"
        : "bg-red-100 text-red-800";
  });

  // ---- Wizard form model ----
  let form = $state({
    // Overview
    name: "",
    org_status: "",
    org_email: "",
    org_phone: "",
    org_website: "",
    // Address
    org_address: "",
    org_address2: "",
    org_city: "",
    org_state: "",
    org_zip_code: "",
    // Operations (working_hours now comes from UI picker)
    working_hours: "",
    days_off: "",
    rides_phone_number: "",
    client_min_age: "",
    min_days_in_advance_for_ride_requests: "",
    client_max_weekly_rides: "", // NEW
    // Contacts (no phone fields)
    primary_contact_name: "",
    primary_contact_email: "",
    primary_contact_address: "",
    primary_contact_address2: "",
    primary_contact_city: "",
    primary_contact_state: "",
    primary_contact_zipcode: "",
    secondary_contact_name: "",
    secondary_contact_email: "",
    secondary_contact_address: "",
    secondary_contact_address2: "",
    secondary_contact_city: "",
    secondary_contact_state: "",
    secondary_contact_zipcode: "",
    // Login / username
    //username_format: '',
    user_initial_password: "",
    // Meta (read only)
    org_creation_date: "",
    first_ride_date: "",
    last_activity_in_portal: "",
  });

  // Elder-friendly working hours picker
  type DayCode = "Su" | "Mo" | "Tu" | "We" | "Th" | "Fr" | "Sa";
  type DayHours = {
    open: boolean;
    start: string;
    end: string;
    startHour: string;
    startPeriod: string;
    endHour: string;
    endPeriod: string;
  }; // '00'..'23'
  type WorkingHoursUI = Record<DayCode, DayHours>;
  function militaryTo12Hour(military: string): {
    hour: string;
    period: string;
  } {
    const h = parseInt(military, 10);
    if (h === 0) return { hour: "12", period: "AM" };
    if (h < 12) return { hour: String(h).padStart(2, "0"), period: "AM" };
    if (h === 12) return { hour: "12", period: "PM" };
    return { hour: String(h - 12).padStart(2, "0"), period: "PM" };
  }
  function hourTo24(hour: string, period: string): string {
    const h = parseInt(hour, 10);
    if (period === "AM") {
      return h === 12 ? "00" : String(h).padStart(2, "0");
    } else {
      return h === 12 ? "12" : String(h + 12).padStart(2, "0");
    }
  }
  const DAYS: Array<{ code: DayCode; label: string }> = [
    { code: "Su", label: "Sunday" },
    { code: "Mo", label: "Monday" },
    { code: "Tu", label: "Tuesday" },
    { code: "We", label: "Wednesday" },
    { code: "Th", label: "Thursday" },
    { code: "Fr", label: "Friday" },
    { code: "Sa", label: "Saturday" },
  ];
  const HOUR_OPTS = Array.from({ length: 24 }, (_, i) =>
    String(i).padStart(2, "0")
  );
  const HOUR_OPTS_12 = Array.from({ length: 12 }, (_, i) =>
    String(i === 0 ? 12 : i).padStart(2, "0")
  ); // '12', '01'..'11'
  const PERIOD_OPTS = ["AM", "PM"];
  function defaultWorkingHoursUI(): WorkingHoursUI {
    return {
      Su: {
        open: false,
        start: "09",
        end: "17",
        startHour: "09",
        startPeriod: "AM",
        endHour: "05",
        endPeriod: "PM",
      },
      Mo: {
        open: true,
        start: "09",
        end: "17",
        startHour: "09",
        startPeriod: "AM",
        endHour: "05",
        endPeriod: "PM",
      },
      Tu: {
        open: true,
        start: "09",
        end: "17",
        startHour: "09",
        startPeriod: "AM",
        endHour: "05",
        endPeriod: "PM",
      },
      We: {
        open: true,
        start: "09",
        end: "17",
        startHour: "09",
        startPeriod: "AM",
        endHour: "05",
        endPeriod: "PM",
      },
      Th: {
        open: true,
        start: "09",
        end: "17",
        startHour: "09",
        startPeriod: "AM",
        endHour: "05",
        endPeriod: "PM",
      },
      Fr: {
        open: true,
        start: "09",
        end: "17",
        startHour: "09",
        startPeriod: "AM",
        endHour: "05",
        endPeriod: "PM",
      },
      Sa: {
        open: false,
        start: "09",
        end: "17",
        startHour: "09",
        startPeriod: "AM",
        endHour: "05",
        endPeriod: "PM",
      },
    };
  }
  function parseWorkingHoursToUI(input?: string | null): WorkingHoursUI {
    const ui = defaultWorkingHoursUI();
    if (!input) return ui;
    for (const token of String(input)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)) {
      const m = token.match(/^([A-Z][a-z])(\d{2})-(\d{2})$/);
      if (!m) continue;
      const [, code, start, end] = m as unknown as [
        string,
        DayCode,
        string,
        string,
      ];
      if (ui[code]) {
        const startTime = militaryTo12Hour(start);
        const endTime = militaryTo12Hour(end);
        ui[code] = {
          open: true,
          start,
          end,
          startHour: startTime.hour,
          startPeriod: startTime.period,
          endHour: endTime.hour,
          endPeriod: endTime.period,
        };
      }
    }
    return ui;
  }
  function packWorkingHours(ui: WorkingHoursUI): string {
    const parts: string[] = [];
    for (const d of DAYS) {
      const v = ui[d.code];
      if (v?.open) {
        let s = v.start,
          e = v.end;
        if (parseInt(e) < parseInt(s)) e = s; // avoid end < start
        parts.push(`${d.code}${s}-${e}`);
      }
    }
    return parts.join(", ");
  }
  let whEdit = $state<WorkingHoursUI>(defaultWorkingHoursUI());

  // ---- Required fields & labels ----
  const OPTIONAL_KEYS = new Set<string>([
    "days_off",
    "org_address2",
    "first_ride_date",
    "last_activity_in_portal",
    "primary_contact_address2",
    "secondary_contact_name",
    "secondary_contact_email",
    "secondary_contact_address",
    "secondary_contact_address2",
    "secondary_contact_city",
    "secondary_contact_state",
    "secondary_contact_zipcode",
    "org_website", // <-- make website optional here
    "client_max_weekly_rides", // NEW (nullable int4)
  ]);
  function isRequired(key: string) {
    return !OPTIONAL_KEYS.has(key);
  }
  const FIELD_LABELS: Record<string, string> = {
    name: "Name",
    org_status: "Organization Status",
    org_email: "Organization Email",
    org_phone: "Organization Phone",
    org_website: "Website",
    org_address: "Street",
    org_address2: "Street 2",
    org_city: "City",
    org_state: "State",
    org_zip_code: "Zip Code",
    working_hours: "Working Hours",
    days_off: "Days Off",
    rides_phone_number: "Rides Phone",
    client_min_age: "Client Minimum Age",
    min_days_in_advance_for_ride_requests: "Min Days in Advance",
    client_max_weekly_rides: "Client Max Weekly Rides", // NEW
    primary_contact_name: "Primary Contact Name",
    primary_contact_email: "Primary Contact Email",
    primary_contact_address: "Primary Contact Address",
    primary_contact_address2: "Primary Contact Address 2",
    primary_contact_city: "Primary Contact City",
    primary_contact_state: "Primary Contact State",
    primary_contact_zipcode: "Primary Contact Zip",
    secondary_contact_name: "Secondary Contact Name",
    secondary_contact_email: "Secondary Contact Email",
    secondary_contact_address: "Secondary Contact Address",
    secondary_contact_address2: "Secondary Contact Address 2",
    secondary_contact_city: "Secondary Contact City",
    secondary_contact_state: "Secondary Contact State",
    secondary_contact_zipcode: "Secondary Contact Zip",
    /* username_format:'Username Format' */ user_initial_password:
      "Initial Password",
  };
  let fieldErrors = $state<Record<string, string>>({});

  function labelWithRequired(label: string, key: string) {
    return isRequired(key) ? `${label} *` : label;
  }

  // Step-scoped validation to reduce overwhelm
  function validateRequiredForStep(stepIdx: number): string[] {
    fieldErrors = {};
    const req: Record<number, string[]> = {
      0: ["name", "org_status", "org_email", "org_phone"],
      1: ["org_address", "org_city", "org_state", "org_zip_code"],
      2: [
        "rides_phone_number",
        "client_min_age",
        "min_days_in_advance_for_ride_requests",
      ],
      3: [
        "primary_contact_name",
        "primary_contact_email",
        "primary_contact_address",
        "primary_contact_city",
        "primary_contact_state",
        "primary_contact_zipcode",
      ],
      4: [], // all optional
      5: [/* 'username_format', */ "user_initial_password"],
      6: [],
    };
    const keys = req[stepIdx] ?? [];
    const missing: string[] = [];
    for (const k of keys) {
      const v = (form as any)[k];
      const empty = v == null || String(v).trim() === "";
      if (empty) {
        missing.push(k);
        fieldErrors[k] = "Required";
      }
    }
    // Ensure at least one open day in step 2
    if (stepIdx === 2) {
      const anyOpen = DAYS.some((d) => whEdit[d.code].open);
      if (!anyOpen) {
        missing.push("working_hours");
        fieldErrors["working_hours"] = "Select at least one open day.";
      }
    }
    return missing;
  }

  function openEdit() {
    if (!org) return;
    // seed simple fields
    for (const k of Object.keys(form)) {
      let v = (org as any)[k];
      if (k === "days_off" && (v == null || v === ""))
        v = (org as any)["days-off"];
      (form as any)[k] = v == null ? "" : String(v);
    }
    // normalize status
    const rawStatus = ((org as any).org_status ??
      (org as any).org_status_enum ??
      (org as any).status ??
      "") as string;
    const s = String(rawStatus).trim().toLowerCase();
    form.org_status =
      s === "active" ? "Active" : s === "inactive" ? "Inactive" : "Inactive";

    // seed working-hours UI from DB
    whEdit = parseWorkingHoursToUI(org.working_hours ?? "");

    fieldErrors = {};
    editStep = 0;
    showEditModal = true;
  }
  function closeEdit() {
    showEditModal = false;
  }

  function emptyToNull(obj: Record<string, any>) {
    const out: Record<string, any> = {};
    for (const k in obj) out[k] = obj[k] === "" ? null : obj[k];
    return out;
  }
  function coerceNumbers(payload: Record<string, any>, keys: string[]) {
    for (const k of keys) {
      if (payload[k] == null || payload[k] === "") {
        payload[k] = null;
        continue;
      }
      const n = Number(payload[k]);
      payload[k] = isNaN(n) ? null : n;
    }
  }

  function nextStep() {
    const missing = validateRequiredForStep(editStep);
    if (missing.length) {
      const names = missing.map((k) => FIELD_LABELS[k] ?? k).join(", ");
      alert(`Please fill in: ${names}.`);
      return;
    }
    if (editStep < STEP_LABELS.length - 1) editStep += 1;
  }
  function prevStep() {
    if (editStep > 0) editStep -= 1;
  }

  async function saveOrg(e: Event) {
    e.preventDefault();
    if (!org || !orgId) return;

    // Validate every step before submit
    for (let s = 0; s <= 5; s++) {
      const miss = validateRequiredForStep(s);
      if (miss.length) {
        editStep = s;
        const names = miss.map((k) => FIELD_LABELS[k] ?? k).join(", ");
        alert(`Please fill in: ${names}.`);
        return;
      }
    }

    isSaving = true;
    try {
      const payload: Record<string, any> = emptyToNull({ ...form });

      // set working_hours from the UI picker
      payload.working_hours = packWorkingHours(whEdit);

      // numeric coercions
      coerceNumbers(payload, [
        "client_min_age",
        "min_days_in_advance_for_ride_requests",
        "client_max_weekly_rides", // NEW
      ]);

      // map "days_off" -> "days-off"
      if ("days_off" in payload) {
        payload["days-off"] = payload.days_off;
        delete payload.days_off;
      }

      // map org_status (form) -> org_status_enum (DB)
      if ("org_status" in payload) {
        payload.org_status_enum = payload.org_status;
        delete payload.org_status;
      }

      // do not overwrite meta
      delete payload.org_creation_date;
      delete payload.first_ride_date;
      delete payload.last_activity_in_portal;
      console.log("Updating org", orgId, payload);

      const { data, error } = await supabase
        .from("organization")
        .update(payload)
        .eq("org_id", orgId)
        .select("*"); // returns an array of rows

      console.log("Update result", { data, error });

      if (error) {
        console.error("Supabase update error:", error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.error("No organization rows updated for org_id:", orgId);
        throw new Error("No rows were updated — check orgId / RLS");
      }

      // If multiple rows somehow match, take the first one
      org = data[0] as any;

      showEditModal = false;
    } catch (e: any) {
      console.error("Save error:", e?.message ?? e);
      alert("Failed to save organization: " + (e?.message ?? "Unknown error"));
    } finally {
      isSaving = false;
    }
  }
</script>

<RoleGuard requiredRoles={["Admin", "Super Admin"]}>
  <div class="min-h-screen bg-gray-50">
    <Breadcrumbs />

    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8 flex justify-between items-center">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-blue-100 rounded-lg">
            <Building2 class="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 class="text-3xl font-bold text-gray-900">
              Organization Settings
            </h1>
            <p class="text-gray-600 mt-1">
              View and manage your organization configuration.
            </p>
          </div>
        </div>

        {#if org}
          <button
            onclick={openEdit}
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <Edit class="w-4 h-4 mr-2" /> Edit Organization
          </button>
        {/if}
      </div>

      <!-- Loading / Error -->
      {#if isLoading}
        <div
          class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center"
        >
          <div
            class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"
          ></div>
          <p class="mt-2 text-gray-500">Loading organization...</p>
        </div>
      {:else if loadError}
        <div class="bg-red-50 border border-red-200 rounded-lg p-6">
          <div class="flex">
            <AlertTriangle class="w-5 h-5 text-red-400 mr-3 mt-0.5" />
            <div>
              <h3 class="text-sm font-medium text-red-800">
                Error Loading Organization
              </h3>
              <p class="mt-1 text-sm text-red-700">{loadError}</p>
            </div>
          </div>
        </div>
      {:else if org}
        <div class="space-y-6">
          <!-- Overview -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200">
            <div class="px-6 py-4 border-b border-gray-200">
              <div class="flex items-center">
                <Globe class="w-5 h-5 text-blue-600 mr-2" />
                <h2 class="text-lg font-medium text-gray-900">Overview</h2>
              </div>
            </div>
            <div class="p-6">
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700"
                    >Name</label
                  >
                  <p class="mt-1 text-gray-900">{org.name ?? "-"}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700"
                    >Organization Status</label
                  >
                  <p class="mt-1 text-gray-900">
                    <span
                      class={"inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium " +
                        statusPillClasses}
                    >
                      {statusLabel}
                    </span>
                  </p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700"
                    >Website</label
                  >
                  {#if org.org_website}
                    <a
                      href={/^https?:\/\//.test(org.org_website)
                        ? org.org_website
                        : `https://${org.org_website}`}
                      class="mt-1 text-blue-600 hover:underline flex items-center"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <LinkIcon class="w-4 h-4 mr-1 text-gray-400" />
                      {org.org_website}
                    </a>
                  {:else}
                    <p class="mt-1 text-gray-900">-</p>
                  {/if}
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700"
                    >Email</label
                  >
                  <p class="mt-1 text-gray-900 flex items-center">
                    <Mail class="w-4 h-4 mr-1 text-gray-400" />
                    {org.org_email ?? "-"}
                  </p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700"
                    >Phone</label
                  >
                  <p class="mt-1 text-gray-900 flex items-center">
                    <Phone class="w-4 h-4 mr-1 text-gray-400" />
                    {org.org_phone ?? "-"}
                  </p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700"
                    >Org ID</label
                  >
                  <p class="mt-1 text-gray-900">{org.org_id}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Address -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200">
            <div class="px-6 py-4 border-b border-gray-200">
              <div class="flex items-center">
                <MapPin class="w-5 h-5 text-purple-600 mr-2" />
                <h2 class="text-lg font-medium text-gray-900">Address</h2>
              </div>
            </div>
            <div class="p-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700"
                    >Street</label
                  >
                  <p class="mt-1 text-gray-900">{org.org_address ?? "-"}</p>
                  {#if org.org_address2}<p class="mt-1 text-gray-900">
                      {org.org_address2}
                    </p>{/if}
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700"
                    >City / State / Zip</label
                  >
                  <p class="mt-1 text-gray-900">
                    {org.org_city ?? "-"}, {org.org_state ?? "-"}
                    {org.org_zip_code ?? ""}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Operations -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200">
            <div class="px-6 py-4 border-b border-gray-200">
              <div class="flex items-center">
                <Clock class="w-5 h-5 text-indigo-600 mr-2" />
                <h2 class="text-lg font-medium text-gray-900">Operations</h2>
              </div>
            </div>
            <div class="p-6 space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700"
                    >Working Hours</label
                  >
                  {#if workingHoursRows.length}
                    <div class="mt-2 rounded-md border border-gray-200">
                      <table class="w-full text-sm">
                        <thead class="bg-gray-50">
                          <tr>
                            <th class="text-left px-3 py-2 text-gray-500"
                              >Day</th
                            >
                            <th class="text-left px-3 py-2 text-gray-500"
                              >Open</th
                            >
                            <th class="text-left px-3 py-2 text-gray-500"
                              >Close</th
                            >
                          </tr>
                        </thead>
                        <tbody>
                          {#each workingHoursRows as row}
                            <tr class="odd:bg-white even:bg-gray-50">
                              <td class="px-3 py-2">{row.day}</td>
                              <td class="px-3 py-2">{row.open}</td>
                              <td class="px-3 py-2">{row.close}</td>
                            </tr>
                          {/each}
                        </tbody>
                      </table>
                    </div>
                  {:else}
                    <p class="mt-1 text-gray-900">-</p>
                  {/if}
                  <p class="mt-2 text-xs text-gray-500">
                    Short form example: <code>Su07-18, Mo08-17</code>
                  </p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700"
                    >Days Off</label
                  >
                  {#if daysOffList.length}
                    <ul
                      class="mt-1 text-gray-900 list-disc list-inside space-y-0.5"
                    >
                      {#each daysOffList as d}<li>{d}</li>{/each}
                    </ul>
                  {:else}
                    <p class="mt-1 text-gray-900">-</p>
                  {/if}
                  <p class="mt-2 text-xs text-gray-500">
                    Format: <code>MM/DD, MM/DD</code>
                  </p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700"
                    >Rides Phone</label
                  >
                  <p class="mt-1 text-gray-900">
                    {org.rides_phone_number ?? "-"}
                  </p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700"
                    >Client Minimum Age</label
                  >
                  <p class="mt-1 text-gray-900">{org.client_min_age ?? "-"}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700"
                    >Min Days in Advance</label
                  >
                  <p class="mt-1 text-gray-900">
                    {org.min_days_in_advance_for_ride_requests ?? "-"}
                  </p>
                </div>

                                <div>
                  <label class="block text-sm font-medium text-gray-700"
                    >Client Max Weekly Rides</label
                  >
                  <p class="mt-1 text-gray-900">
                    {org.client_max_weekly_rides ?? "-"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Primary Contact -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200">
            <div class="px-6 py-4 border-b border-gray-200">
              <div class="flex items-center">
                <User class="w-5 h-5 text-emerald-600 mr-2" />
                <h2 class="text-lg font-medium text-gray-900">
                  Primary Contact
                </h2>
              </div>
            </div>
            <div class="p-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700"
                    >Name</label
                  >
                  <p class="mt-1 text-gray-900">
                    {org.primary_contact_name ?? "-"}
                  </p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700"
                    >Email</label
                  >
                  <p class="mt-1 text-gray-900">
                    {org.primary_contact_email ?? "-"}
                  </p>
                </div>
                <div class="md:col-span-2">
                  <label class="block text-sm font-medium text-gray-700"
                    >Address</label
                  >
                  <p class="mt-1 text-gray-900">
                    {org.primary_contact_address ??
                      "-"}{org.primary_contact_address2
                      ? `, ${org.primary_contact_address2}`
                      : ""}
                  </p>
                  <p class="mt-1 text-gray-900">
                    {org.primary_contact_city ?? ""}{org.primary_contact_city
                      ? ", "
                      : ""}{org.primary_contact_state ?? ""}
                    {org.primary_contact_zipcode ?? ""}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Secondary Contact -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200">
            <div class="px-6 py-4 border-b border-gray-200">
              <div class="flex items-center">
                <Users class="w-5 h-5 text-sky-600 mr-2" />
                <h2 class="text-lg font-medium text-gray-900">
                  Secondary Contact
                </h2>
              </div>
            </div>
            <div class="p-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700"
                    >Name</label
                  >
                  <p class="mt-1 text-gray-900">
                    {org.secondary_contact_name ?? "-"}
                  </p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700"
                    >Email</label
                  >
                  <p class="mt-1 text-gray-900">
                    {org.secondary_contact_email ?? "-"}
                  </p>
                </div>
                <div class="md:col-span-2">
                  <label class="block text-sm font-medium text-gray-700"
                    >Address</label
                  >
                  <p class="mt-1 text-gray-900">
                    {org.secondary_contact_address ??
                      "-"}{org.secondary_contact_address2
                      ? `, ${org.secondary_contact_address2}`
                      : ""}
                  </p>
                  <p class="mt-1 text-gray-900">
                    {org.secondary_contact_city ??
                      ""}{org.secondary_contact_city
                      ? ", "
                      : ""}{org.secondary_contact_state ?? ""}
                    {org.secondary_contact_zipcode ?? ""}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Login / Username -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200">
            <div class="px-6 py-4 border-b border-gray-200">
              <div class="flex items-center">
                <User class="w-5 h-5 text-amber-600 mr-2" />
                <h2 class="text-lg font-medium text-gray-900">
                  Login & Username
                </h2>
              </div>
            </div>
            <div class="p-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- <div>
									<label class="block text-sm font-medium text-gray-700">Username Format</label>
									<p class="mt-1 text-gray-900">{org.username_format ?? '-'}</p>
									<p class="text-xs text-gray-500 mt-1">{usernameExample(org.username_format, 'John', 'Doe')}</p>
								</div> -->
                <div>
                  <label class="block text-sm font-medium text-gray-700"
                    >Initial Password</label
                  >
                  <p class="mt-1 text-gray-900">
                    {org.user_initial_password ?? "-"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Meta -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200">
            <div class="px-6 py-4 border-b border-gray-200">
              <div class="flex items-center">
                <Clock class="w-5 h-5 text-gray-600 mr-2" />
                <h2 class="text-lg font-medium text-gray-900">Meta</h2>
              </div>
            </div>
            <div class="p-6">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700"
                    >Created</label
                  >
                  <p class="mt-1 text-gray-900">
                    {org.org_creation_date ?? "-"}
                  </p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700"
                    >First Ride Date</label
                  >
                  <p class="mt-1 text-gray-900">{org.first_ride_date ?? "-"}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700"
                    >Last Activity</label
                  >
                  <p class="mt-1 text-gray-900">
                    {org.last_activity_in_portal ?? "-"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      {:else}
        <div
          class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center"
        >
          <Building2 class="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 class="text-lg font-medium text-gray-900 mb-2">
            No Organization Found
          </h3>
          <p class="text-gray-500">
            We couldn’t find your organization record.
          </p>
        </div>
      {/if}
    </div>
  </div>

  <!-- Edit Organization Modal: Elder-friendly Wizard -->
  {#if showEditModal}
    <div
      class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
    >
      <div
        class="relative top-12 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-2xl bg-white"
      >
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-xl font-semibold">Edit Organization</h3>
          <button onclick={closeEdit} class="text-gray-400 hover:text-gray-600"
            ><X class="w-5 h-5" /></button
          >
        </div>

        <p class="text-sm text-gray-500 mb-4">
          <span class="text-red-600">*</span> indicates required fields.
        </p>
        <div class="mb-3 text-sm text-gray-700">
          Step {editStep + 1} of {STEP_LABELS.length}:
          <span class="font-medium">{STEP_LABELS[editStep]}</span>
        </div>

        <form onsubmit={saveOrg} class="space-y-6">
          <!-- STEP 0: Overview -->
          {#if editStep === 0}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired("Name", "name")}</label
                >
                <input
                  type="text"
                  bind:value={form.name}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.name ? "border-red-500" : "border-gray-300")}
                />
              </div>
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired(
                    "Organization Status",
                    "org_status"
                  )}</label
                >
                <select
                  bind:value={form.org_status}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.org_status
                      ? "border-red-500"
                      : "border-gray-300")}
                >
                  <option value="">—</option><option value="Active"
                    >Active</option
                  ><option value="Inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired("Website", "org_website")}</label
                >
                <input
                  type="text"
                  bind:value={form.org_website}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.org_website
                      ? "border-red-500"
                      : "border-gray-300")}
                />
              </div>
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired("Organization Email", "org_email")}</label
                >
                <input
                  type="email"
                  bind:value={form.org_email}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.org_email
                      ? "border-red-500"
                      : "border-gray-300")}
                />
              </div>
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired("Organization Phone", "org_phone")}</label
                >
                <input
                  type="tel"
                  bind:value={form.org_phone}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.org_phone
                      ? "border-red-500"
                      : "border-gray-300")}
                />
              </div>
            </div>
          {/if}

          <!-- STEP 1: Address -->
          {#if editStep === 1}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="md:col-span-2">
                <label class="block text-sm font-medium"
                  >{labelWithRequired("Street", "org_address")}</label
                >
                <input
                  type="text"
                  bind:value={form.org_address}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.org_address
                      ? "border-red-500"
                      : "border-gray-300")}
                />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium"
                  >{labelWithRequired("Street 2", "org_address2")}</label
                >
                <input
                  type="text"
                  bind:value={form.org_address2}
                  class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                />
              </div>
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired("City", "org_city")}</label
                >
                <input
                  type="text"
                  bind:value={form.org_city}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.org_city
                      ? "border-red-500"
                      : "border-gray-300")}
                />
              </div>
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired("State", "org_state")}</label
                >
                <input
                  type="text"
                  maxlength="2"
                  bind:value={form.org_state}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.org_state
                      ? "border-red-500"
                      : "border-gray-300")}
                />
              </div>
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired("Zip Code", "org_zip_code")}</label
                >
                <input
                  type="text"
                  bind:value={form.org_zip_code}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.org_zip_code
                      ? "border-red-500"
                      : "border-gray-300")}
                />
              </div>
            </div>
          {/if}

          <!-- STEP 2: Operations with hours picker -->
          {#if editStep === 2}
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium"
                  >Working Hours <span class="text-red-600">*</span></label
                >
                <div class="mt-2 border rounded-lg overflow-hidden">
                  <table class="w-full text-sm">
                    <thead class="bg-gray-50">
                      <tr>
                        <th class="px-3 py-2 text-left">Day</th>
                        <th class="px-3 py-2 text-left">Open</th>
                        <th class="px-3 py-2 text-left">Start</th>
                        <th class="px-3 py-2 text-left">End</th>
                      </tr>
                    </thead>
                    <tbody>
                      {#each DAYS as d}
                        <tr class="border-t">
                          <td class="px-3 py-2">{d.label}</td>
                          <td class="px-3 py-2"
                            ><input
                              type="checkbox"
                              bind:checked={whEdit[d.code].open}
                            /></td
                          >
                          <td class="px-3 py-2">
                            <div class="flex gap-1">
                              <!-- <select
                              class="border rounded px-2 py-1"
                              bind:value={whEdit[d.code].start}
                              disabled={!whEdit[d.code].open}
                            >
                              {#each HOUR_OPTS as h}<option value={h}
                                  >{h}:00</option
                                >{/each}
                            </select> -->
                              <select
                                class="border rounded px-2 py-1"
                                bind:value={whEdit[d.code].startHour}
                                onchange={() => {
                                  whEdit[d.code].start = hourTo24(
                                    whEdit[d.code].startHour,
                                    whEdit[d.code].startPeriod
                                  );
                                }}
                                disabled={!whEdit[d.code].open}
                              >
                                {#each HOUR_OPTS_12 as h}<option value={h}
                                    >{h}</option
                                  >{/each}
                              </select>
                              <select
                                class="border rounded px-2 py-1"
                                bind:value={whEdit[d.code].startPeriod}
                                onchange={() => {
                                  whEdit[d.code].start = hourTo24(
                                    whEdit[d.code].startHour,
                                    whEdit[d.code].startPeriod
                                  );
                                }}
                                disabled={!whEdit[d.code].open}
                              >
                                {#each PERIOD_OPTS as p}<option value={p}
                                    >{p}</option
                                  >{/each}
                              </select>
                            </div>
                          </td>
                          <td class="px-3 py-2">
                            <!-- <select
                              class="border rounded px-2 py-1"
                              bind:value={whEdit[d.code].end}
                              disabled={!whEdit[d.code].open}
                            >
                              {#each HOUR_OPTS as h}<option value={h}
                                  >{h}:00</option
                                >{/each}
                            </select> -->
                            <div class="flex gap-1">
                              <select
                                class="border rounded px-2 py-1"
                                bind:value={whEdit[d.code].endHour}
                                onchange={() => {
                                  whEdit[d.code].end = hourTo24(
                                    whEdit[d.code].endHour,
                                    whEdit[d.code].endPeriod
                                  );
                                }}
                                disabled={!whEdit[d.code].open}
                              >
                                {#each HOUR_OPTS_12 as h}<option value={h}
                                    >{h}</option
                                  >{/each}
                              </select>
                              <select
                                class="border rounded px-2 py-1"
                                bind:value={whEdit[d.code].endPeriod}
                                onchange={() => {
                                  whEdit[d.code].end = hourTo24(
                                    whEdit[d.code].endHour,
                                    whEdit[d.code].endPeriod
                                  );
                                }}
                                disabled={!whEdit[d.code].open}
                              >
                                {#each PERIOD_OPTS as p}<option value={p}
                                    >{p}</option
                                  >{/each}
                              </select>
                            </div>
                          </td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
                {#if fieldErrors.working_hours}<p
                    class="text-xs text-red-600 mt-1"
                  >
                    {fieldErrors.working_hours}
                  </p>{/if}
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium"
                    >{labelWithRequired("Days Off", "days_off")}</label
                  >
                  <input
                    type="text"
                    placeholder="MM/DD, MM/DD/YY"
                    bind:value={form.days_off}
                    class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                  />
                  <p class="text-xs text-gray-500 mt-1">
                    Examples: "12/25, 1/1" (yearly) or "7/4/25" (specific year).
                    Will render like: {formatDaysOff(form.days_off).join(", ")}
                  </p>
                </div>
                <div>
                  <label class="block text-sm font-medium"
                    >{labelWithRequired(
                      "Rides Phone",
                      "rides_phone_number"
                    )}</label
                  >
                  <input
                    type="tel"
                    bind:value={form.rides_phone_number}
                    class={"mt-1 w-full border rounded-md px-3 py-2 " +
                      (fieldErrors.rides_phone_number
                        ? "border-red-500"
                        : "border-gray-300")}
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium"
                    >{labelWithRequired(
                      "Client Minimum Age",
                      "client_min_age"
                    )}</label
                  >
                  <input
                    type="number"
                    bind:value={form.client_min_age}
                    class={"mt-1 w-full border rounded-md px-3 py-2 " +
                      (fieldErrors.client_min_age
                        ? "border-red-500"
                        : "border-gray-300")}
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium"
                    >{labelWithRequired(
                      "Min Days in Advance",
                      "min_days_in_advance_for_ride_requests"
                    )}</label
                  >
                  <input
                    type="number"
                    bind:value={form.min_days_in_advance_for_ride_requests}
                    class={"mt-1 w-full border rounded-md px-3 py-2 " +
                      (fieldErrors.min_days_in_advance_for_ride_requests
                        ? "border-red-500"
                        : "border-gray-300")}
                  />
                </div>

                                <div>
                  <label class="block text-sm font-medium">
                    {labelWithRequired(
                      "Client Max Weekly Rides",
                      "client_max_weekly_rides"
                    )}
                  </label>
                  <input
                    type="number"
                    min="0"
                    bind:value={form.client_max_weekly_rides}
                    class={"mt-1 w-full border rounded-md px-3 py-2 " +
                      (fieldErrors.client_max_weekly_rides
                        ? "border-red-500"
                        : "border-gray-300")}
                  />
                  <p class="mt-1 text-xs text-gray-500">
                    Optional: maximum rides per client per week (leave blank for no limit).
                  </p>
                </div>
              </div>
            </div>
          {/if}

          <!-- STEP 3: Primary Contact -->
          {#if editStep === 3}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired("Name", "primary_contact_name")}</label
                ><input
                  type="text"
                  bind:value={form.primary_contact_name}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.primary_contact_name
                      ? "border-red-500"
                      : "border-gray-300")}
                />
              </div>
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired("Email", "primary_contact_email")}</label
                ><input
                  type="email"
                  bind:value={form.primary_contact_email}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.primary_contact_email
                      ? "border-red-500"
                      : "border-gray-300")}
                />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium"
                  >{labelWithRequired(
                    "Address",
                    "primary_contact_address"
                  )}</label
                ><input
                  type="text"
                  bind:value={form.primary_contact_address}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.primary_contact_address
                      ? "border-red-500"
                      : "border-gray-300")}
                />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium"
                  >{labelWithRequired(
                    "Address 2",
                    "primary_contact_address2"
                  )}</label
                ><input
                  type="text"
                  bind:value={form.primary_contact_address2}
                  class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                />
              </div>
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired("City", "primary_contact_city")}</label
                ><input
                  type="text"
                  bind:value={form.primary_contact_city}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.primary_contact_city
                      ? "border-red-500"
                      : "border-gray-300")}
                />
              </div>
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired("State", "primary_contact_state")}</label
                ><input
                  type="text"
                  maxlength="2"
                  bind:value={form.primary_contact_state}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.primary_contact_state
                      ? "border-red-500"
                      : "border-gray-300")}
                />
              </div>
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired("Zip", "primary_contact_zipcode")}</label
                ><input
                  type="text"
                  bind:value={form.primary_contact_zipcode}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.primary_contact_zipcode
                      ? "border-red-500"
                      : "border-gray-300")}
                />
              </div>
            </div>
          {/if}

          <!-- STEP 4: Secondary Contact (optional) -->
          {#if editStep === 4}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired("Name", "secondary_contact_name")}</label
                ><input
                  type="text"
                  bind:value={form.secondary_contact_name}
                  class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                />
              </div>
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired(
                    "Email",
                    "secondary_contact_email"
                  )}</label
                ><input
                  type="email"
                  bind:value={form.secondary_contact_email}
                  class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium"
                  >{labelWithRequired(
                    "Address",
                    "secondary_contact_address"
                  )}</label
                ><input
                  type="text"
                  bind:value={form.secondary_contact_address}
                  class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium"
                  >{labelWithRequired(
                    "Address 2",
                    "secondary_contact_address2"
                  )}</label
                ><input
                  type="text"
                  bind:value={form.secondary_contact_address2}
                  class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                />
              </div>
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired("City", "secondary_contact_city")}</label
                ><input
                  type="text"
                  bind:value={form.secondary_contact_city}
                  class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                />
              </div>
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired(
                    "State",
                    "secondary_contact_state"
                  )}</label
                ><input
                  type="text"
                  maxlength="2"
                  bind:value={form.secondary_contact_state}
                  class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                />
              </div>
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired(
                    "Zip",
                    "secondary_contact_zipcode"
                  )}</label
                ><input
                  type="text"
                  bind:value={form.secondary_contact_zipcode}
                  class="mt-1 w-full border rounded-md px-3 py-2 border-gray-300"
                />
              </div>
            </div>
          {/if}

          <!-- STEP 5: Login -->
          {#if editStep === 5}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- <div>
								<label class="block text-sm font-medium">{labelWithRequired('Username Format','username_format')}</label>
								<input type="text" bind:value={form.username_format} class={"mt-1 w-full border rounded-md px-3 py-2 " + (fieldErrors.username_format ? 'border-red-500' : 'border-gray-300')} />
								<p class="mt-1 text-xs text-gray-500">{usernameExample(form.username_format, 'John', 'Doe')}</p>
							</div> -->
              <div>
                <label class="block text-sm font-medium"
                  >{labelWithRequired(
                    "Initial Password",
                    "user_initial_password"
                  )}</label
                >
                <input
                  type="text"
                  bind:value={form.user_initial_password}
                  class={"mt-1 w-full border rounded-md px-3 py-2 " +
                    (fieldErrors.user_initial_password
                      ? "border-red-500"
                      : "border-gray-300")}
                />
              </div>
            </div>
          {/if}

          <!-- STEP 6: Review -->
          {#if editStep === 6}
            <div class="text-sm text-gray-700 space-y-2">
              <p class="font-medium">
                Review your entries. Use Back to make changes.
              </p>
              <p><span class="font-medium">Name:</span> {form.name}</p>
              <p><span class="font-medium">Status:</span> {form.org_status}</p>
              <p>
                <span class="font-medium">Website:</span>
                {form.org_website}
              </p>
              <p>
                <span class="font-medium">Email/Phone:</span>
                {form.org_email} / {form.org_phone}
              </p>
              <p>
                <span class="font-medium">Address:</span>
                {form.org_address}
                {form.org_address2 ? `, ${form.org_address2}` : ""}, {form.org_city},
                {form.org_state}
                {form.org_zip_code}
              </p>
              <p>
                <span class="font-medium">Working Hours:</span>
                {packWorkingHours(whEdit) || "—"}
              </p>
              <p>
                <span class="font-medium">Days Off:</span>
                {formatDaysOff(form.days_off).join(", ") || "—"}
              </p>
              <p>
                <span class="font-medium">Rides Phone:</span>
                {form.rides_phone_number}
              </p>
              <p>
                <span class="font-medium">Client Min Age / Min Days:</span>
                {form.client_min_age} / {form.min_days_in_advance_for_ride_requests}
              </p>
              <p>
                <span class="font-medium">Client Max Weekly Rides:</span>
                {form.client_max_weekly_rides || "—"}
              </p>
              <p>
                <span class="font-medium">Primary Contact:</span>
                {form.primary_contact_name} ({form.primary_contact_email})
              </p>
              <!-- <p><span class="font-medium">Username Format:</span> {form.username_format}</p> -->
            </div>
          {/if}

          <!-- Wizard Controls -->
          <div class="flex justify-between pt-2">
            <button
              type="button"
              onclick={editStep === 0 ? closeEdit : prevStep}
              class="px-4 py-2 border border-gray-300 rounded-md"
            >
              {editStep === 0 ? "Cancel" : "Back"}
            </button>
            {#if editStep < STEP_LABELS.length - 1}
              <button
                type="button"
                onclick={nextStep}
                class="px-4 py-2 bg-blue-600 text-white rounded-md">Next</button
              >
            {:else}
              <button
                type="submit"
                disabled={isSaving}
                class="px-4 py-2 bg-blue-600 text-white rounded-md inline-flex items-center gap-2 disabled:opacity-60"
              >
                <Save class="w-4 h-4" /><span
                  >{isSaving ? "Saving…" : "Save Changes"}</span
                >
              </button>
            {/if}
          </div>
        </form>
      </div>
    </div>
  {/if}
</RoleGuard>
