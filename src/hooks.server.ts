// src/hooks.server.ts
import { redirect, type Handle } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.server';

// Pages that don't require authentication
const PUBLIC_ROUTES = [
	'/login',
	'/register',
	'/auth/callback',
	'/auth/logout',
];

// Check if a route is public (doesn't require authentication)
function isPublicRoute(pathname: string): boolean {
	return PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'));
}

// Get user's home page based on their role
function getRoleBasedHomePage(roles: string[]): string {
	if (!roles || roles.length === 0) return '/';
	
	// Priority order: Admin > Dispatcher > Driver > Client
	if (roles.includes('Super Admin') || roles.includes('Admin')) {
		return '/admin/dashboard';
	}
	if (roles.includes('Dispatcher')) {
		return '/dispatcher/rides';
	}
	if (roles.includes('Driver')) {
		return '/driver/rides';
	}
	if (roles.includes('Client')) {
		return '/client/rides';
	}
	
	return '/';
}

export const handle: Handle = async ({ event, resolve }) => {
	const supabase = createSupabaseServerClient(event);
	
	// Get the current user
	const { data: { user } } = await supabase.auth.getUser();
	
	const pathname = event.url.pathname;
	
	// If user is not authenticated and trying to access a protected route
	if (!user && !isPublicRoute(pathname)) {
		throw redirect(303, '/login');
	}
	
	// Fetch user roles if authenticated
	let userRoles: string[] = [];
	if (user) {
		const { data: profile } = await supabase
			.from('staff_profiles')
			.select('role')
			.eq('user_id', user.id)
			.single();

		userRoles = Array.isArray(profile?.role) ? profile.role : [];
		event.locals.userRoles = userRoles;
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
