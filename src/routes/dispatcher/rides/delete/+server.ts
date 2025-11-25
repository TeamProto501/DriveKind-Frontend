import type { RequestHandler } from "./$types";
import { createSupabaseServerClient } from "$lib/supabase.server";
import { canManageRides } from "$lib/utils/permissions";

export const POST: RequestHandler = async (event) => {
  const supabase = createSupabaseServerClient(event);

  try {
    const { rideId } = await event.request.json();

    const ride_id = Number(rideId);
    if (!ride_id || Number.isNaN(ride_id)) {
      return new Response(
        JSON.stringify({ error: "Invalid ride ID" }),
        { status: 400 }
      );
    }

    // ----- Auth + profile check -----
    const {
      data: { session },
      error: sessionError
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("staff_profiles")
      .select("user_id, org_id, role")
      .eq("user_id", session.user.id)
      .single();

    if (profileError || !profile) {
      console.error("Delete ride – profile error:", profileError);
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        { status: 403 }
      );
    }

    const userRoles = Array.isArray(profile.role)
      ? profile.role
      : profile.role
        ? [profile.role]
        : [];

    if (!canManageRides(userRoles)) {
      return new Response(
        JSON.stringify({ error: "Not authorized to manage rides" }),
        { status: 403 }
      );
    }

    // ----- Delete ride (scoped to org) -----
    const { error: deleteError } = await supabase
      .from("rides")
      .delete()
      .eq("ride_id", ride_id)
      .eq("org_id", profile.org_id);

    if (deleteError) {
      console.error("Delete ride error:", deleteError);
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200 }
    );
  } catch (err) {
    console.error("Unexpected error deleting ride:", err);
    return new Response(
      JSON.stringify({ error: "Unexpected error deleting ride" }),
      { status: 500 }
    );
  }
};