# ⚠️ CRITICAL: PKCE Password Reset Issue - Supabase Configuration Required

## The Problem

Supabase is using **PKCE (Proof Key for Code Exchange)** flow for password reset emails. This requires a `code_verifier` that must be stored in the browser **before** the email is sent. When users click the reset link from their email, the code_verifier isn't available, causing:

```
invalid request: both auth code and code verifier should be non-empty
```

**This is a fundamental incompatibility** - PKCE doesn't work for email links because there's no browser session to store the code_verifier.

## Root Cause

- **SSR Apps (like ours):** Default to PKCE flow
- **Email Links:** Can't store code_verifier in browser
- **Result:** Password reset fails

## Required Solution: Contact Supabase Support

Unfortunately, **there is no UI setting in Supabase Dashboard** to disable PKCE for password reset. You need to:

### 1. Contact Supabase Support

Go to: https://supabase.com/dashboard/support/new

Ask them:
> "I'm using password reset emails with PKCE flow, but PKCE doesn't work for email links because the code_verifier isn't available when users click from email. How can I configure password reset to use hash fragments (implicit flow) instead of PKCE codes?"

### 2. Alternative: Check for Configuration Option

In Supabase Dashboard → Authentication → **Sign In / Providers** or **Advanced** settings, check if there's an option to:
- Disable PKCE for email flows
- Use implicit flow for password reset
- Configure password reset to use hash fragments

### 3. Temporary Workaround (If Support Doesn't Help)

If Supabase support says this isn't configurable, you may need to:
- Use a custom email template that goes through a different flow
- Implement a custom password reset endpoint
- Use Supabase Admin API with service role key (not recommended for security)

## What We've Already Done in Code

✅ Our code properly handles:
- Hash fragments (`#access_token=...`) - This is what we need
- PKCE codes (`?code=...`) - Attempts to handle but fails (expected)
- Clear error messages explaining the issue

## Expected Behavior After Fix

After Supabase is configured to use hash fragments:
1. User clicks reset link from email
2. URL should be: `https://www.drivekind.info/reset-password#access_token=...&type=recovery&refresh_token=...`
3. Our code will detect hash fragments and create a session
4. User can reset password ✅

## Current Behavior (With PKCE)

1. User clicks reset link from email
2. URL is: `https://www.drivekind.info/reset-password?code=...`
3. Code exchange fails (no code_verifier)
4. Error message shown ❌

## Next Steps

1. **Contact Supabase Support** (Required - no other way to fix this)
2. Wait for their response on how to configure password reset to use hash fragments
3. Update Supabase configuration based on their instructions
4. Test password reset again

This is a **Supabase configuration issue**, not a code issue. Our code is ready to handle hash fragments - we just need Supabase to send them instead of PKCE codes.

