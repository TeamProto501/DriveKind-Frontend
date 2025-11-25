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
		// Preserve the tokens in the redirect
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
	// (except for public routes like /login, /forgot-password, etc.)
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