// src/lib/utils/permissions.ts
// Comprehensive role-based permission checking utilities

export type Role = 
  | 'Super Admin'
  | 'Admin'
  | 'Dispatcher'
  | 'Driver'
  | 'Volunteer'
  | 'Client'
  | 'Coordinator'
  | 'New Client Enroller'
  | 'Report View Only'
  | 'List Manager'
  | 'Report Manager'
  | 'WSPS Dispatcher Add-on'
  | 'BPSR Dispatcher Add-on'
  | 'Bri Pen Driver Add-on';

/**
 * Check if a user has at least one of the specified roles
 */
export function hasRole(userRoles: Role[] | Role | null | undefined, checkRoles: Role | Role[]): boolean {
  if (!userRoles) return false;
  
  const rolesArray = Array.isArray(userRoles) ? userRoles : [userRoles];
  const checkArray = Array.isArray(checkRoles) ? checkRoles : [checkRoles];
  
  return checkArray.some(role => rolesArray.includes(role));
}

/**
 * Check if a user has ALL of the specified roles
 */
export function hasAllRoles(userRoles: Role[] | Role | null | undefined, checkRoles: Role[]): boolean {
  if (!userRoles) return false;
  
  const rolesArray = Array.isArray(userRoles) ? userRoles : [userRoles];
  return checkRoles.every(role => rolesArray.includes(role));
}

// ============================================
// ROUTE ACCESS PERMISSIONS
// ============================================

export function canAccessAdminDashboard(roles: Role[] | null | undefined): boolean {
  return hasRole(roles, ['Super Admin', 'Admin', 'Report View Only', 'Report Manager']);
}

export function canAccessUserManagement(roles: Role[] | null | undefined): boolean {
  return hasRole(roles, ['Super Admin', 'Admin', 'List Manager', 'Report View Only', 'New Client Enroller', 'WSPS Dispatcher Add-on', 'BPSR Dispatcher Add-on']);
}

export function canAccessReports(roles: Role[] | null | undefined): boolean {
  return hasRole(roles, ['Super Admin', 'Admin', 'Report View Only', 'Report Manager', 'List Manager', 'New Client Enroller']);
}

export function canAccessDatabase(roles: Role[] | null | undefined): boolean {
  return hasRole(roles, ['Super Admin', 'Admin', 'Report View Only', 'Report Manager', 'List Manager']);
}

export function canAccessDispatcherRides(roles: Role[] | null | undefined): boolean {
  return hasRole(roles, ['Super Admin', 'Admin', 'Dispatcher', 'BPSR Dispatcher Add-on']);
}

export function canAccessDispatcherDestinations(roles: Role[] | null | undefined): boolean {
  return hasRole(roles, ['Super Admin', 'Admin', 'Dispatcher', 'WSPS Dispatcher Add-on', 'BPSR Dispatcher Add-on']);
}

export function canAccessDriverPortal(roles: Role[] | null | undefined): boolean {
  return hasRole(roles, ['Driver']);
}

// ============================================
// CLIENT PERMISSIONS
// ============================================

export function canViewClients(roles: Role[] | null | undefined): boolean {
  return hasRole(roles, [
    'Super Admin',
    'Admin',
    'List Manager',
    'Report View Only',
    'New Client Enroller',
    'WSPS Dispatcher Add-on',
    'BPSR Dispatcher Add-on',
    'Bri Pen Driver Add-on'
  ]);
}

export function canCreateClients(roles: Role[] | null | undefined): boolean {
  return hasRole(roles, [
    'Super Admin',
    'Admin',
    'List Manager',
    'New Client Enroller',
    'WSPS Dispatcher Add-on'
    // Note: BPSR Dispatcher Add-on CANNOT create clients
  ]);
}

export function canEditClients(roles: Role[] | null | undefined): boolean {
  return hasRole(roles, [
    'Super Admin',
    'Admin',
    'List Manager',
    'New Client Enroller',
    'WSPS Dispatcher Add-on',
    'BPSR Dispatcher Add-on'
  ]);
}

