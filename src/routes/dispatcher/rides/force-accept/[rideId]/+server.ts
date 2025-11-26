// src/routes/dispatcher/rides/force-accept/[rideId]/+server.ts
// Auto assign a ride to a driver with email notification

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSupabaseServerClient } from '$lib/supabase.server';
import { 
  sendDriverAssignmentEmail, 
  parseAppointmentDateTime,
  type RideAssignmentEmailData 
} from '$lib/utils/email.server';

// Environment variables
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'notifications@drivekind.info';
const APP_URL = process.env.PUBLIC_APP_URL || 'https://drivekind.info';

export const POST: RequestHandler = async (event) => {
  console.log('=== AUTO ASSIGN ENDPOINT CALLED ===');
  
  try {
    const rideId = parseInt(event.params.rideId);
    console.log('Ride ID:', rideId);
    
    const body = await event.request.json();
    const { driver_user_id } = body;
    
    if (!driver_user_id) {
      return json({ error: 'driver_user_id is required' }, { status: 400 });
    }
    
    const supabase = createSupabaseServerClient(event);
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get dispatcher's profile
    const { data: profile, error: profileError } = await supabase
      .from('staff_profiles')
      .select('user_id, org_id, role')
      .eq('user_id', user.id)
      .single();
    
    if (profileError || !profile) {
      return json({ error: 'Profile not found' }, { status: 404 });
    }
    
    // Check dispatcher/admin role
    const hasDispatcherRole = profile.role && (
      Array.isArray(profile.role)
        ? (profile.role.includes('Dispatcher') || profile.role.includes('Admin') || profile.role.includes('Super Admin'))
        : (profile.role === 'Dispatcher' || profile.role === 'Admin' || profile.role === 'Super Admin')
    );
    
    if (!hasDispatcherRole) {
      return json({ error: 'Access denied. Dispatcher or Admin role required.' }, { status: 403 });
    }
    
    // Get ride with full client details including emergency contact
    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .select(`
        *,
        clients:client_id (
          first_name,
          last_name,
          primary_phone,
          secondary_phone,
          street_address,
          address2,
          city,
          state,
          zip_code,
          other_limitations,
          emergency_contact_name,
          emergency_contact_phone,
          emergency_contact_relationship
        )
      `)
      .eq('ride_id', rideId)
      .eq('org_id', profile.org_id)
      .single();
    
    if (rideError || !ride) {
      console.error('Ride error:', rideError);
      return json({ error: 'Ride not found or access denied' }, { status: 404 });
    }
    
    // Get driver details
    const { data: driver, error: driverError } = await supabase
      .from('staff_profiles')
      .select('user_id, org_id, role, first_name, last_name, email')
      .eq('user_id', driver_user_id)
      .eq('org_id', profile.org_id)
      .single();
    
    if (driverError || !driver) {
      return json({ error: 'Driver not found' }, { status: 404 });
    }
    
    // Verify driver role
    const hasDriverRole = driver.role && (
      Array.isArray(driver.role)
        ? driver.role.includes('Driver')
        : driver.role === 'Driver'
    );
    
    if (!hasDriverRole) {
      return json({ error: 'Selected user is not a driver' }, { status: 400 });
    }
    
    // Get organization details
    const { data: organization } = await supabase
      .from('organization')
      .select('org_id, org_name')
      .eq('org_id', profile.org_id)
      .single();
    
    // Update ride: assign driver and set status to Scheduled
    const { error: updateError } = await supabase
      .from('rides')
      .update({
        driver_user_id: driver_user_id,
        status: 'Scheduled'
      })
      .eq('ride_id', rideId);
    
    if (updateError) {
      console.error('Update error:', updateError);
      return json({ error: `Failed to assign driver: ${updateError.message}` }, { status: 500 });
    }
    
    console.log('=== RIDE ASSIGNED SUCCESSFULLY ===');
    
    // Send email notification
    let emailSent = false;
    let emailError: string | undefined;
    let emailMessageId: string | undefined;
    
    if (driver.email && RESEND_API_KEY) {
      try {
        // Determine client address (pickup location)
        let clientAddress = ride.clients?.street_address || '';
        let clientCity = ride.clients?.city || '';
        let clientState = ride.clients?.state || '';
        let clientZip = ride.clients?.zip_code || '';
        
        // If not picking up from home, use alt pickup address
        if (!ride.pickup_from_home && ride.alt_pickup_address) {
          clientAddress = ride.alt_pickup_address;
          clientCity = ride.alt_pickup_city || clientCity;
          clientState = ride.alt_pickup_state || clientState;
          clientZip = ride.alt_pickup_zipcode || clientZip;
        }
        
        // Parse appointment date/time
        const { date: appointmentDate, time: appointmentTime } = parseAppointmentDateTime(ride.appointment_time);
        
        // Build email data matching sponsor template
        const emailData: RideAssignmentEmailData = {
          // Driver
          driverEmail: driver.email,
          driverFirstName: driver.first_name || 'Driver',
          
          // Client/Rider
          clientFirstName: ride.clients?.first_name || 'Client',
          clientLastName: ride.clients?.last_name || '',
          clientPhone: ride.clients?.primary_phone || undefined,
          clientSecondaryPhone: ride.clients?.secondary_phone || undefined,
          clientAddress,
          clientCity,
          clientState,
          clientZip,
          clientComments: ride.clients?.other_limitations || undefined,
          
          // Emergency Contact
          emergencyContactName: ride.clients?.emergency_contact_name || undefined,
          emergencyContactPhone: ride.clients?.emergency_contact_phone || undefined,
          
          // Appointment/Ride
          rideId: ride.ride_id,
          appointmentDate,
          appointmentTime,
          destinationName: ride.destination_name || undefined,
          destinationAddress: ride.dropoff_address || '',
          destinationCity: ride.dropoff_city || '',
          destinationState: ride.dropoff_state || '',
          destinationZip: ride.dropoff_zipcode || '',
          usingOrgCar: ride.using_org_car || false, // Add this field to rides table if needed
          rideComments: ride.notes || undefined,
          
          // Organization
          organizationName: organization?.org_name || 'DriveKind',
          appUrl: APP_URL
        };
        
        const result = await sendDriverAssignmentEmail(emailData, RESEND_API_KEY, FROM_EMAIL);
        
        if (result.success) {
          emailSent = true;
          emailMessageId = result.messageId;
          console.log('Email sent successfully:', result.messageId);
        } else {
          emailError = result.error;
          console.error('Email failed:', result.error);
        }
        
      } catch (err: any) {
        console.error('Error sending email:', err);
        emailError = err.message || 'Unknown email error';
      }
    } else if (!driver.email) {
      console.log('Driver has no email address, skipping notification');
      emailError = 'Driver has no email address';
    } else if (!RESEND_API_KEY) {
      console.log('RESEND_API_KEY not configured, skipping email');
      emailError = 'Email service not configured';
    }
    
    return json({ 
      success: true,
      emailSent,
      emailError,
      emailMessageId
    });
    
  } catch (error: any) {
    console.error('=== ERROR IN AUTO ASSIGN ===');
    console.error('Error:', error);
    return json({ error: `Internal server error: ${error.message}` }, { status: 500 });
  }
};

