// src/hooks.server.ts
import { redirect, type Handle } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.server';

// Pages that don't require authentication
const PUBLIC_ROUTES = [
	'/login',
	'/register',
	'/auth/callback',
	'/auth/logout',
	// Add other public routes here as needed
];

// Check if a route is public (doesn't require authentication)
function isPublicRoute(pathname: string): boolean {
	return PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'));
}

export const handle: Handle = async ({ event, resolve }) => {
	const supabase = createSupabaseServerClient(event);
	
	// Get the current user
	const { data: { user } } = await supabase.auth.getUser();
	
	const pathname = event.url.pathname;
	
	// If user is not authenticated and trying to access a protected route
	if (!user && !isPublicRoute(pathname)) {
		// Redirect to login page
		throw redirect(303, '/login');
	}
	
	// If user is authenticated and trying to access login page, redirect to home
	if (user && pathname === '/login') {
		throw redirect(303, '/');
	}
	
	return resolve(event);
};