export function canDeleteClients(roles: Role[] | null | undefined): boolean {
  return hasRole(roles, ['Super Admin', 'Admin', 'List Manager']);
}

// ============================================
// USER/STAFF PERMISSIONS
// ============================================

export function canViewUsers(roles: Role[] | null | undefined): boolean {
  return hasRole(roles, [
    'Super Admin',
    'Admin',
    'List Manager',
    'Report View Only'
  ]);
}

export function canCreateUsers(roles: Role[] | null | undefined): boolean {
  return hasRole(roles, ['Super Admin', 'Admin', 'List Manager']);
}

export function canEditUsers(roles: Role[] | null | undefined): boolean {
  return hasRole(roles, ['Super Admin', 'Admin', 'List Manager']);
}

export function canDeleteUsers(roles: Role[] | null | undefined): boolean {
  return hasRole(roles, ['Super Admin', 'Admin', 'List Manager']);
}

// ============================================
// REPORT PERMISSIONS
// ============================================

export function canViewReports(roles: Role[] | null | undefined): boolean {
  return hasRole(roles, [
    'Super Admin',
    'Admin',
    'Report View Only',
    'Report Manager',
    'List Manager',
    'New Client Enroller'
  ]);
}

export function canEditReports(roles: Role[] | null | undefined): boolean {
  return hasRole(roles, ['Super Admin', 'Admin', 'Report Manager']);
}

export function canCreateReports(roles: Role[] | null | undefined): boolean {
  return hasRole(roles, ['Super Admin', 'Admin', 'Report Manager']);
}

export function canSaveReports(roles: Role[] | null | undefined): boolean {
  return hasRole(roles, ['Super Admin', 'Admin', 'Report Manager']);
}

export function canLogOwnHoursMiles(roles: Role[] | null | undefined): boolean {
  // All new roles can log their own volunteer hours/miles
  return hasRole(roles, [
    'Super Admin',
    'Admin',
    'Report View Only',
    'Report Manager',
    'List Manager',
    'New Client Enroller',
    'Volunteer',
    'Coordinator'
  ]);
}

// Can access personal reports tab (own volunteer hours/miles)
export function canAccessPersonalReports(roles: Role[] | null | undefined): boolean {
  return hasRole(roles, [
    'Super Admin',
    'Admin',
    'Driver',
    'Dispatcher',
    'Volunteer',
    'Report Manager',
    'Report View Only',
    'List Manager'
  ]);
}

// Can access organization-wide reports tab
export function canAccessOrgReports(roles: Role[] | null | undefined): boolean {
  return hasRole(roles, [
    'Super Admin',
    'Admin',
    'Report Manager',
    'Report View Only',
    'List Manager'
  ]);
}

// Can export reports to CSV (Report View Only explicitly CANNOT)
export function canExportReports(roles: Role[] | null | undefined): boolean {
  // Report View Only is explicitly excluded from exporting
  if (hasRole(roles, ['Report View Only'])) {
    return false;
  }
  
  return hasRole(roles, [
    'Super Admin',
    'Admin',
    'Report Manager',
    'List Manager',
    'Driver',      // Can export their own personal reports
    'Dispatcher',  // Can export their own personal reports
    'Volunteer'    // Can export their own personal reports
  ]);
}

// Can view all drivers in organization reports
export function canViewAllDrivers(roles: Role[] | null | undefined): boolean {
  return canAccessOrgReports(roles);
}

// Can view all clients in organization reports
export function canViewAllClients(roles: Role[] | null | undefined): boolean {
  return canAccessOrgReports(roles);
}

// ============================================
// DATABASE PERMISSIONS
// ============================================

export function canRunDatabaseQueries(roles: Role[] | null | undefined): boolean {
  return hasRole(roles, [
    'Super Admin',
    'Admin',
    'Report View Only',
    'Report Manager',
    'List Manager'
  ]);
}

