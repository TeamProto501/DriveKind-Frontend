// src/routes/admin/organizations/+page.server.ts
import { createSupabaseServerClient } from "$lib/supabase.server";
import { redirect, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";

// ==================== TYPES ====================
export type OrgRow = Record<string, any> & { org_id: number; name: string };

export type DayCode = "Su" | "Mo" | "Tu" | "We" | "Th" | "Fr" | "Sa";

export type DayHours = {
  open: boolean;
  start: string;
  end: string;
  startHour: string;
  startPeriod: string;
  endHour: string;
  endPeriod: string;
};

export type WorkingHoursUI = Record<DayCode, DayHours>;

// ==================== CONSTANTS ====================
export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const DAY_MAP: Record<string, string> = {
  Su: "Sunday",
  Mo: "Monday",
  Tu: "Tuesday",
  We: "Wednesday",
  Th: "Thursday",
  Fr: "Friday",
  Sa: "Saturday",
};

export const DAYS: Array<{ code: DayCode; label: string }> = [
  { code: "Su", label: "Sunday" },
  { code: "Mo", label: "Monday" },
  { code: "Tu", label: "Tuesday" },
  { code: "We", label: "Wednesday" },
  { code: "Th", label: "Thursday" },
  { code: "Fr", label: "Friday" },
  { code: "Sa", label: "Saturday" },
];

export const HOUR_OPTS = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, "0")
); // '00'..'23'

export const HOUR_OPTS_12 = Array.from({ length: 12 }, (_, i) =>
  String(i === 0 ? 12 : i).padStart(2, "0")
); // '12', '01'..'11'

export const PERIOD_OPTS = ["AM", "PM"];

export const STEP_LABELS = [
  "Overview",
  "Address",
  "Operations",
  "Primary Contact",
  "Secondary Contact",
  "Login",
  "Review",
] as const;

export const OPTIONAL_KEYS = new Set<string>([
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
  "org_website",
  "client_max_weekly_rides",
]);

export const FIELD_LABELS: Record<string, string> = {
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
  client_max_weekly_rides: "Max Weekly Rides",
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
  user_initial_password: "Initial Password",
};

export const REQUIRED_BY_STEP: Record<number, string[]> = {
  0: ["name", "org_status", "org_email", "org_phone"],
  1: ["org_address", "org_city", "org_state", "org_zip_code"],
  2: ["rides_phone_number", "client_min_age", "min_days_in_advance_for_ride_requests"],
  3: [
    "primary_contact_name",
    "primary_contact_email",
    "primary_contact_address",
    "primary_contact_city",
    "primary_contact_state",
    "primary_contact_zipcode",
  ],
  4: [], // secondary contact optional
  5: ["user_initial_password"],
  6: [], // review
};

// ==================== HELPER FUNCTIONS ====================
export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function formatDaysOff(str?: string | null): string[] {
  if (!str) return [];
  return String(str)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((tok) => {
      const m = tok.match(/^(\d{1,2})\/(\d{1,2})$/);
      if (!m) return "";
      const mm = Math.max(1, Math.min(12, parseInt(m[1], 10)));
      const dd = Math.max(1, Math.min(31, parseInt(m[2], 10)));
      return `${MONTHS[mm - 1]} ${ordinal(dd)}`;
    })
    .filter(Boolean);
}

export function militaryTo12Hour(military: string): { hour: string; period: string } {
  const h = parseInt(military, 10);
  if (h === 0) return { hour: "12", period: "AM" };
  if (h < 12) return { hour: String(h).padStart(2, "0"), period: "AM" };
  if (h === 12) return { hour: "12", period: "PM" };
  return { hour: String(h - 12).padStart(2, "0"), period: "PM" };
}

export function hourTo24(hour: string, period: string): string {
  const h = parseInt(hour, 10);
  if (period === "AM") {
    return h === 12 ? "00" : String(h).padStart(2, "0");
  } else {
    return h === 12 ? "12" : String(h + 12).padStart(2, "0");
  }
}

export function defaultWorkingHoursUI(): WorkingHoursUI {
  const defaultDay: DayHours = {
    open: false,
    start: "09",
    end: "17",
    startHour: "09",
    startPeriod: "AM",
    endHour: "05",
    endPeriod: "PM",
  };

  return {
    Su: { ...defaultDay, open: false },
    Mo: { ...defaultDay, open: true },
    Tu: { ...defaultDay, open: true },
    We: { ...defaultDay, open: true },
    Th: { ...defaultDay, open: true },
    Fr: { ...defaultDay, open: true },
    Sa: { ...defaultDay, open: false },
  };
}

