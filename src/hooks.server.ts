// src/hooks.server.ts
import { redirect, type Handle } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.server';

// Pages that don't require authentication
const PUBLIC_ROUTES = [
	'/login',
	'/register',
	'/auth/callback',
	'/auth/logout',
	'/forgot-password',
	'/reset-password',
];

// Check if a route is public (doesn't require authentication)
function isPublicRoute(pathname: string): boolean {
	return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'));
}

// Get user's home page based on their role
function getRoleBasedHomePage(roles: string[]): string {
	if (!roles || roles.length === 0) return '/';
	
	// Priority order: Admin > Dispatcher > Driver
	if (roles.includes('Super Admin') || roles.includes('Admin')) {
		return '/admin/dash';
	}
	if (roles.includes('Dispatcher')) {
		return '/dispatcher/dashboard';
	}
	if (roles.includes('Driver')) {
		return '/driver/rides';
	}
	if (roles.includes('Volunteer')) {
		return '/calendar';
	}
	
	return '/';
}

// ============================================================================
// AUDIT LOGGING UTILITIES
// ============================================================================

// Map form action names to audit action types
// These must match your action_enum values in the database
function inferActionType(actionName: string): 'INSERT' | 'UPDATE' | 'DELETE' | null {
	const lowerAction = actionName.toLowerCase();
	
	if (lowerAction.includes('create') || lowerAction.includes('add') || lowerAction.includes('insert') || lowerAction.includes('new')) {
		return 'INSERT';
	}
	if (lowerAction.includes('update') || lowerAction.includes('edit') || lowerAction.includes('save') || lowerAction.includes('modify')) {
		return 'UPDATE';
	}
	if (lowerAction.includes('delete') || lowerAction.includes('remove') || lowerAction.includes('destroy')) {
		return 'DELETE';
	}
	
	return null;
}

// Map route paths to table names
// These must match your table_name_enum values in the database
function inferTableFromRoute(pathname: string): string | null {
	const segments = pathname.split('/').filter(Boolean);
	
	// Map route segments to table_name_enum values
	// UPDATE THESE to match your actual enum values!
	const routeToTable: Record<string, string> = {
		'rides': 'rides',
		'clients': 'clients',
		'users': 'staff_profiles',
		'drivers': 'staff_profiles',
		'vehicles': 'vehicles',
		'organizations': 'organization',
		'destinations': 'destinations',
		'unavail': 'driver_unavailability',
		'driver-schedules': 'driver_unavailability',
		'schedules': 'driver_unavailability',
		'calls': 'calls',
		'reports': 'volunteer_hours',
		'config': 'organization',
	};
	
	for (const segment of segments) {
		if (routeToTable[segment]) {
			return routeToTable[segment];
		}
	}
	
	return null;
}

// Extract key identifiers from form data for audit context
function extractAuditContext(formData: FormData): Record<string, any> {
	const context: Record<string, any> = {};
	
	// Common ID fields to capture
	const idFields = [
		'ride_id', 'client_id', 'user_id', 'org_id', 'vehicle_id', 
		'destination_id', 'call_id', 'entry_id', 'id'
	];
	
	for (const field of idFields) {
		const value = formData.get(field);
		if (value !== null && value !== '') {
			context[field] = value;
		}
	}
	
	// Capture some common fields for context
	const contextFields = ['status', 'action', 'type'];
	for (const field of contextFields) {
		const value = formData.get(field);
		if (value !== null && value !== '') {
			context[field] = value;
		}
	}
	
	return context;
}

