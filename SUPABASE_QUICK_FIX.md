# ⚠️ QUICK FIX: Supabase Password Reset Configuration

## Current Status
- ✅ Email template: Correct (uses `{{ .ConfirmationURL }}`)
- ✅ Redirect URL: `https://drivekind.info/reset-password` (exists)
- ❌ **Site URL: NOT SET or INCORRECT** ← **THIS IS THE PROBLEM!**
- ❌ **Missing:** `https://drivekind.info/auth/callback` redirect URL

## Step-by-Step Fix

### Step 1: Set Site URL (CRITICAL!)

1. In Supabase Dashboard → Authentication → URL Configuration
2. Find the **"Site URL"** field
3. Enter exactly (copy/paste this):
   ```
   https://drivekind.info
   ```
4. Click **"Save changes"** button

**Important:**
- ✅ Must start with `https://`
- ✅ No trailing slash
- ✅ No www (unless your site uses www)

### Step 2: Add Missing Redirect URL

1. In the same "URL Configuration" page
2. Find **"Redirect URLs"** section
3. Click **"Add URL"** button
4. Enter:
   ```
   https://drivekind.info/auth/callback
   ```
5. Click **"Save changes"**

### Step 3: If Your Site Uses www

If users access your site at `https://www.drivekind.info`, also add:
- `https://www.drivekind.info/reset-password`
- `https://www.drivekind.info/auth/callback`

## What Should Be There

### Site URL:
```
https://drivekind.info
```

### Redirect URLs (should have at least):
1. `https://drivekind.info/reset-password`
2. `https://drivekind.info/auth/callback`

### Optional (if using www):
3. `https://www.drivekind.info/reset-password`
4. `https://www.drivekind.info/auth/callback`

## After Saving

1. **Wait 1-2 minutes** for changes to propagate
2. **Request a new password reset email** (old emails won't work)
3. Click the link in the new email
4. Should now redirect to `/reset-password` page ✅

## Common Mistakes

❌ **Wrong Site URL:**
- `drivekind.info` (missing https://)
- `https://drivekind.info/` (has trailing slash)
- Empty/blank

✅ **Correct Site URL:**
- `https://drivekind.info` (exactly like this)

## Still Not Working?

1. Check browser console for errors (F12)
2. Check the email link URL - what does it show?
3. Verify both URLs are saved (refresh the page and check)
4. Make sure you requested a NEW password reset AFTER saving changes