export function parseWorkingHoursToUI(input?: string | null): WorkingHoursUI {
  const ui = defaultWorkingHoursUI();
  if (!input) return ui;

  for (const token of String(input).split(",").map((s) => s.trim()).filter(Boolean)) {
    const m = token.match(/^([A-Z][a-z])(\d{2})-(\d{2})$/);
    if (!m) continue;
    const [, code, start, end] = m as [string, DayCode, string, string];
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

export function packWorkingHours(ui: WorkingHoursUI): string {
  const parts: string[] = [];
  for (const d of DAYS) {
    const v = ui[d.code];
    if (v?.open) {
      let s = v.start;
      let e = v.end;
      if (parseInt(e) < parseInt(s)) e = s; // never let end < start
      parts.push(`${d.code}${s}-${e}`);
    }
  }
  return parts.join(", ");
}

export function isRequired(key: string): boolean {
  return !OPTIONAL_KEYS.has(key);
}

export function labelWithRequired(label: string, key: string): string {
  return isRequired(key) ? `${label} *` : label;
}

export function emptyToNull(obj: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const k in obj) {
    out[k] = obj[k] === "" ? null : obj[k];
  }
  return out;
}

export function coerceNumbers(payload: Record<string, any>, keys: string[]): void {
  for (const k of keys) {
    if (payload[k] === null || payload[k] === undefined || payload[k] === "") {
      payload[k] = null;
      continue;
    }
    const n = Number(payload[k]);
    payload[k] = isNaN(n) ? null : n;
  }
}

export function getOrgStatus(org: OrgRow): "Active" | "Inactive" {
  const raw = (org.org_status_enum ?? org.org_status ?? org.status ?? "") as string;
  const s = String(raw).trim().toLowerCase();
  return s === "active" ? "Active" : "Inactive";
}

// ==================== LOAD FUNCTION ====================
export const load: PageServerLoad = async (event) => {
  const supabase = createSupabaseServerClient(event);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw redirect(302, "/login");
  }

  const { data: organizations, error } = await supabase
    .from("organization")
    .select("*")
    .order("org_id", { ascending: true });

  if (error) {
    console.error("Error loading organizations:", error);
    return {
      organizations: [],
      error: "Failed to load organizations: " + error.message,
    };
  }

  return {
    organizations: (organizations || []).sort(
      (a, b) => (a.org_id ?? 0) - (b.org_id ?? 0)
    ),
  };
};

// ==================== FORM ACTIONS ====================
export const actions: Actions = {
  addOrganization: async (event) => {
    const supabase = createSupabaseServerClient(event);
    const formData = await event.request.formData();

    const payload: Record<string, any> = {};

    // Extract all form fields
    for (const [key, value] of formData.entries()) {
      payload[key] = value === "" ? null : value;
    }

    // Coerce numeric fields
    coerceNumbers(payload, [
      "client_min_age",
      "min_days_in_advance_for_ride_requests",
      "client_max_weekly_rides",
    ]);

    // Remap fields for database
    if ("days_off" in payload) {
      payload["days-off"] = payload.days_off;
      delete payload.days_off;
    }
    if ("org_status" in payload) {
      payload.org_status_enum = payload.org_status;
      delete payload.org_status;
    }

    // Remove read-only/meta fields
    delete payload.org_creation_date;
    delete payload.first_ride_date;
    delete payload.last_activity_in_portal;

    const { error } = await supabase
      .from("organization")
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error("Error adding organization:", error);
      return fail(500, { error: "Failed to add organization: " + error.message });
    }

    return { success: true, message: "Organization added successfully!" };
  },

  updateOrganization: async (event) => {
    const supabase = createSupabaseServerClient(event);
    const formData = await event.request.formData();

    const orgId = formData.get("org_id") as string;
    if (!orgId) {
      return fail(400, { error: "Missing organization ID" });
    }

    const payload: Record<string, any> = {};

    for (const [key, value] of formData.entries()) {
      if (key === "org_id") continue;
      payload[key] = value === "" ? null : value;
    }

    coerceNumbers(payload, [
      "client_min_age",
      "min_days_in_advance_for_ride_requests",
      "client_max_weekly_rides",
    ]);

    if ("days_off" in payload) {
      payload["days-off"] = payload.days_off;
      delete payload.days_off;
    }
    if ("org_status" in payload) {
      payload.org_status_enum = payload.org_status;
      delete payload.org_status;
    }

    delete payload.org_creation_date;
    delete payload.first_ride_date;
    delete payload.last_activity_in_portal;

    const { error } = await supabase
      .from("organization")
      .update(payload)
      .eq("org_id", parseInt(orgId));

    if (error) {
      console.error("Error updating organization:", error);
      return fail(500, { error: "Failed to update organization: " + error.message });
    }

    return { success: true, message: "Organization updated successfully!" };
  },

  toggleStatus: async (event) => {
    const supabase = createSupabaseServerClient(event);
    const formData = await event.request.formData();

    const orgId = formData.get("org_id") as string;
    const currentStatus = formData.get("current_status") as string;

    if (!orgId) {
      return fail(400, { error: "Missing organization ID" });
    }

    const newStatus = currentStatus === "Active" ? "Inactive" : "Active";

    const { error } = await supabase
      .from("organization")
      .update({ org_status_enum: newStatus })
      .eq("org_id", parseInt(orgId));

    if (error) {
      console.error("Error toggling status:", error);
      return fail(500, { error: "Failed to update status: " + error.message });
    }

    return { success: true, message: `Organization marked as ${newStatus}.` };
  },

  deleteOrganization: async (event) => {
    const supabase = createSupabaseServerClient(event);
    const formData = await event.request.formData();

    const orgId = formData.get("org_id") as string;
    const password = formData.get("password") as string;

    if (!orgId) {
      return fail(400, { error: "Missing organization ID" });
    }

    if (!password) {
      return fail(400, { error: "Password is required to delete an organization" });
    }

    // Verify password
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      return fail(401, { error: "Unable to verify user identity" });
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: password,
    });

    if (signInError) {
      return fail(401, { error: "Invalid password. Please try again." });
    }

    const { error } = await supabase
      .from("organization")
      .delete()
      .eq("org_id", parseInt(orgId));

    if (error) {
      console.error("Error deleting organization:", error);
      return fail(500, { error: "Failed to delete organization: " + error.message });
    }

    return { success: true, message: "Organization deleted successfully!" };
  },
};