export function canAccessDatabaseTable(roles: Role[] | null | undefined, tableName: string): boolean {
  // Super Admin and Admin can access all tables
  if (hasRole(roles, ['Super Admin', 'Admin'])) return true;
  
  // Report View Only and Report Manager can access all tables
  if (hasRole(roles, ['Report View Only', 'Report Manager'])) return true;
  
  // List Manager can only access Users and Clients tables
  if (hasRole(roles, ['List Manager'])) {
    const allowedTables = ['staff_profiles', 'clients', 'users'];
    return allowedTables.includes(tableName.toLowerCase());
  }
  
  return false;
}

// ============================================
// DESTINATION PERMISSIONS
// ============================================

export function canViewDestinations(roles: Role[] | null | undefined): boolean {
  return hasRole(roles, [
    'Super Admin',
    'Admin',
    'Dispatcher',
    'WSPS Dispatcher Add-on',
    'BPSR Dispatcher Add-on'
  ]);
}

export function canCreateDestinations(roles: Role[] | null | undefined): boolean {
  return hasRole(roles, [
    'Super Admin',
    'Admin',
    'Dispatcher',
    'BPSR Dispatcher Add-on'
    // Note: WSPS Dispatcher Add-on CANNOT create destinations
  ]);
}

export function canEditDestinations(roles: Role[] | null | undefined): boolean {
  return hasRole(roles, [
    'Super Admin',
    'Admin',
    'Dispatcher',
    'BPSR Dispatcher Add-on'
    // Note: WSPS Dispatcher Add-on CANNOT edit destinations
  ]);
}

export function canDeleteDestinations(roles: Role[] | null | undefined): boolean {
  return hasRole(roles, ['Super Admin', 'Admin', 'Dispatcher']);
}

// ============================================
// RIDE PERMISSIONS
// ============================================

export function canViewRides(roles: Role[] | null | undefined): boolean {
  return hasRole(roles, [
    'Super Admin',
    'Admin',
    'Dispatcher',
    'Driver',
    'BPSR Dispatcher Add-on'
  ]);
}

export function canManageRides(roles: Role[] | null | undefined): boolean {
  // Can access the dispatcher/rides page
  return hasRole(roles, [
    'Super Admin',
    'Admin',
    'Dispatcher',
    'List Manager' // Can view rides for reporting
  ]);
}

export function canCreateRides(roles: Role[] | null | undefined): boolean {
  return hasRole(roles, [
    'Super Admin',
    'Admin',
    'Dispatcher'
    // Note: BPSR Dispatcher Add-on CANNOT create ride requests
  ]);
}

export function canCreateRideRequests(roles: Role[] | null | undefined): boolean {
  // Alias for canCreateRides for backwards compatibility
  return canCreateRides(roles);
}

export function canEditRides(roles: Role[] | null | undefined): boolean {
  return hasRole(roles, [
    'Super Admin',
    'Admin',
    'Dispatcher',
    'Driver' // Drivers can edit their own rides
    // Note: BPSR Dispatcher Add-on CANNOT edit ride info
  ]);
}

export function canEditRideInfo(roles: Role[] | null | undefined): boolean {
  // Alias for canEditRides for backwards compatibility
  return canEditRides(roles);
}

export function canAssignDrivers(roles: Role[] | null | undefined): boolean {
  return hasRole(roles, [
    'Super Admin',
    'Admin',
    'Dispatcher'
  ]);
}

export function canForceAcceptRides(roles: Role[] | null | undefined): boolean {
  return hasRole(roles, [
    'Super Admin',
    'Admin',
    'Dispatcher',
    'BPSR Dispatcher Add-on'
  ]);
}

export function canSendRideRequests(roles: Role[] | null | undefined): boolean {
  return hasRole(roles, ['Super Admin', 'Admin', 'Dispatcher']);
}

// ============================================
// UI DISPLAY HELPERS
// ============================================

/**
 * Determine which tabs to show in admin/users page
 */
