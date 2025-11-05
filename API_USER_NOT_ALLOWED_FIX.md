# Fix "User not allowed" Error in DriveKind-API

## Error Message
```
"User not allowed"
```

## Root Cause
The API is blocking user creation because it doesn't recognize the requesting user as having permission to create staff profiles.

## Where to Fix in DriveKind-API

### 1. Check Staff Profiles POST Endpoint
**File:** `api/routes/staff-profiles.js` or `api/routes/staff-profiles.ts`

**Look for:**
```javascript
// POST endpoint for creating staff profiles
router.post('/staff-profiles', async (req, res) => {
  // Look for permission checks here
  if (!isAllowed || !hasPermission) {
    return res.json([{success: 1, error: 2}, false, "User not allowed"]);
  }
  // ... rest of the code
});
```

### 2. Check Permission/Authorization Middleware
**Files to check:**
- `api/middleware/auth.js` or `api/middleware/auth.ts`
- `api/middleware/permissions.js`
- Any middleware that checks user roles

**Look for:**
```javascript
// This might be checking for Admin/Super Admin role
const userRole = req.user.role;
if (!userRole.includes('Admin') && !userRole.includes('Super Admin')) {
  return res.json([{success: 1, error: 2}, false, "User not allowed"]);
}
```

### 3. Check Role Verification
**Common issues:**
- Role might be stored as string instead of array
- Role check might be case-sensitive
- Role might not be properly extracted from JWT token

**Fix example:**
```javascript
// BAD - strict check
if (req.user.role !== 'Admin') {
  return res.json([{success: 1, error: 2}, false, "User not allowed"]);
}

// GOOD - flexible check
const userRole = req.user.role;
const isAdmin = Array.isArray(userRole) 
  ? userRole.includes('Admin') || userRole.includes('Super Admin')
  : userRole === 'Admin' || userRole === 'Super Admin';

if (!isAdmin) {
  return res.json([{success: 1, error: 2}, false, "User not allowed"]);
}
```

### 4. Check JWT Token Parsing
**Look for where user info is extracted from token:**
```javascript
// Make sure the role is being extracted correctly from the JWT
const decoded = jwt.verify(token, secret);
const userRole = decoded.role; // Check if this is working
```

## Quick Fix Options

### Option 1: Fix Role Check (Recommended)
```javascript
// In staff-profiles POST route
router.post('/staff-profiles', authenticateToken, async (req, res) => {
  try {
    // Get user role - handle both string and array formats
    const userRole = req.user?.role;
    
    // Check if user is Admin or Super Admin
    const isAuthorized = 
      (Array.isArray(userRole) && (userRole.includes('Admin') || userRole.includes('Super Admin'))) ||
      (typeof userRole === 'string' && (userRole === 'Admin' || userRole === 'Super Admin')) ||
      (req.user?.role?.includes && req.user.role.includes('Admin'));
    
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        error: "User not allowed. Admin or Super Admin role required."
      });
    }
    
    // Proceed with user creation
    // ... rest of the code
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});
```

### Option 2: Temporarily Remove Permission Check (For Testing)
```javascript
// Comment out the permission check temporarily
// if (!isAuthorized) {
//   return res.json([{success: 1, error: 2}, false, "User not allowed"]);
// }
```

### Option 3: Add Debugging
```javascript
// Add logging to see what's being checked
console.log('User making request:', req.user);
console.log('User role:', req.user?.role);
console.log('Role type:', typeof req.user?.role);
console.log('Is array?', Array.isArray(req.user?.role));
```

## What to Check

1. **User Role Format:**
   - Is role stored as `"Admin"` (string)?
   - Is role stored as `["Admin"]` (array)?
   - Is role stored as `["Admin", "Dispatcher"]` (array with multiple)?

2. **Token Parsing:**
   - Is the JWT token being decoded correctly?
   - Is the role field being extracted from the token?
   - Check the `authenticateToken` middleware

3. **Database Query:**
   - When fetching user profile, is the role being retrieved correctly?
   - Check the database query that fetches user info for the request

## Testing

After fixing:
1. Try creating a user again from the frontend
2. Check the API logs to see what user role is being checked
3. Verify the user making the request has Admin or Super Admin role in the database

## Frontend Status

✅ **Frontend is working correctly** - it's properly displaying the error message "User not allowed"

The fix needs to be in the **DriveKind-API repository** to allow Admin/Super Admin users to create staff profiles.




