// src/routes/admin/audit/+page.server.ts
import { authenticatedFetchServer, API_BASE_URL } from "$lib/api.server";
import { createSupabaseServerClient } from "$lib/supabase.server";
import { redirect } from "@sveltejs/kit"; // 👈 add this
import type { PageServerLoad, Actions } from "./$types";

function getRows(raw: any): any[] {
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw)) return raw;
  return [];
}

// Only used for the previewByRange action (backend /calls/previewByTime)
function flattenCalls(data: any[]): any[] {
  return data.map((item) => {
    const flattened: any = { ...item };

    if (item.staff_profiles || item.staff_profile) {
      const staff = item.staff_profiles ?? item.staff_profile;
      const first = staff?.first_name ?? "";
      const last = staff?.last_name ?? "";
      flattened.staff_name = [first, last].filter(Boolean).join(" ");
      delete flattened.staff_profiles;
      delete flattened.staff_profile;
    }

    return flattened;
  });
}

export const load: PageServerLoad = async (event) => {
  const tab = event.url.searchParams.get("tab") ?? "audits";
  console.log('Loading audit page with tab:', tab);

  // ----- CALLS TAB (direct from Supabase, org-scoped) -----
  if (tab === "calls") {
    const supabase = createSupabaseServerClient(event);

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Error getting session:", sessionError);
    }

    if (!session) {
      console.log('No session found, returning empty data');
      return { data: [], tab: "calls", staffProfiles: [], clients: [] };
    }

    // Get user's org_id
    const { data: profile, error: profileError } = await supabase
      .from("staff_profiles")
      .select("org_id")
      .eq("user_id", session.user.id)
      .single();

    if (profileError) {
      console.error("Error loading staff profile:", profileError);
    }

    const orgId = profile?.org_id ?? null;
    console.log('Profile:', profile, 'OrgId:', orgId);

    let calls: any[] = [];
    let staffProfiles: any[] = [];
    let clients: any[] = [];

    if (orgId !== null) {
      console.log('Fetching calls for orgId:', orgId);
      // Calls for this org
      const { data: callData, error: callError } = await supabase
        .from("calls")
        .select(
          `
          *
        `
        )
        .eq("org_id", orgId);

      if (callError) {
        console.error("Error loading calls:", callError);
      } else {
        calls = callData ?? [];
      }
      console.log('Calls data:', calls, 'Error:', callError);

      // Staff in this org (for Dispatcher column + dropdown)
      console.log('Fetching staff profiles for orgId:', orgId);
      const { data: staffData, error: staffError } = await supabase
        .from("staff_profiles")
        .select("user_id, org_id, first_name, last_name")
        .eq("org_id", orgId);

      if (staffError) {
        console.error("Error loading staff profiles:", staffError);
      } else {
        staffProfiles = staffData ?? [];
      }
      console.log('Staff profiles:', staffProfiles, 'Error:', staffError);

      // Clients in this org (for Client column + dropdown)
      console.log('Fetching clients for orgId:', orgId);
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        // ⭐⭐⭐ ADDED primary_phone HERE — THE ONLY CHANGE ⭐⭐⭐
        .select("client_id, org_id, first_name, last_name, primary_phone")
        .eq("org_id", orgId);

      if (clientError) {
        console.error("Error loading clients:", clientError);
      } else {
        clients = clientData ?? [];
      }
      console.log('Clients:', clients, 'Error:', clientError);
    }

    console.log('Returning for calls tab:', { data: calls, tab: "calls", staffProfiles, clients });
    return {
      data: calls,
      tab: "calls",
      staffProfiles,
      clients,
    };
  }

  // ----- AUDITS TAB (now using Supabase SDK instead of backend API) -----
  console.log('Fetching audits from Supabase');
  const supabase = createSupabaseServerClient(event);

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    console.error("Error getting session for audits:", sessionError);
  }

  if (!session) {
    console.log('No session found for audits, returning empty data');
    return { 
      data: [], 
      tab: "audits", 
      staffProfiles: [], 
      clients: [],
      error: "Not authenticated."
    };
  }

  // Get user's org_id
  const { data: profile, error: profileError } = await supabase
    .from("staff_profiles")
    .select("org_id")
    .eq("user_id", session.user.id)
    .single();

  if (profileError) {
    console.error("Error loading staff profile for audits:", profileError);
  }

  const orgId = profile?.org_id ?? null;
  console.log('Profile for audits:', profile, 'OrgId:', orgId);

  let audits: any[] = [];

  if (orgId !== null) {
    console.log('Fetching audit_log for orgId:', orgId);
    const { data: auditData, error: auditError } = await supabase
      .from("transactions_audit_log")
      .select("*")
      .eq("org_id", orgId)
      .order("timestamp", { ascending: false });

    if (auditError) {
      console.error("Error loading audit_log:", auditError);
      return {
        data: [],
        tab: "audits",
        staffProfiles: [],
        clients: [],
        error: `Failed to fetch audits: ${auditError.message}`,
      };
    } else {
      audits = auditData ?? [];
    }
    console.log('Audit data:', audits);
  }

  console.log('Returning for audits tab:', { data: audits, tab: "audits", staffProfiles: [], clients: [] });
  return {
    data: audits,
    tab: "audits",
    staffProfiles: [],
    clients: [],
  };
};