export function getVisibleUserTabs(roles: Role[] | null | undefined): {
  showClients: boolean;
  showUsers: boolean;
  showVehicles: boolean;
  showDestinations: boolean;
  showCalls: boolean;
} {
  const isSuperAdminOrAdmin = hasRole(roles, ['Super Admin', 'Admin']);
  const isListManager = hasRole(roles, ['List Manager']);
  const isNewClientEnroller = hasRole(roles, ['New Client Enroller']);
  const isWSPSAddon = hasRole(roles, ['WSPS Dispatcher Add-on']);
  const isBPSRAddon = hasRole(roles, ['BPSR Dispatcher Add-on']);
  const isBriPenAddon = hasRole(roles, ['Bri Pen Driver Add-on']);
  const isReportViewOnly = hasRole(roles, ['Report View Only']);

  return {
    showClients: isSuperAdminOrAdmin || isListManager || isNewClientEnroller || isWSPSAddon || isBPSRAddon || isReportViewOnly || isBriPenAddon,
    showUsers: isSuperAdminOrAdmin || isListManager || isReportViewOnly,
    showVehicles: isSuperAdminOrAdmin,
    showDestinations: isSuperAdminOrAdmin,
    showCalls: isSuperAdminOrAdmin
  };
}

/**
 * Determine if user should only see clients tab (hide other tabs)
 */
export function shouldOnlyShowClientsTab(roles: Role[] | null | undefined): boolean {
  return hasRole(roles, ['New Client Enroller', 'WSPS Dispatcher Add-on', 'BPSR Dispatcher Add-on']) 
    && !hasRole(roles, ['Super Admin', 'Admin', 'List Manager', 'Report View Only']);
}

/**
 * Determine read-only status for a page
 */
export function isReadOnly(roles: Role[] | null | undefined, context: 'clients' | 'users' | 'reports' | 'destinations'): boolean {
  if (hasRole(roles, ['Super Admin', 'Admin'])) return false;
  
  if (context === 'clients') {
    return hasRole(roles, ['Report View Only']);
  }
  
  if (context === 'users') {
    return hasRole(roles, ['Report View Only']);
  }
  
  if (context === 'destinations') {
    return hasRole(roles, ['WSPS Dispatcher Add-on']);
  }
  
  if (context === 'reports') {
    return hasRole(roles, ['Report View Only', 'List Manager', 'New Client Enroller']);
  }
  
  return false;
}

/**
 * Get user-friendly role display name
 */
export function getRoleDisplayName(role: Role): string {
  const displayNames: Record<Role, string> = {
    'Super Admin': 'Super Administrator',
    'Admin': 'Administrator',
    'Dispatcher': 'Dispatcher',
    'Driver': 'Driver',
    'Volunteer': 'Volunteer',
    'Client': 'Client',
    'Coordinator': 'Coordinator',
    'New Client Enroller': 'Client Enroller',
    'Report View Only': 'Report Viewer',
    'List Manager': 'List Manager',
    'Report Manager': 'Report Manager',
    'WSPS Dispatcher Add-on': 'WSPS Dispatcher',
    'BPSR Dispatcher Add-on': 'BPSR Dispatcher',
    'Bri Pen Driver Add-on': 'Bri Pen Driver'
  };
  
  return displayNames[role] || role;
}

/**
 * Get role description
 */
export function getRoleDescription(role: Role): string {
  const descriptions: Record<Role, string> = {
    'Super Admin': 'Full system access with all privileges',
    'Admin': 'Full administrative access to all features',
    'Dispatcher': 'Manage ride requests and assignments',
    'Driver': 'View and complete assigned rides',
    'Volunteer': 'Limited volunteer access',
    'Client': 'Client portal access',
    'Coordinator': 'Coordination and oversight role',
    'New Client Enroller': 'Create and edit client information',
    'Report View Only': 'View-only access to reports and data',
    'List Manager': 'Manage client and user lists',
    'Report Manager': 'Create and manage reports',
    'WSPS Dispatcher Add-on': 'View clients and destinations (add-on role)',
    'BPSR Dispatcher Add-on': 'Edit clients, destinations, and force accept rides (add-on role)',
    'Bri Pen Driver Add-on': 'View clients'
  };
  
  return descriptions[role] || 'Custom role';
}

/**
 * Check if role is an "add-on" role (should be combined with another role)
 */
export function isAddonRole(role: Role): boolean {
  return role === 'WSPS Dispatcher Add-on' || role === 'BPSR Dispatcher Add-on' || role === 'Bri Pen Driver Add-on';
}