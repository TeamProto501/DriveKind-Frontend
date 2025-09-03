# DriveKind Navigation System

This document provides a comprehensive guide to the navigation system implemented for DriveKind, a ride request and assignment management application.

## Overview

The navigation system is built with Svelte 5 and provides:
- **Role-based navigation** with strict access control
- **Responsive design** for desktop and mobile devices
- **Progressive web app** functionality
- **Real-time notifications** and updates
- **Breadcrumb navigation** for complex workflows
- **Quick action buttons** for common tasks

## Architecture

### Core Components

1. **Navbar.svelte** - Main navigation bar component
2. **RoleGuard.svelte** - Route protection based on user roles
3. **Breadcrumbs.svelte** - Breadcrumb navigation component
4. **navigation.ts** - Navigation configuration and logic
5. **stores/navigation.ts** - State management for navigation

### Role Hierarchy

```
Super Admin (Highest Access)
├── Admin
├── Dispatcher
├── Driver
├── Volunteer
└── Client (Public Access Only)
```

## Installation & Setup

### 1. Dependencies

The navigation system requires these packages (already included in package.json):
- `@lucide/svelte` - Icons
- `@sveltejs/kit` - Routing
- `tailwindcss` - Styling

### 2. Import Components

```svelte
<script>
  import Navbar from '$lib/components/Navbar.svelte';
  import RoleGuard from '$lib/components/RoleGuard.svelte';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
</script>
```

### 3. Update Layout

Replace the basic navigation in `+layout.svelte`:

```svelte
<script>
  import Navbar from '$lib/components/Navbar.svelte';
</script>

<Navbar />
{@render children()}
```

## Usage Examples

### Basic Page with Role Protection

```svelte
<script>
  import RoleGuard from '$lib/components/RoleGuard.svelte';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
</script>

<RoleGuard requiredRoles={['Admin', 'Dispatcher']}>
  <div class="min-h-screen bg-gray-50">
    <Breadcrumbs />
    
    <div class="max-w-7xl mx-auto px-4 py-8">
      <h1>Admin Dashboard</h1>
      <!-- Your page content here -->
    </div>
  </div>
</RoleGuard>
```

### Multiple Role Requirements

```svelte
<!-- Require any of these roles -->
<RoleGuard requiredRoles={['Admin', 'Dispatcher']}>
  <!-- Content for Admin OR Dispatcher -->
</RoleGuard>

<!-- Require all of these roles (use hasAllRoles from store) -->
{#if $hasAllRoles(['Admin', 'Super Admin'])}
  <!-- Content for Admin AND Super Admin -->
{/if}
```

### Using Navigation Store

```svelte
<script>
  import { 
    userRoles, 
    navigationItems, 
    quickActions,
    hasRole,
    navigateTo 
  } from '$lib/stores/navigation';
  
  // Check if user has specific role
  $: isAdmin = $hasRole('Admin');
  
  // Get navigation items for current user
  $: userNavItems = $navigationItems;
  
  // Get quick actions for current user
  $: userQuickActions = $quickActions;
</script>

{#if isAdmin}
  <div class="admin-only-content">
    <!-- Admin specific content -->
  </div>
{/if}
```

## Navigation Configuration

### Adding New Navigation Items

Edit `src/lib/navigation.ts`:

```typescript
export const navigationConfig: NavigationItem[] = [
  // ... existing items ...
  {
    label: 'New Feature',
    href: '/new-feature',
    icon: '🌟',
    roles: ['Admin', 'Dispatcher']
  }
];
```

### Adding Quick Actions

```typescript
export const quickActions = {
  admin: [
    // ... existing actions ...
    { 
      label: 'New Action', 
      href: '/admin/new-action', 
      icon: '⚡' 
    }
  ]
};
```

### Custom Icons

The system maps emoji icons to Lucide components. To add new mappings:

```typescript
function getIconComponent(icon: string) {
  const iconMap: Record<string, any> = {
    // ... existing mappings ...
    '⚡': Zap, // Add new mapping
  };
  
  return iconMap[icon] || User;
}
```

## Role-Based Access Control

### Route Protection

Use `RoleGuard` component to protect routes:

```svelte
<RoleGuard requiredRoles={['Admin']}>
  <!-- Only Admin users can see this content -->
</RoleGuard>
```

### Conditional Rendering

```svelte
{#if $hasRole('Admin')}
  <div class="admin-panel">
    <!-- Admin only content -->
  </div>
{/if}

{#if $hasAnyRole(['Admin', 'Dispatcher'])}
  <div class="management-panel">
    <!-- Content for Admin OR Dispatcher -->
  </div>
{/if}
```

