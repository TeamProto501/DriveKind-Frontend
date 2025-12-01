# 🚨 URGENT: Supabase Configuration Fix Needed

## Critical Issue Found in Logs

From the password reset logs, I can see:
- Supabase is redirecting to: `https://drivekind.info` (no www)
- Your actual site is: `https://www.drivekind.info` (with www)
- **This mismatch is causing the PKCE error!**

## Immediate Action Required

### 1. Update Site URL in Supabase

1. Go to: https://supabase.com/dashboard/project/_/auth/url-configuration
2. Find **"Site URL"** field
3. Change from: `https://drivekind.info`
4. To: `https://www.drivekind.info` (with www!)
5. Click **Save**

### 2. Update Redirect URLs

Add **both** variants to handle any redirect:

**Add these URLs:**
1. ✅ `https://www.drivekind.info/auth/callback`
2. ✅ `https://www.drivekind.info/reset-password`
3. ✅ `https://drivekind.info/auth/callback` (without www - for backwards compatibility)
4. ✅ `https://drivekind.info/reset-password` (without www)

### 3. Why This Matters

- Supabase uses the **Site URL** to construct redirect URLs
- If Site URL is `https://drivekind.info` (no www) but your site uses www, there's a mismatch
- This mismatch can cause Supabase to use the wrong flow (PKCE vs hash fragments)
- The logs show `redirect_to=https://drivekind.info` which doesn't match your actual domain

## After Fixing

1. **Wait 2-3 minutes** for changes to propagate
2. **Request a NEW password reset email** (old emails won't work with new config)
3. The new email should redirect correctly

## Verification

After requesting a new password reset:
- Check the email link URL
- It should redirect to `https://www.drivekind.info/...` (with www)
- If it still redirects to `https://drivekind.info` (no www), Site URL wasn't saved correctly

## Root Cause

The PKCE error happens because:
1. Site URL mismatch causes Supabase to use wrong redirect format
2. PKCE requires browser-stored code_verifier (not available in email links)
3. Hash fragments would work, but Supabase isn't using them due to config mismatch

**Fix the Site URL first, then request a new password reset!**

