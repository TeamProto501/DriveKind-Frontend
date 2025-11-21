// src/routes/admin/users/+page.server.ts
import { API_BASE_URL } from "$lib/api";
import { error, redirect } from "@sveltejs/kit";
import { createSupabaseServerClient } from "$lib/supabase.server";

export const load = async (event) => {
  const tab = event.url.searchParams.get("tab") ?? "users";

  try {
    const supabase = createSupabaseServerClient(event);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw redirect(302, "/login");

    // Get user profile with role
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: userProfile } = await supabase
      .from("staff_profiles")
      .select("org_id, role")
      .eq("user_id", user.id)
      .single();

    if (!userProfile) {
      console.error("No user profile found for:", user.id);
      return {
        tab,
        staffProfiles: [],
        clients: [],
        userProfile: null,
        session,
        error: "User profile not found",
      };
    }

    // Check if user has permission to access this page
    const allowedRoles = [
      'Super Admin',
      'Admin',
      'List Manager',
      'Report View Only',
      'New Client Enroller',
      'WSPS Dispatcher Add-on',
      'BPSR Dispatcher Add-on'
    ];

    const userRoles = Array.isArray(userProfile.role) ? userProfile.role : [userProfile.role];
    const hasAccess = userRoles.some((role: string) => allowedRoles.includes(role));

    if (!hasAccess) {
      console.error("User does not have permission to access user management:", userRoles);
      throw redirect(302, "/");
    }

    // Determine what data to load based on roles
    const canViewUsers = userRoles.some((role: string) => 
      ['Super Admin', 'Admin', 'List Manager', 'Report View Only'].includes(role)
    );
    
    const canViewClients = userRoles.some((role: string) =>
      ['Super Admin', 'Admin', 'List Manager', 'Report View Only', 'New Client Enroller', 'WSPS Dispatcher Add-on', 'BPSR Dispatcher Add-on'].includes(role)
    );

    // Staff profiles from API (bearer token) - only if user has permission
    let staffData: any[] = [];
    if (canViewUsers) {
      try {
        const res = await fetch(`${API_BASE_URL}/staff-profiles`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!res.ok) {
          console.error(
            "Failed to fetch staff profiles:",
            res.status,
            res.statusText
          );
          if (res.status === 401 || res.status === 403)
            throw redirect(302, "/login");
        } else {
          const text = await res.text();
          staffData = JSON.parse(text);

          if (!Array.isArray(staffData)) {
            console.error(
              "API returned non-array for staff profiles:",
              staffData
            );
            staffData = [];
          }
        }
      } catch (err) {
        console.error("Error fetching staff profiles:", err);
        staffData = [];
      }
    }

    // Clients by org (direct from Supabase) - only if user has permission
    let clientsData: any[] = [];
    if (canViewClients) {
      try {
        const { data: clients, error: clientsError } = await supabase
          .from("clients")
          .select("*")
          .eq("org_id", userProfile.org_id)
          .order("last_name", { ascending: true });

        if (clientsError) {
          console.error("Error fetching clients:", clientsError);
        } else {
          clientsData = clients || [];
        }
      } catch (err) {
        console.error("Error fetching clients:", err);
        clientsData = [];
      }
    }

    // Fetch organization's minimum age
    let minimumAge: number = 0;
    try {
      const { data: ageData, error: ageError } = await supabase
        .from("organization")
        .select("client_min_age")
        .eq("org_id", userProfile.org_id)
        .single();
      if (ageError) {
        console.error(ageError);
      } else {
        minimumAge = ageData?.client_min_age ?? 0;
        console.log("🔍 final minimumAge:", minimumAge);
      }
    } catch (err) {
      console.error(err);
      minimumAge = 0;
    }
    
    // Default password
    let dPassword: string = "";
    try {
      const { data: uData, error: uError } = await supabase
        .from("organization")
        .select("user_initial_password")
        .eq("org_id", userProfile.org_id)
        .single();
      if (uError) {
        console.error(uError);
      } else {
        dPassword = uData?.user_initial_password ?? "";
        console.log("🔍 default Password:", dPassword);
      }
    } catch (err) {
      console.error(err);
      dPassword = "";
    }

    return {
      tab,
      staffProfiles: staffData,
      clients: clientsData,
      userProfile,
      session,
      minimumAge,
      dPassword,
    };
  } catch (err: any) {
    console.error("Error in users page load:", err);

    if (err.status === 302) throw err;
    if (err.status) throw err;

    // Return safe defaults instead of throwing
    return {
      tab: "users",
      staffProfiles: [],
      clients: [],
      userProfile: null,
      session: null,
      minimumAge: 0,
      error: err.message || "Failed to load data",
    };
  }
};