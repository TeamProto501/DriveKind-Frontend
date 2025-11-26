// src/routes/admin/audit/+page.server.ts
import { authenticatedFetchServer, API_BASE_URL } from "$lib/api.server";
import { createSupabaseServerClient } from "$lib/supabase.server";
import { redirect } from "@sveltejs/kit";
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

  // ----- CALLS TAB (direct from Supabase, org-scoped) -----
  if (tab === "calls") {
    const supabase = createSupabaseServerClient(event);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      // user error handled silently; auth checks below will return appropriate data
    }

    if (!user) {
      return { data: [], tab: "calls", staffProfiles: [], clients: [] };
    }

    // Get user's org_id
    const { data: profile, error: profileError } = await supabase
      .from("staff_profiles")
      .select("org_id")
      .eq("user_id", user.id)
      .single();

    if (profileError) {
      // profile loading error will be handled downstream
    }

    const orgId = profile?.org_id ?? null;

    let calls: any[] = [];
    let staffProfiles: any[] = [];
    let clients: any[] = [];

    if (orgId !== null) {
      // Calls for this org
      const { data: callData, error: callError } = await supabase
        .from("calls")
        .select(
          `
          *
        `
        )
        .eq("org_id", orgId);

      if (!callError) {
        calls = callData ?? [];
      }

      // Staff in this org (for Dispatcher column and dropdown)
      const { data: staffData, error: staffError } = await supabase
        .from("staff_profiles")
        .select("user_id, org_id, first_name, last_name")
        .eq("org_id", orgId);

      if (!staffError) {
        staffProfiles = staffData ?? [];
      }

      // Clients in this org (for Client column and dropdown)
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("client_id, org_id, first_name, last_name, primary_phone")
        .eq("org_id", orgId);

      if (!clientError) {
        clients = clientData ?? [];
      }
    }

    return {
      data: calls,
      tab: "calls",
      staffProfiles,
      clients,
    };
  }

  // ----- AUDITS TAB (Supabase SDK, org-scoped) -----
  const supabase = createSupabaseServerClient(event);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    // user error handled silently; return below if no user
  }

  if (!user) {
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
    .eq("user_id", user.id)
    .single();

  if (profileError) {
    // profile loading error handled downstream
  }

  const orgId = profile?.org_id ?? null;

  let audits: any[] = [];
  let staffProfiles: any[] = [];

  if (orgId !== null) {
    // Fetch audit log for this org
    const { data: auditData, error: auditError } = await supabase
      .from("transactions_audit_log")
      .select("*")
      .eq("org_id", orgId)
      .order("timestamp", { ascending: false });

    if (auditError) {
      return {
        data: [],
        tab: "audits",
        staffProfiles: [],
        clients: [],
        error: `Failed to fetch audits: ${auditError.message}`,
      };
    }
    audits = auditData ?? [];

    // Fetch staff profiles so we can resolve dispatcher names
    const { data: staffData, error: staffError } = await supabase
      .from("staff_profiles")
      .select("user_id, org_id, first_name, last_name")
      .eq("org_id", orgId);

    if (!staffError) {
      staffProfiles = staffData ?? [];
    }
  }

  // returning audits tab data
  return {
    data: audits,
    tab: "audits",
    staffProfiles,
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
      console.error("updateCall error: Missing call_id.");
      return { success: false, error: "Missing call_id." };
    }
    const call_id = Number(callIdStr);

    // Auth and org scoping
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error(`updateCall auth error: ${userError?.message || "No user"}`);
      return { success: false, error: "Not authenticated." };
    }

    const { data: profile, error: profileError } = await supabase
      .from("staff_profiles")
      .select("org_id")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile?.org_id) {
      console.error(`updateCall profile error: ${profileError?.message || "No org_id"}`);
      return { success: false, error: "Could not determine user org." };
    }

    const orgId = profile.org_id;
    console.log(`updateCall called: call_id=${call_id}, orgId=${orgId}`);

    const call_time_local = formData.get("call_time") as string | null;
    const formatToSQL = (dateTimeLocal: string) =>
      dateTimeLocal.replace("T", " ") + ":00";

    const clientIdRaw = formData.get("client_id") as string | null;
    const client_id =
      clientIdRaw && clientIdRaw.trim() !== "" ? Number(clientIdRaw) : null;

    const updatePayload: Record<string, any> = {
      user_id: (formData.get("user_id") as string) || null,
      client_id,
      call_type: (formData.get("call_type") as string) || null,
      call_time: call_time_local ? formatToSQL(call_time_local) : null,
      other_type: (formData.get("other_type") as string) || "",
      phone_number: (formData.get("phone_number") as string) || "",
      forwarded_to_name: (formData.get("forwarded_to_name") as string) || "",
      caller_first_name: (formData.get("caller_first_name") as string) || "",
      caller_last_name: (formData.get("caller_last_name") as string) || ""
    };

    console.log(`updateCall updating call: call_id=${call_id}, payload=${JSON.stringify(updatePayload)}`);
    const { error: updateError } = await supabase
      .from("calls")
      .update(updatePayload)
      .eq("call_id", call_id)
      .eq("org_id", orgId);

    if (updateError) {
      console.error(`updateCall update error: ${updateError.message}`);
      return { success: false, error: updateError.message };
    }

    console.log(`updateCall successful: call_id=${call_id}, orgId=${orgId}`);
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
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "Not authenticated." };
    }

    const { data: profile, error: profileError } = await supabase
      .from("staff_profiles")
      .select("org_id")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile?.org_id) {
      return { success: false, error: "Could not determine user org." };
    }

    const orgId = profile.org_id;
    console.log(`deleteCall called: call_id=${call_id}, orgId=${orgId}`);

    const { error: deleteError } = await supabase
      .from("calls")
      .delete()
      .eq("call_id", call_id)
      .eq("org_id", orgId);

    if (deleteError) {
      console.error(`deleteCall error: ${deleteError.message}`);
      return { success: false, error: deleteError.message };
    }

    console.log(`deleteCall successful: call_id=${call_id}, orgId=${orgId}`);
    throw redirect(303, "/admin/audit?tab=calls");
  },

  // Create a new call (directly via Supabase, org-scoped)
  createCall: async (event) => {
    console.log("!!!!!! CREATECALL ACTION HIT !!!!!!");
    const supabase = createSupabaseServerClient(event);
    const formData = await event.request.formData();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("createCall auth error:", userError?.message || "No user");
      return { success: false, error: "Not authenticated." };
    }

    const { data: profile, error: profileError } = await supabase
      .from("staff_profiles")
      .select("org_id")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile?.org_id) {
      console.error(
        "createCall profile error:",
        profileError?.message || "No org_id"
      );
      return { success: false, error: "Could not determine user org." };
    }

    const orgId = profile.org_id;

    const user_id = (formData.get("user_id") as string) || null;

    const clientIdStr = (formData.get("client_id") as string) || "";
    const client_id = clientIdStr ? Number(clientIdStr) : null;

    const call_type = (formData.get("call_type") as string) || null;

    // Validate call_type is provided
    if (!call_type) {
      return { success: false, error: "Call type is required." };
    }

    const call_time_local = formData.get("call_time") as string | null;
    const formatToSQL = (dateTimeLocal: string) =>
      dateTimeLocal.replace("T", " ") + ":00";
    const call_time = call_time_local ? formatToSQL(call_time_local) : null;

    // Validate call_time is provided
    if (!call_time) {
      return { success: false, error: "Call time is required." };
    }

    // For nullable fields, use null instead of empty string
    const other_type = (formData.get("other_type") as string) || null;
    const phone_number = (formData.get("phone_number") as string) || "";
    const forwarded_to_name = (formData.get("forwarded_to_name") as string) || null;

    let caller_first_name = (formData.get("caller_first_name") as string) || "";
    let caller_last_name = (formData.get("caller_last_name") as string) || "";

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
        error: "Caller first and last name are required if no client is selected.",
      };
    }

    // Validate required fields match database constraints
    if (!phone_number) {
      return { success: false, error: "Phone number is required." };
    }

    if (!caller_first_name || !caller_last_name) {
      return { success: false, error: "Caller first and last name are required." };
    }

    const insertPayload = {
      org_id: orgId,
      user_id,
      client_id,
      call_time,
      call_type,
      other_type,  // null if empty
      phone_number,  // required, non-empty string
      forwarded_to_name,  // null if empty
      caller_first_name,  // required, non-empty string
      caller_last_name,  // required, non-empty string
    };

    console.log("createCall inserting:", insertPayload);

    const { data: insertData, error: insertError } = await supabase
      .from("calls")
      .insert(insertPayload)
      .select("call_id");

    if (insertError) {
      console.error("createCall insert error:", insertError.message);
      console.error("createCall insert details:", insertError);
      return { success: false, error: insertError.message };
    }

    const createdId = insertData?.[0]?.call_id ?? null;
    console.log("createCall successful, new call_id:", createdId);

    // After creating, land on calls
    throw redirect(303, "/admin/audit?tab=calls");
  },
};