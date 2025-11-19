# Password Reset Setup Guide

## Supabase Configuration

To ensure password reset emails redirect to the correct page, you need to configure the following in your Supabase project:

### 1. Site URL Configuration

**IMPORTANT:** The Site URL must be set correctly, otherwise Supabase will construct invalid redirect URLs.

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **URL Configuration**
3. Set the **Site URL** to your production URL with protocol:
   - ✅ Correct: `https://drivekind.info`
   - ❌ Wrong: `drivekind.info` (missing protocol)
   - ❌ Wrong: `https://drivekind.info/` (trailing slash can cause issues)
4. Add the following to the **Redirect URLs** list (make sure they match exactly):
   - `https://drivekind.info/auth/callback` (required - handles code exchange)
   - `https://drivekind.info/reset-password` (optional - for direct hash fragment flow)
   - For local development: `http://localhost:5173/auth/callback` and `http://localhost:5173/reset-password`

**Note:** If you're still getting redirected to `https://ymwkzttrfelewpprcdtn.supabase.co/drivekind.info`, it means the Site URL is likely set incorrectly or the redirect URL format is wrong. Make sure:
- Site URL is `https://drivekind.info` (no trailing slash)
- Redirect URLs include the full protocol and domain

### 2. Email Template

The password reset email template should use `{{ .ConfirmationURL }}` which will automatically include the redirect URL and token.

Example template:
```html
<h2>Reset Your Password</h2>
<p>Hello,</p>
<p>You requested to reset your password for your DriveKind account. Click the link below to set a new password:</p>
<p><a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
<p>If you didn't request this, you can safely ignore this email.</p>
<p>This link will expire in 1 hour.</p>
<p>Best regards,<br>The DriveKind Team</p>
```

### 3. Testing

When testing locally:
- The redirect URL will be `http://localhost:5173/reset-password` (or your local port)
- Make sure your local URL is added to the Redirect URLs in Supabase (for development)
- The email link will contain hash fragments like `#access_token=...&type=recovery&refresh_token=...`

### Troubleshooting

If the reset link redirects to login instead of reset-password:
1. Check that `/reset-password` is in the Redirect URLs list in Supabase
2. Verify the Site URL is set correctly
3. Check the browser console for any errors when clicking the reset link
4. Make sure the hash fragment (`#access_token=...`) is present in the URL

