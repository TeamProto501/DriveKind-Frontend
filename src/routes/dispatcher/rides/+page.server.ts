import type { PageServerLoad } from "./$types";
import { createSupabaseServerClient } from "$lib/supabase.server";
import { redirect } from "@sveltejs/kit";
import { canManageRides } from "$lib/utils/permissions";

export const load: PageServerLoad = async (event) => {
  const supabase = createSupabaseServerClient(event);

  try {
    // Session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw redirect(302, "/login");
    }

    // Profile (must have ride management permissions)
    const { data: profile, error: profileError } = await supabase
      .from("staff_profiles")
      .select("user_id, org_id, first_name, last_name, role")
      .eq("user_id", session.user.id)
      .single();

    if (profileError || !profile) {
      return {
        session,
        rides: [],
        drivers: [],
        clients: [],
        calls: [],
        destinations: [],
        profile: null,
        organization: null,
        rideRequests: [],
        error: "Profile not found. Please contact your administrator.",
      };
    }

    // Get user roles
    const userRoles = Array.isArray(profile.role)
      ? profile.role
      : profile.role
      ? [profile.role]
      : [];

    // Check permissions
    if (!canManageRides(userRoles)) {
      throw redirect(302, "/");
    }

    // Rides
    const { data: rawRides, error: ridesError } = await supabase
      .from("rides")
      .select(
        `
        ride_id,
        org_id,
        client_id,
        dispatcher_user_id,
        dispatchers:dispatcher_user_id (
          first_name,
          last_name
        ),
        driver_assigned_by,
        assigner:driver_assigned_by (
          first_name,
          last_name
        ),
        created_at,
        alt_pickup_address,
        dropoff_address,
        appointment_time,
        status,
        notes,
        miles_driven,
        hours,
        donation,
        riders,
        pickup_time,
        driver_user_id,
        round_trip,
        purpose,
        estimated_appointment_length,
        destination_name,
        alt_pickup_city,
        alt_pickup_state,
        alt_pickup_zipcode,
        dropoff_city,
        dropoff_state,
        dropoff_zipcode,
        pickup_from_home,
        call_id,
        alt_pickup_address2,
        dropoff_address2,
        donation_amount,
        completion_status,
        trip_type,
        clients:client_id (
          first_name,
          last_name,
          primary_phone,
          street_address,
          address2,
          city,
          state,
          zip_code,
          other_limitations
        ),
        drivers:driver_user_id (
          first_name,
          last_name
        )
      `
      )
      .eq("org_id", profile.org_id)
      .order("appointment_time", { ascending: true });

    const rides = rawRides || [];

    // Drivers (needed for pending request name resolution)
    const { data: drivers } = await supabase
      .from("staff_profiles")
      .select("user_id, first_name, last_name, role")
      .eq("org_id", profile.org_id)
      .contains("role", ["Driver"]);

    // Ride Requests
    type RideRequestRow = {
      ride_id: number;
      driver_id: string;
      denied: boolean | null;
    };

    let rideRequests: RideRequestRow[] = [];

    if (rides.length > 0) {
      const rideIds = rides.map((r) => r.ride_id);

      const { data: rrData } = await supabase
        .from("ride_requests")
        .select("ride_id, driver_id, denied")
        .in("ride_id", rideIds);

      rideRequests = (rrData as RideRequestRow[]) ?? [];
    }

    // Build driver-name lookup
    const driverNameMap = new Map<
      string,
      { first_name: string | null; last_name: string | null }
    >();
    (drivers || []).forEach((d) => {
      driverNameMap.set(d.user_id, {
        first_name: d.first_name,
        last_name: d.last_name,
      });
    });

    // Attach pending driver info to each ride
    const ridesWithPending = rides.map((ride) => {
      const pendingReqs = rideRequests.filter(
        (rr) =>
          Number(rr.ride_id) === Number(ride.ride_id) &&
          (rr.denied === false || rr.denied === null)
      );

      const pendingDrivers = pendingReqs
        .map((rr) => {
          const name = driverNameMap.get(rr.driver_id);
          if (!name) return null;
          return {
            driver_id: rr.driver_id,
            first_name: name.first_name,
            last_name: name.last_name,
          };
        })
        .filter((x) => x !== null) as {
        driver_id: string;
        first_name: string | null;
        last_name: string | null;
      }[];

      return {
        ...ride,
        hasPendingRequests: pendingDrivers.length > 0,
        pendingDrivers,
        pendingRequestsCount: pendingDrivers.length,
      };
    });

    // Clients
    const { data: clients } = await supabase
      .from("clients")
      .select(
        `
        client_id,
        org_id,
        first_name,
        last_name,
        primary_phone,
        email,
        street_address,
        address2,
        city,
        state,
        zip_code,
        other_limitations,
        mobility_assistance_enum
      `
      )
      .eq("org_id", profile.org_id)
      .order("first_name", { ascending: true });

    // Organization
    let organization = null;
    if (profile?.org_id) {
      const { data: orgData } = await supabase
        .from("organization")
        .select(
          `org_id, "days-off", min_days_in_advance_for_ride_requests, client_max_weekly_rides`
        )
        .eq("org_id", profile.org_id)
        .single();

      organization = orgData;
    }

    // Calls
    const { data: calls } = await supabase
      .from("calls")
      .select(
        "call_id, org_id, call_time, call_type, caller_first_name, caller_last_name"
      )
      .eq("org_id", profile.org_id)
      .order("call_time", { ascending: false });

    // Destinations
    const { data: destinations } = await supabase
      .from("destinations")
      .select(
        "destination_id, org_id, location_name, address, address2, city, state, zipcode"
      )
      .eq("org_id", profile.org_id)
      .order("location_name", { ascending: true });

    return {
      session,
      rides: ridesWithPending,
      drivers: drivers || [],
      clients: clients || [],
      calls: calls || [],
      destinations: destinations || [],
      profile,
      organization,
      rideRequests,
      error: null,
    };
  } catch (error) {
    if (error instanceof Response) throw error;
    return {
      session: null,
      rides: [],
      drivers: [],
      clients: [],
      calls: [],
      destinations: [],
      profile: null,
      organization: null,
      rideRequests: [],
      error: "Failed to load rides data",
    };
  }
};