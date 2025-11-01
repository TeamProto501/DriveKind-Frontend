# DriveKind-API Branch Check Fix Guide

## Issue
User creation fails with error: "this isn't the main branch" or the form just refreshes.

## Root Cause
The backend API at `https://drive-kind-api.vercel.app` likely has a branch/environment check that prevents user creation when not deployed from the `main` branch.

## Where to Look in DriveKind-API Repository

### 1. Check Middleware Files
Look for files like:
- `middleware.ts` or `middleware.js`
- `api/middleware/*`
- Any authentication/authorization middleware

**Look for:**
```javascript
// BAD - This is what's likely causing the issue
if (process.env.VERCEL_GIT_COMMIT_REF !== 'main') {
  return res.status(403).json({ error: 'This isn\'t the main branch' });
}

// Or something like:
const branch = process.env.VERCEL_GIT_COMMIT_REF || process.env.BRANCH;
if (branch !== 'main') {
  // Block operations
}
```

### 2. Check Staff Profiles Route
Look in:
- `api/routes/staff-profiles.js` or `api/routes/staff-profiles.ts`
- `api/staff-profiles/*`
- POST endpoint for creating staff profiles

**Look for:**
- Branch/environment checks before allowing POST requests
- Middleware applied to this route

### 3. Check Environment Variable Usage
Search for:
- `VERCEL_GIT_COMMIT_REF`
- `BRANCH`
- `NODE_ENV`
- `DEPLOYMENT_ENV`
- Any environment-based access control

### 4. Common Fixes

#### Option 1: Remove Branch Check Entirely (Recommended for Production)
```javascript
// Remove or comment out branch checks for user creation endpoints
// This should work in all environments
```

#### Option 2: Allow Branch Check But Make It Work in Development
```javascript
// Only block in production if not main branch
if (process.env.NODE_ENV === 'production' && 
    process.env.VERCEL_GIT_COMMIT_REF !== 'main') {
  return res.status(403).json({ error: 'Operations only allowed from main branch in production' });
}
```

#### Option 3: Use Environment Variable Override
```javascript
// Allow override via environment variable
const allowNonMainBranch = process.env.ALLOW_NON_MAIN_BRANCH === 'true';
if (!allowNonMainBranch && 
    process.env.VERCEL_GIT_COMMIT_REF !== 'main' &&
    process.env.NODE_ENV === 'production') {
  return res.status(403).json({ error: 'Main branch required in production' });
}
```

## Files to Check in DriveKind-API

1. **Middleware:**
   - `middleware.ts` or `middleware.js`
   - `api/middleware/*`

2. **Staff Profiles Routes:**
   - `api/routes/staff-profiles.js`
   - `api/routes/staff-profiles.ts`
   - `api/staff-profiles/` directory

3. **Environment Config:**
   - `.env.example`
   - `vercel.json`
   - Any config files

4. **Main Server File:**
   - `server.js` or `server.ts`
   - `index.js` or `index.ts`
   - `api/index.js` or `api/index.ts`

## Quick Fix Command (Once You Find the File)

If you find the branch check in a file, you can:

1. **Remove the check entirely** (if you want operations to work from any branch)
2. **Comment it out temporarily** to test
3. **Modify it** to only block in specific scenarios

## Testing

After fixing:
1. Deploy the API to Vercel
2. Test user creation from the frontend
3. Check that users can be created successfully

## Related Frontend Fix

The frontend has already been updated to show better error messages. When the API is fixed, you should see:
- Clear error messages if something else fails
- Successful user creation if the branch check is the only issue

