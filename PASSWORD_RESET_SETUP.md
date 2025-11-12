# Password Reset Flow Setup

## Overview

The password reset flow has been implemented using Supabase Auth. Supabase automatically handles email delivery through their email service.

## How It Works

1. **Forgot Password** (`/forgot-password`)
   - User enters their email address
   - Supabase sends a password reset email with a secure token
   - Email contains a link to `/reset-password` with the reset token

2. **Reset Password** (`/reset-password`)
   - User clicks the link from their email
   - Token is validated and a session is created
   - User enters their new password
   - Password is updated in Supabase Auth

## Using Resend for Email Delivery

If you want to use Resend for custom email templates instead of Supabase's default emails:

### Option 1: Configure Resend as SMTP in Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Email Templates**
3. Click on **Password Reset** template
4. Configure **SMTP Settings**:
   - **SMTP Host**: `smtp.resend.com`
   - **SMTP Port**: `465` (SSL) or `587` (TLS)
   - **SMTP User**: `resend`
   - **SMTP Password**: Your Resend API key
   - **Sender Email**: Your verified Resend domain email (e.g., `noreply@yourdomain.com`)

5. Customize the email template HTML to match your branding
6. The reset link will be: `{{ .ConfirmationURL }}`

### Option 2: Use Resend API Directly (Advanced)

If you need more control, you can:
1. Disable Supabase's automatic email sending
2. Create a webhook or server endpoint that listens for password reset requests
3. Use Resend API to send custom emails with the reset link

**Note**: This requires additional implementation and is more complex.

## Configuration

### Supabase Dashboard Settings

1. **Site URL**: Set to your production URL (e.g., `https://yourdomain.com`)
2. **Redirect URLs**: Add your reset password URL:
   - `https://yourdomain.com/reset-password`
   - `http://localhost:5173/reset-password` (for local development)

### Environment Variables

No additional environment variables are needed for the basic flow. Supabase Auth handles everything.

If using Resend SMTP, configure it in the Supabase dashboard (not in environment variables).

## Testing

1. Go to `/forgot-password`
2. Enter a valid user email
3. Check the email inbox for the reset link
4. Click the link to go to `/reset-password`
5. Enter a new password
6. You'll be redirected to `/login` with a success message

## Security Notes

- Reset tokens expire after a set time (configurable in Supabase)
- Tokens are single-use only
- The flow doesn't reveal whether an email exists in the system (security best practice)
- All password updates require a valid session from the reset link