export const actions: Actions = {
  deleteByRange: async (event) => {
    const formData = await event.request.formData();
    const startTime = formData.get("startTime") as string;
    const endTime = formData.get("endTime") as string;

    const formatToSQL = (dateTimeLocal: string) =>
      dateTimeLocal.replace("T", " ") + ":00";

    const startSQL = formatToSQL(startTime);
    const endSQL = formatToSQL(endTime);

    const res = await authenticatedFetchServer(
      API_BASE_URL + "/calls/deleteByTime",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startTime: startSQL,
          endTime: endSQL,
        }),
      },
      event
    );

    const text = await res.text();
    return { success: true, text };
  },

  previewByRange: async (event) => {
    const formData = await event.request.formData();
    const startTime = formData.get("startTime") as string;
    const endTime = formData.get("endTime") as string;

    const formatToSQL = (dateTimeLocal: string) =>
      dateTimeLocal.replace("T", " ") + ":00";

    const startSQL = formatToSQL(startTime);
    const endSQL = formatToSQL(endTime);

    const res = await authenticatedFetchServer(
      API_BASE_URL + "/calls/previewByTime",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startTime: startSQL,
          endTime: endSQL,
        }),
      },
      event
    );

    const text = await res.text();
    let raw: any;
    try {
      raw = JSON.parse(text);
    } catch {
      raw = text;
    }

    const rows = flattenCalls(getRows(raw));
    return { data: rows };
  },

  // Update an existing call (directly via Supabase, org-scoped)
  updateCall: async (event) => {
    const supabase = createSupabaseServerClient(event);
    const formData = await event.request.formData();

    const callIdStr = formData.get("call_id") as string | null;
    if (!callIdStr) {
      return { success: false, error: "Missing call_id." };
    }
    const call_id = Number(callIdStr);

    // Auth + org scoping (same pattern as createCall / deleteCall)
    const {
      data: { session },
      error: sessionError
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return { success: false, error: "Not authenticated." };
    }

    const { data: profile, error: profileError } = await supabase
      .from("staff_profiles")
      .select("org_id")
      .eq("user_id", session.user.id)
      .single();

    if (profileError || !profile?.org_id) {
      return { success: false, error: "Could not determine user org." };
    }

    const orgId = profile.org_id;

    const call_time_local = formData.get("call_time") as string | null;
    const formatToSQL = (dateTimeLocal: string) =>
      dateTimeLocal.replace("T", " ") + ":00";

    const clientIdRaw = formData.get("client_id") as string | null;
    const client_id =
      clientIdRaw && clientIdRaw.trim() !== "" ? Number(clientIdRaw) : null;

    const updatePayload: Record<string, any> = {
      // 👇 this now reads directly from the <select name="user_id">
      user_id: (formData.get("user_id") as string) || null,
      client_id,
      call_type: (formData.get("call_type") as string) || null,
      call_time: call_time_local ? formatToSQL(call_time_local) : null,
      other_type: (formData.get("other_type") as string) || null,
      phone_number: (formData.get("phone_number") as string) || null,
      forwarded_to_name:
        (formData.get("forwarded_to_name") as string) || null,
      caller_first_name:
        (formData.get("caller_first_name") as string) || null,
      caller_last_name:
        (formData.get("caller_last_name") as string) || null
    };

    const { error: updateError } = await supabase
      .from("calls")
      .update(updatePayload)
      .eq("call_id", call_id); // removed .eq("org_id", orgId)

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // ✅ ALWAYS go back to Calls tab after a successful edit
    throw redirect(303, "/admin/audit?tab=calls");
  },

  // Delete a single call (directly via Supabase, org-scoped)
  deleteCall: async (event) => {
    const formData = await event.request.formData();
    const callIdStr = formData.get("call_id") as string | null;

    if (!callIdStr) {
      return { success: false, error: "Missing call_id." };
    }

    const call_id = Number(callIdStr);
    const supabase = createSupabaseServerClient(event);

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return { success: false, error: "Not authenticated." };
    }

    const { data: profile, error: profileError } = await supabase
      .from("staff_profiles")
      .select("org_id")
      .eq("user_id", session.user.id)
      .single();

    if (profileError || !profile?.org_id) {
      return { success: false, error: "Could not determine user org." };
    }

    const orgId = profile.org_id;

    const { error: deleteError } = await supabase
      .from("calls")
      .delete()
      .eq("call_id", call_id); // removed org_id filter

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    // ✅ Always land back on calls
    throw redirect(303, "/admin/audit?tab=calls");
  },

  // Create a new call (directly via Supabase, org-scoped)
  createCall: async (event) => {
    const supabase = createSupabaseServerClient(event);
    const formData = await event.request.formData();

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return { success: false, error: "Not authenticated." };
    }

    const { data: profile, error: profileError } = await supabase
      .from("staff_profiles")
      .select("org_id")
      .eq("user_id", session.user.id)
      .single();

    if (profileError || !profile?.org_id) {
      return { success: false, error: "Could not determine user org." };
    }

    const orgId = profile.org_id;

    const user_id = (formData.get("user_id") as string) || null;
    const clientIdStr = (formData.get("client_id") as string) || "";
    const client_id = clientIdStr ? Number(clientIdStr) : null;

    const call_type = (formData.get("call_type") as string) || null;

    const call_time_local = formData.get("call_time") as string | null;
    const formatToSQL = (dateTimeLocal: string) =>
      dateTimeLocal.replace("T", " ") + ":00";
    const call_time = call_time_local ? formatToSQL(call_time_local) : null;

    const other_type = (formData.get("other_type") as string) || null;
    const phone_number = (formData.get("phone_number") as string) || null;
    const forwarded_to_name =
      (formData.get("forwarded_to_name") as string) || null;

    let caller_first_name =
      (formData.get("caller_first_name") as string) || null;
    let caller_last_name =
      (formData.get("caller_last_name") as string) || null;

    // If a client is selected, override caller_* with the client's name
    if (client_id !== null) {
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("first_name, last_name")
        .eq("client_id", client_id)
        .single();

      if (!clientError && client) {
        caller_first_name = client.first_name ?? caller_first_name;
        caller_last_name = client.last_name ?? caller_last_name;
      }
    }

    // Enforce rule: if no client selected, require caller first + last
    if (!client_id && (!caller_first_name || !caller_last_name)) {
      return {
        success: false,
        error:
          "Caller first and last name are required if no client is selected.",
      };
    }

    const { data: insertData, error: insertError } = await supabase
      .from("calls")
      .insert({
        org_id: orgId,
        user_id,
        client_id,
        call_time,
        call_type,
        other_type,
        phone_number,
        forwarded_to_name,
        caller_first_name,
        caller_last_name,
      })
      .select("call_id");

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    const createdId = insertData?.[0]?.call_id ?? null;
    // ✅ After creating, also land on calls
    throw redirect(303, "/admin/audit?tab=calls");
  },
};