### Programmatic Access Control

```typescript
import { checkPermission } from '$lib/stores/navigation';

function handleAction() {
  if (checkPermission(['Admin'])) {
    // Perform admin action
  } else {
    // Show access denied message
  }
}
```

## Mobile Responsiveness

### Mobile Menu

The navigation automatically adapts to mobile devices:
- Hamburger menu for mobile
- Collapsible navigation items
- Touch-friendly button sizes
- Responsive grid layouts

### Breakpoints

- **Desktop**: Full horizontal navigation
- **Tablet**: Condensed navigation with icons
- **Mobile**: Hamburger menu with slide-out drawer

## Customization

### Styling

The navigation uses Tailwind CSS classes. Customize by:

1. **Modifying Tailwind config** in `tailwind.config.js`
2. **Adding custom CSS** in `src/app.css`
3. **Using CSS variables** for theme colors

### Branding

Update organization branding in the Navbar:

```typescript
// In Navbar.svelte
userOrganization = {
  org_id: 1,
  name: 'Your Organization Name',
  contact_email: 'info@yourorg.com',
  contact_phone: '+1-555-0123'
};
```

### Colors and Themes

The system uses a blue color scheme by default. To customize:

```css
/* In app.css */
:root {
  --primary-color: #3b82f6; /* Blue */
  --primary-hover: #2563eb;
  --accent-color: #10b981; /* Green */
}
```

## Notifications

### Adding Notifications

```typescript
import { addNotification } from '$lib/stores/navigation';

addNotification({
  title: 'Success',
  message: 'User created successfully',
  type: 'success'
});
```

### Notification Types

- `info` - Blue notification
- `success` - Green notification  
- `warning` - Yellow notification
- `error` - Red notification

## Security Features

### Authentication

- Session-based authentication via Supabase
- Automatic logout on session expiry
- Protected routes for authenticated users only

### Authorization

- Role-based access control
- Organization boundary enforcement
- Cross-organization data access prevention

### Audit Logging

- Navigation event logging
- Access attempt tracking
- User action history

## Performance Optimization

### Lazy Loading

- Navigation items load on demand
- Role-based filtering reduces bundle size
- Conditional component rendering

### Caching

- User roles cached in store
- Navigation state persisted
- Route history management

## Troubleshooting

### Common Issues

1. **Navigation not showing**: Check user roles are loaded
2. **Access denied errors**: Verify role permissions
3. **Mobile menu not working**: Check click event handlers
4. **Icons not displaying**: Verify Lucide imports

### Debug Mode

Enable debug logging:

```typescript
// In navigation.ts
const DEBUG = true;

if (DEBUG) {
  console.log('Navigation items:', navigationItems);
  console.log('User roles:', userRoles);
}
```

### Testing

Test navigation with different user roles:

```typescript
// Mock different user roles for testing
setUserRoles(['Admin']);
setUserRoles(['Dispatcher']);
setUserRoles(['Driver']);
```

## API Integration

### User Data Loading

Replace mock data with actual API calls:

```typescript
async function loadUserData() {
  try {
    const response = await fetch('/api/user/profile');
    const userData = await response.json();
    
    setUserProfile(userData.profile);
    setUserRoles(userData.roles);
    setUserOrganization(userData.organization);
  } catch (error) {
    console.error('Error loading user data:', error);
  }
}
```

### Real-time Updates

```typescript
// Subscribe to real-time updates
supabase
  .channel('user_updates')
  .on('postgres_changes', { 
    event: '*', 
    schema: 'public', 
    table: 'userroles' 
  }, (payload) => {
    // Reload user roles on change
    loadUserData();
  })
  .subscribe();
```

## Future Enhancements

### Planned Features

1. **Advanced Search** - Global search across all pages
2. **Recent Pages** - Quick access to recently visited pages
3. **Custom Dashboards** - User-configurable dashboard layouts
4. **Multi-language Support** - Internationalization
5. **Dark Mode** - Theme switching capability

### Extensibility

The navigation system is designed to be easily extensible:
- Plugin architecture for new features
- Custom role definitions
- Dynamic navigation generation
- Third-party integrations

## Support

For questions or issues with the navigation system:

1. Check this documentation
2. Review the component source code
3. Check browser console for errors
4. Verify user permissions and roles
5. Test with different user accounts

## License

This navigation system is part of the DriveKind application and follows the same licensing terms.
