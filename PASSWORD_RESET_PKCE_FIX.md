# Password Reset PKCE Issue - Fix Required

## The Problem

Password reset emails are using PKCE (Proof Key for Code Exchange) flow, which requires a `code_verifier` stored in the browser. When users click the reset link from their email, the code_verifier is not available, causing this error:

```
invalid request: both auth code and code verifier should be non-empty
```

## Solution: Configure Supabase to Use Hash Fragments

Password reset emails should use **hash fragments** (with `access_token` and `refresh_token` in the URL hash) instead of PKCE codes. This works better for email links.

### Steps to Fix in Supabase Dashboard:

1. **Go to Supabase Dashboard** → Your Project → **Authentication** → **URL Configuration**

2. **Check the Redirect URLs:**
   - Ensure `https://www.drivekind.info/reset-password` is in the list
   - Ensure `https://www.drivekind.info/auth/callback` is in the list

3. **Verify Site URL:**
   - Should be set to: `https://www.drivekind.info` (no trailing slash)

4. **Check Email Templates:**
   - Go to **Authentication** → **Email Templates** → **Reset Password**
   - The template should use `{{ .ConfirmationURL }}` which automatically includes the proper redirect

5. **Try disabling PKCE for password reset** (if this option exists):
   - Check Authentication settings for PKCE-related options
   - Password reset should use implicit flow (hash fragments) not PKCE

## Alternative: Use Service Role Key (Not Recommended for Production)

If you absolutely need PKCE to work, you could use the service role key server-side, but this is **not recommended** for security reasons.

## Current Code Behavior

The current code:
- ✅ Handles hash fragments properly (when Supabase uses them)
- ✅ Attempts to handle PKCE codes (but fails when code_verifier is missing)
- ✅ Provides helpful error messages

## Testing

After configuring Supabase:
1. Request a password reset
2. Check the email link - it should have hash fragments: `#access_token=...&type=recovery&refresh_token=...`
3. NOT a code parameter: `?code=...` (this indicates PKCE flow)

## Contact Supabase Support

If you can't configure Supabase to use hash fragments for password reset, contact Supabase support to ask:
- How to disable PKCE for password reset emails
- How to ensure password reset uses hash fragments instead of PKCE codes

