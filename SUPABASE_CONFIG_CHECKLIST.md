# Supabase Configuration Checklist for Password Reset

## ✅ Steps to Complete in Supabase Dashboard

### 1. Go to URL Configuration
- **Navigation:** Authentication → **URL Configuration** (left sidebar)

### 2. Check Site URL
- [ ] Set to: `https://drivekind.info` 
- [ ] OR: `https://www.drivekind.info` (if you use www)
- [ ] **Important:** No trailing slash
- [ ] Must start with `https://`

### 3. Add Redirect URLs
Add these URLs (one per line) to the Redirect URLs list:

**Production URLs:**
- [ ] `https://drivekind.info/reset-password`
- [ ] `https://www.drivekind.info/reset-password` (if using www)
- [ ] `https://drivekind.info/auth/callback`
- [ ] `https://www.drivekind.info/auth/callback` (if using www)

**Development URLs:**
- [ ] `http://localhost:5173/reset-password`
- [ ] `http://localhost:5173/auth/callback`

### 4. Verify Email Template (Optional but Recommended)
- [ ] Go to: Authentication → **Email Templates** → **Reset Password**
- [ ] Check that the template uses `{{ .ConfirmationURL }}`
- [ ] This ensures proper redirect handling

### 5. Save Changes
- [ ] Click "Save" after making changes

## 🔍 How to Verify

After configuration:
1. Request a password reset email
2. Check the email link URL
3. After clicking, you should land on `/reset-password` page
4. The URL should have either:
   - Hash fragments: `#access_token=...&type=recovery...` ✅ (Preferred)
   - OR code parameter: `?code=...&type=recovery` (Will work with our code)

## ❌ Common Issues

**If you see:** `https://ymwkzttrfelewpprcdtn.supabase.co/drivekind.info`
- **Fix:** Site URL is empty or incorrect. Set it to `https://drivekind.info`

**If you're redirected to login page:**
- **Fix:** Add `https://drivekind.info/reset-password` to Redirect URLs

**If you see PKCE error:**
- **Note:** Our code handles this, but hash fragments are preferred
- The error message will guide users to request a new link

