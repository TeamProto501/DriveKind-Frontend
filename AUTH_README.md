# Authentication & Navigation System

## Overview

The DriveKind application now uses a server-side authentication system with automatic redirects. Users are automatically redirected to the login page if they're not authenticated, and the home page is now a proper dashboard within the navigation.

## How It Works

### 1. Server Hooks (`src/hooks.server.ts`)

The authentication check happens at the server level using SvelteKit hooks. This ensures that:
- Unauthenticated users trying to access protected routes are redirected to `/login`
- Authenticated users trying to access `/login` are redirected to the home dashboard
- Public routes (whitelisted) are accessible without authentication

### 2. Whitelisted Routes

The following routes are accessible without authentication:
- `/login` - Login page
- `/register` - Registration page
- `/auth/callback` - OAuth callback handler
- `/auth/logout` - Logout endpoint

To add more public routes, edit the `PUBLIC_ROUTES` array in `src/hooks.server.ts`:

```typescript
const PUBLIC_ROUTES = [
	'/login',
	'/register',
	'/auth/callback',
	'/auth/logout',
	'/forgot-password',  // Add your route here
];
```

### 3. Home Page as Dashboard

The home page (`/`) is now a proper dashboard that:
- Shows personalized content based on user roles
- Displays quick stats and recent activity
- Provides role-specific quick actions
- Is only accessible to authenticated users

### 4. Navigation Integration

The navbar automatically shows/hides based on authentication:
- Authenticated users see the full navigation sidebar
- The navigation is permission-based (items show/hide based on roles)
- "Home" link in the navigation goes to the dashboard

## Page Structure

### Protected Pages (Require Authentication)
- `/` - Home Dashboard
- `/profile` - User Profile
- `/calendar` - Schedule
- `/dispatcher/*` - Dispatcher routes
- `/driver/*` - Driver routes
- `/admin/*` - Admin routes
- All other routes not in the whitelist

### Public Pages (No Authentication Required)
- `/login` - Login page
- `/register` - Registration page
- `/auth/callback` - OAuth callback

## User Flow

### New User
1. Visits any protected route (e.g., `/`)
2. Automatically redirected to `/login`
3. Clicks "Register" link
4. Creates account at `/register`
5. Receives email verification
6. After verification, can log in
7. Redirected to home dashboard (`/`)

### Returning User
1. Visits any route
2. If authenticated: sees the requested page
3. If not authenticated: redirected to `/login`
4. Logs in successfully
5. Redirected to home dashboard (`/`)

### Logged In User
1. Cannot access `/login` (redirected to `/`)
2. Can access all routes based on their permissions
3. Home page shows personalized dashboard
4. Navigation shows role-appropriate menu items

## Role-Based Content

The home dashboard adapts based on user roles:

### Dispatcher/Admin/Super Admin
- Total rides, upcoming rides, completed rides, active drivers stats
- Quick actions: Create New Ride, Manage Drivers, View Schedule
- System overview section (Admin only)

### Driver
- Personal ride stats
- Completion rate
- Quick actions: View My Rides, View Schedule

## Implementation Details

### hooks.server.ts
```typescript
- Checks authentication on every server request
- Redirects unauthenticated users to /login
- Allows whitelisted routes without authentication
- Prevents authenticated users from accessing /login
```

### +layout.svelte
```svelte
- Shows Navbar only when user is authenticated
- Passes session, profile, and roles data to components
```

### +page.svelte (Home)
```svelte
- Personalized dashboard with role-based content
- Shows stats, recent activity, and quick actions
- No login/logout buttons (handled by navbar)
```

## Security Notes

1. **Server-Side Checks**: Authentication is verified on the server, not just client-side
2. **Protected by Default**: All routes require authentication unless whitelisted
3. **Session Validation**: User session is validated on each request
4. **Automatic Redirects**: No manual redirect logic needed in individual pages

## Adding New Routes

### Protected Route
Just create the route normally. It will automatically require authentication.

### Public Route
Add the route to `PUBLIC_ROUTES` in `src/hooks.server.ts`:
```typescript
const PUBLIC_ROUTES = [
	'/login',
	'/register',
	'/your-new-public-route',  // Add here
];
```

## Testing

1. **Test unauthenticated access**: Visit `/` without logging in → Should redirect to `/login`
2. **Test whitelisted routes**: Visit `/register` without logging in → Should load normally
3. **Test authenticated access**: Log in → Should redirect to home dashboard
4. **Test login redirect**: Try to visit `/login` while logged in → Should redirect to `/`
