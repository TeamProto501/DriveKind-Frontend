import { writable, derived } from 'svelte/store';
import type { RoleEnum, Profile, Organization } from '../types';
import { getNavigationItems, getQuickActions, getDefaultRoute } from '../navigation';

// User state stores
export const userProfile = writable<Profile | null>(null);
export const userRoles = writable<RoleEnum[]>([]);
export const userOrganization = writable<Organization | null>(null);
export const isLoading = writable(true);

// Navigation state stores
export const currentRoute = writable<string>('/');
export const navigationHistory = writable<string[]>([]);

// Derived stores for navigation
export const navigationItems = derived(
	userRoles,
	($userRoles) => getNavigationItems($userRoles)
);

export const quickActions = derived(
	userRoles,
	($userRoles) => getQuickActions($userRoles)
);

export const defaultRoute = derived(
	userRoles,
	($userRoles) => getDefaultRoute($userRoles)
);

export const hasRole = derived(
	userRoles,
	($userRoles) => (role: RoleEnum) => $userRoles.includes(role)
);

export const hasAnyRole = derived(
	userRoles,
	($userRoles) => (roles: RoleEnum[]) => roles.some(role => $userRoles.includes(role))
);

export const hasAllRoles = derived(
	userRoles,
	($userRoles) => (roles: RoleEnum[]) => roles.every(role => $userRoles.includes(role))
);

// Navigation actions
export function navigateTo(route: string) {
	currentRoute.set(route);
	navigationHistory.update(history => [...history, route]);
}

export function goBack() {
	navigationHistory.update(history => {
		const newHistory = [...history];
		newHistory.pop(); // Remove current route
		const previousRoute = newHistory[newHistory.length - 1] || '/';
		currentRoute.set(previousRoute);
		return newHistory;
	});
}

export function clearNavigationHistory() {
	navigationHistory.set([]);
}

// User management actions
export function setUserProfile(profile: Profile | null) {
	userProfile.set(profile);
}

export function setUserRoles(roles: RoleEnum[]) {
	userRoles.set(roles);
}

export function setUserOrganization(org: Organization | null) {
	userOrganization.set(org);
}

export function setLoading(loading: boolean) {
	isLoading.set(loading);
}

export function clearUserData() {
	userProfile.set(null);
	userRoles.set([]);
	userOrganization.set(null);
	clearNavigationHistory();
}

// Permission checking
export function checkPermission(requiredRoles: RoleEnum[]): boolean {
	let currentRoles: RoleEnum[] = [];
	userRoles.subscribe(roles => currentRoles = roles)();
	
	return requiredRoles.some(role => currentRoles.includes(role));
}

// Organization switching (for multi-org users)
export function switchOrganization(orgId: number) {
	// TODO: Implement organization switching logic
	// This would involve:
	// 1. Updating the user's current organization context
	// 2. Reloading user roles for that organization
	// 3. Updating navigation items
	// 4. Redirecting to the appropriate dashboard
	console.log(`Switching to organization ${orgId}`);
}

// Notification management
export const notifications = writable<Array<{
	id: string;
	title: string;
	message: string;
	type: 'info' | 'success' | 'warning' | 'error';
	timestamp: Date;
	read: boolean;
}>>([]);

export function addNotification(notification: Omit<typeof notifications extends SvelteStore<infer T> ? T[number] : never, 'id' | 'timestamp' | 'read'>) {
	const newNotification = {
		...notification,
		id: crypto.randomUUID(),
		timestamp: new Date(),
		read: false
	};
	
	notifications.update(notifs => [newNotification, ...notifs]);
}

export function markNotificationAsRead(id: string) {
	notifications.update(notifs => 
		notifs.map(notif => 
			notif.id === id ? { ...notif, read: true } : notif
		)
	);
}

export function removeNotification(id: string) {
	notifications.update(notifs => notifs.filter(notif => notif.id !== id));
}

export function clearAllNotifications() {
	notifications.set([]);
}

// Unread notifications count
export const unreadNotificationsCount = derived(
	notifications,
	($notifications) => $notifications.filter(n => !n.read).length
);
