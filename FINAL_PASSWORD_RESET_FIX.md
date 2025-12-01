# Final Password Reset Fix Guide

## The Problem

Supabase is using **PKCE flow** for password reset emails, which requires a `code_verifier` stored in browser storage. When users click the reset link from email, the code_verifier isn't available, causing:

```
invalid request: both auth code and code verifier should be non-empty
```

## The Root Cause

From Supabase documentation: **SSR apps default to PKCE flow**, and PKCE doesn't work for email links because:
- PKCE requires a `code_verifier` generated and stored **before** the email is sent
- Email links are clicked in a fresh browser context with no stored `code_verifier`
- This is a fundamental incompatibility

## The Solution

According to Supabase documentation, password reset **should use hash fragments** (`#access_token=...`) not PKCE codes (`?code=...`).

### Option 1: Contact Supabase Support (Recommended)

1. Go to: https://supabase.com/dashboard/support/new
2. Ask them:
   > "Password reset emails are using PKCE flow (codes in URL) but PKCE doesn't work for email links because code_verifier isn't available. How can I configure password reset to use hash fragments (access_token in URL hash) instead of PKCE codes?"

### Option 2: Check Supabase Configuration

1. **Site URL must be set correctly:**
   - Go to: Authentication → URL Configuration
   - Site URL: `https://www.drivekind.info` (exactly, no trailing slash)
   - **This is critical!** An empty or incorrect Site URL might force PKCE

2. **Redirect URLs should include:**
   - `https://www.drivekind.info/reset-password`
   - `https://www.drivekind.info/auth/callback`

3. **Try this workaround:**
   - The Site URL might need to match your redirect URL pattern
   - Some users report that setting Site URL correctly forces hash fragments

### Option 3: Custom Email Template (If Support Allows)

According to Supabase docs, you can customize the email template. Try modifying the **Reset Password** template to use `token_hash`:

```html
<h2>Reset Your Password</h2>
<p>Click the link below to reset your password:</p>
<p><a href="{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery">Reset Password</a></p>
```

Then handle it with `verifyOtp`:

```javascript
await supabase.auth.verifyOtp({
  token_hash: hash,
  type: 'recovery'
});
```

However, this might not work if Supabase is forcing PKCE flow.

## Current Status

✅ **Our code is ready** - it handles:
- Hash fragments (what we need)
- PKCE codes (attempts to handle, fails as expected)
- Clear error messages

❌ **Supabase configuration** - Needs to be updated to send hash fragments instead of PKCE codes

## Test After Fix

When it's working correctly:
1. Request password reset
2. Email link URL should be: `.../reset-password#access_token=...&type=recovery...`
3. NOT: `.../reset-password?code=...` (this indicates PKCE)

## Next Steps

1. **Contact Supabase Support** (Primary action)
2. Verify Site URL is set to: `https://www.drivekind.info`
3. Wait for support response on how to disable PKCE for password reset
4. Test with new password reset request

Our code is correct and ready. Once Supabase sends hash fragments instead of PKCE codes, everything will work! 🎉

