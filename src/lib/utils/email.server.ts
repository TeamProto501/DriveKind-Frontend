// $lib/utils/email.server.ts
// Email utility for sending driver assignment notifications via Resend

export interface RideAssignmentEmailData {
  // Driver info
  driverEmail: string;
  driverFirstName: string;
  
  // Client info
  clientFirstName: string;
  clientLastName: string;
  clientPhone?: string;
  clientSecondaryPhone?: string;
  clientAddress: string;
  clientCity: string;
  clientState: string;
  clientZip: string;
  clientComments?: string; // other_limitations field
  
  // Emergency contact
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  
  // Ride/Appointment info
  rideId: number;
  appointmentDate: string; // formatted date
  appointmentTime: string; // formatted time
  destinationName?: string;
  destinationAddress: string;
  destinationCity: string;
  destinationState: string;
  destinationZip: string;
  usingOrgCar: boolean;
  rideComments?: string; // notes field
  
  // Organization info
  organizationName: string;
  appUrl: string;
}

/**
 * Format appointment date for display (e.g., "2026-01-06")
 */
function formatDate(dateStr: string): string {
  if (!dateStr) return 'Not specified';
  
  const cleaned = dateStr.replace(/Z$/, '');
  const date = new Date(cleaned);
  
  if (isNaN(date.getTime())) return 'Not specified';
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Format time for display (e.g., "11:40 AM")
 */
function formatTime(dateStr: string): string {
  if (!dateStr) return 'Not specified';
  
  const cleaned = dateStr.replace(/Z$/, '');
  const date = new Date(cleaned);
  
  if (isNaN(date.getTime())) return 'Not specified';
  
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Format full address
 */
function formatAddress(address: string, city: string, state: string, zip: string): string {
  const parts = [address];
  const cityStateZip = [city, state].filter(Boolean).join(', ');
  if (cityStateZip || zip) {
    parts.push(`${cityStateZip} ${zip}`.trim());
  }
  return parts.join(' ');
}

/**
 * Generate the HTML email matching sponsor template structure
 */
export function generateDriverAssignmentEmail(data: RideAssignmentEmailData): { subject: string; html: string; text: string } {
  const subject = `New Ride Assignment - ${data.clientFirstName} ${data.clientLastName}`;
  
  const destinationFullAddress = formatAddress(
    data.destinationAddress,
    data.destinationCity,
    data.destinationState,
    data.destinationZip
  );
  
  const clientFullAddress = formatAddress(
    data.clientAddress,
    data.clientCity,
    data.clientState,
    data.clientZip
  );
  
  // Format phone numbers for display
  const clientPhones = [data.clientPhone, data.clientSecondaryPhone]
    .filter(Boolean)
    .join(' | ');
  
  const rideUrl = `${data.appUrl}/driver/rides?view=${data.rideId}`;
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Ride Assignment</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.5; color: #333333; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      
      <!-- Header -->
      <div style="background-color: #2563eb; padding: 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: normal;">
          You have been assigned a new appointment.
        </h1>
      </div>
      
      <!-- Content -->
      <div style="padding: 25px;">
        
        <!-- Appointment Details Section -->
        <div style="margin-bottom: 25px;">
          <h2 style="color: #2563eb; font-size: 16px; margin: 0 0 15px 0; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;">
            Appointment Details
          </h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; width: 120px; color: #666666; font-weight: bold;">Date:</td>
              <td style="padding: 6px 0;">${data.appointmentDate}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #666666; font-weight: bold;">Time:</td>
              <td style="padding: 6px 0;">${data.appointmentTime}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #666666; font-weight: bold; vertical-align: top;">Address:</td>
              <td style="padding: 6px 0;">
                ${data.destinationName ? `<strong>${data.destinationName}</strong><br>` : ''}
                ${destinationFullAddress}
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #666666; font-weight: bold;">Using ${data.organizationName} Car:</td>
              <td style="padding: 6px 0;">${data.usingOrgCar ? 'Yes' : 'No'}</td>
            </tr>
            ${data.rideComments ? `
            <tr>
              <td style="padding: 6px 0; color: #666666; font-weight: bold; vertical-align: top;">Comments:</td>
              <td style="padding: 6px 0;">${data.rideComments}</td>
            </tr>
            ` : ''}
          </table>
        </div>
        
        <!-- Rider Details Section -->
        <div style="margin-bottom: 25px;">
          <h2 style="color: #2563eb; font-size: 16px; margin: 0 0 15px 0; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;">
            Rider Details
          </h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; width: 120px; color: #666666; font-weight: bold;">Name:</td>
              <td style="padding: 6px 0;">${data.clientFirstName} ${data.clientLastName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #666666; font-weight: bold;">Phone:</td>
              <td style="padding: 6px 0;">${clientPhones || 'Not provided'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #666666; font-weight: bold; vertical-align: top;">Address:</td>
              <td style="padding: 6px 0;">${clientFullAddress}</td>
            </tr>
            ${data.clientComments ? `
            <tr>
              <td style="padding: 6px 0; color: #666666; font-weight: bold; vertical-align: top;">Comments:</td>
              <td style="padding: 6px 0;">${data.clientComments}</td>
            </tr>
            ` : ''}
          </table>
        </div>
        
        <!-- Emergency Contact Section -->
        ${data.emergencyContactName || data.emergencyContactPhone ? `
        <div style="margin-bottom: 25px;">
          <h2 style="color: #2563eb; font-size: 16px; margin: 0 0 15px 0; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;">
            Emergency Contact
          </h2>
          <table style="width: 100%; border-collapse: collapse;">
            ${data.emergencyContactName ? `
            <tr>
              <td style="padding: 6px 0; width: 120px; color: #666666; font-weight: bold;">Name:</td>
              <td style="padding: 6px 0;">${data.emergencyContactName}</td>
            </tr>
            ` : ''}
            ${data.emergencyContactPhone ? `
            <tr>
              <td style="padding: 6px 0; color: #666666; font-weight: bold;">Phone:</td>
              <td style="padding: 6px 0;">${data.emergencyContactPhone}</td>
            </tr>
            ` : ''}
          </table>
        </div>
        ` : ''}
        
        <!-- View Appointment Button -->
        <div style="text-align: center; margin: 30px 0;">
          <p style="margin: 0 0 15px 0;">You can view the appointment here</p>
          <a href="${rideUrl}" 
             style="display: inline-block; padding: 12px 30px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold;">
            View Appointment
          </a>
        </div>
        
      </div>
      
      <!-- Footer -->
      <div style="background-color: #f8f9fa; padding: 20px; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0 0 10px 0; font-size: 13px; color: #666666; text-align: center;">
          <strong>${data.organizationName}</strong> will never ask you for your password.
        </p>
        <p style="margin: 0; font-size: 11px; color: #999999; text-align: center; line-height: 1.4;">
          The content of this email is confidential and intended for the recipient specified in message only. 
          It is strictly forbidden to share any part of this message with any third party, without a written consent of the sender. 
          If you received this message by mistake, please reply to this message and follow with its deletion, 
          so that we can ensure such a mistake does not occur in the future.
        </p>
      </div>
      
    </div>
  </div>
</body>
</html>
  `.trim();
  
  // Plain text version
  const text = `
You have been assigned a new appointment.

APPOINTMENT DETAILS
-------------------
Date: ${data.appointmentDate}
Time: ${data.appointmentTime}
Address: ${data.destinationName ? data.destinationName + '\n' : ''}${destinationFullAddress}
Using ${data.organizationName} Car: ${data.usingOrgCar ? 'Yes' : 'No'}
${data.rideComments ? `Comments: ${data.rideComments}` : ''}

RIDER DETAILS
-------------
Name: ${data.clientFirstName} ${data.clientLastName}
Phone: ${clientPhones || 'Not provided'}
Address: ${clientFullAddress}
${data.clientComments ? `Comments: ${data.clientComments}` : ''}

${data.emergencyContactName || data.emergencyContactPhone ? `EMERGENCY CONTACT
-----------------
${data.emergencyContactName ? `Name: ${data.emergencyContactName}` : ''}
${data.emergencyContactPhone ? `Phone: ${data.emergencyContactPhone}` : ''}
` : ''}

You can view the appointment here: ${rideUrl}

---
${data.organizationName} will never ask you for your password.

The content of this email is confidential and intended for the recipient specified in message only. It is strictly forbidden to share any part of this message with any third party, without a written consent of the sender. If you received this message by mistake, please reply to this message and follow with its deletion, so that we can ensure such a mistake does not occur in the future.
  `.trim();
  
  return { subject, html, text };
}

/**
 * Helper to extract date and time from appointment timestamp
 */
export function parseAppointmentDateTime(appointmentTime: string): { date: string; time: string } {
  if (!appointmentTime) {
    return { date: 'Not specified', time: 'Not specified' };
  }
  
  return {
    date: formatDate(appointmentTime),
    time: formatTime(appointmentTime)
  };
}

/**
 * Send email via Resend API
 */
export async function sendDriverAssignmentEmail(
  data: RideAssignmentEmailData,
  resendApiKey: string,
  fromEmail: string = 'notifications@drivekind.info'
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    const { subject, html, text } = generateDriverAssignmentEmail(data);
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `${data.organizationName} <${fromEmail}>`,
        to: [data.driverEmail],
        subject,
        html,
        text
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Resend API error:', errorData);
      return { success: false, error: errorData.message || 'Failed to send email' };
    }
    
    const result = await response.json();
    console.log('Email sent successfully via Resend:', result.id);
    return { success: true, messageId: result.id };
    
  } catch (err: any) {
    console.error('Error in sendDriverAssignmentEmail:', err);
    return { success: false, error: err.message || 'Unknown error sending email' };
  }
}