// Log action to the audit table
// Respects NOT NULL constraints: user_id, org_id, field_name, old_value, new_value all required
async function logAuditEntry(
	supabase: ReturnType<typeof createSupabaseServerClient>,
	userId: string,
	orgId: number,
	action: 'INSERT' | 'UPDATE' | 'DELETE',
	tableName: string,
	context: Record<string, any>,
	actionName: string
): Promise<void> {
	try {
		const contextStr = JSON.stringify(context);
		const truncatedContext = contextStr.length > 500 ? contextStr.substring(0, 500) + '...' : contextStr;
		
		// Per schema: old_value and new_value are NOT NULL
		// Use empty string for the "missing" value based on action type
		let oldValue = '';
		let newValue = '';
		
		if (action === 'INSERT') {
			oldValue = '';  // No old value for inserts
			newValue = truncatedContext || '{}';
		} else if (action === 'DELETE') {
			oldValue = truncatedContext || '{}';
			newValue = '';  // No new value for deletes
		} else {
			// UPDATE - we don't have the old value from form data, just log context
			oldValue = '';
			newValue = truncatedContext || '{}';
		}
		
		const { error } = await supabase
			.from('transactions_audit_log')
			.insert({
				user_id: userId,
				org_id: orgId,
				action_enum: action,
				table_name_enum: tableName,
				field_name: `form_action:${actionName}`,
				old_value: oldValue,
				new_value: newValue,
				// timestamp defaults to now() per schema
			});
		
		if (error) {
			console.error('[Audit] Failed to log action:', error.message);
		} else {
			console.log(`[Audit] Logged ${action} on ${tableName} by user ${userId}`);
		}
	} catch (err) {
		console.error('[Audit] Exception logging action:', err);
	}
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export const handle: Handle = async ({ event, resolve }) => {
	const supabase = createSupabaseServerClient(event);
	const pathname = event.url.pathname;

	// Check for password reset tokens in URL (from Supabase verify endpoint redirect)
	const code = event.url.searchParams.get('code');
	const type = event.url.searchParams.get('type');
	const hash = event.url.hash;
	
	// If we're at the root and have recovery tokens, redirect to reset-password
	if (
		pathname === '/' &&
		(type === 'recovery' || code || (hash && hash.includes('type=recovery')))
	) {
		const params = new URLSearchParams();
		if (code) params.set('code', code);
		if (type) params.set('type', type);
		const queryString = params.toString();
		throw redirect(303, `/reset-password${queryString ? `?${queryString}` : ''}`);
	}
	
	// Get the current user
	const {
		data: { user }
	} = await supabase.auth.getUser();
	
	// If user is not authenticated and trying to access a protected route
	if (!user && !isPublicRoute(pathname)) {
		throw redirect(303, '/login');
	}
	
	// Fetch user roles and org if authenticated
	let userRoles: string[] = [];
	let userOrgId: number | null = null;

	if (user) {
		const { data: profile } = await supabase
			.from('staff_profiles')
			.select('role, org_id')
			.eq('user_id', user.id)
			.single();

		userRoles = Array.isArray(profile?.role) ? profile.role : [];
		userOrgId = profile?.org_id ?? null;

		// Expose on locals if needed elsewhere
		event.locals.userRoles = userRoles;
		event.locals.orgId = userOrgId;
	}

	// 🔒 GLOBAL WRITE BLOCKER:
	// If org is inactive/disabled, block ALL non-GET/HEAD requests
	if (
		user &&
		userOrgId &&
		event.request.method !== 'GET' &&
		event.request.method !== 'HEAD' &&
		!isPublicRoute(pathname)
	) {
		const { data: org, error: orgError } = await supabase
			.from('organization')
			.select('org_status_enum')
			.eq('org_id', userOrgId)
			.maybeSingle();

		if (orgError) {
			console.error('Org status lookup error in hooks:', orgError);
		} else if (org) {
			const rawStatus = (org as any).org_status_enum;
			const normalizedStatus = rawStatus ? String(rawStatus).trim().toLowerCase() : '';

			if (normalizedStatus === 'inactive' || normalizedStatus === 'disabled') {
				return new Response(
					JSON.stringify({
						error: 'Your organization is inactive. You cannot create or modify data.'
					}),
					{
						status: 403,
						headers: { 'Content-Type': 'application/json' }
					}
				);
			}
		}
	}

	// =========================================================================
	// 📝 AUDIT LOGGING FOR FORM ACTIONS
	// =========================================================================
	if (
		user &&
		userOrgId &&
		event.request.method === 'POST' &&
		!isPublicRoute(pathname)
	) {
		// Check if this is a form action (has ?/actionName in the URL)
		const actionMatch = event.url.search.match(/^\?\/(\w+)/);
		
		if (actionMatch) {
			const actionName = actionMatch[1];
			const actionType = inferActionType(actionName);
			const tableName = inferTableFromRoute(pathname);
			
			// Only log if we can determine both action type AND table name
			// (table must exist in your table_name_enum)
			if (actionType && tableName) {
				try {
					// Clone the request so we can read the body without consuming it
					const clonedRequest = event.request.clone();
					const formData = await clonedRequest.formData();
					const context = extractAuditContext(formData);
					
					// Log the action (fire and forget - don't block the request)
					logAuditEntry(
						supabase,
						user.id,
						userOrgId,
						actionType,
						tableName,
						context,
						actionName
					);
				} catch (err) {
					// Don't block the request if audit logging fails
					console.error('[Audit] Error extracting form data:', err);
				}
			}
		}
	}
	
	// If user is authenticated and trying to access login page, redirect to role-based home
	if (user && pathname === '/login') {
		const homePage = getRoleBasedHomePage(userRoles);
		throw redirect(303, homePage);
	}
	
	// If user is authenticated and trying to access root, redirect to role-based home
	if (user && pathname === '/') {
		const homePage = getRoleBasedHomePage(userRoles);
		throw redirect(303, homePage);
	}

	return resolve(event);
};