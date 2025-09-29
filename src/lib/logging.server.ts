import type { RequestEvent } from '@sveltejs/kit';
import { createSupabaseServerClient } from './supabase.server';

// DriveKind API Configuration
const LOGGING_ENDPOINT = 'https://drive-kind-api.vercel.app/logs';

export interface LogEntry {
	level: 'info' | 'warn' | 'error' | 'debug';
	message: string;
	timestamp?: string;
	metadata?: Record<string, any>;
	userId?: string;
	endpoint?: string;
	method?: string;
	statusCode?: number;
	error?: string;
}

/**
 * Send log entry to the logging endpoint
 * This recreates authenticatedFetch logic internally to avoid circular dependency
 */
async function sendLogToAPI(logEntry: LogEntry, event?: RequestEvent): Promise<void> {
	try {
		let token: string | undefined;

		// Get authentication token from event
		if (event) {
			const supabaseClient = createSupabaseServerClient(event);
			const {
				data: { session }
			} = await supabaseClient.auth.getSession();
			token = session?.access_token;
		}

		if (!token) {
			// If no token, fail silently - we don't want logging failures to break the app
			console.warn('No authentication token available for logging');
			return;
		}

		// Make direct fetch call to logging endpoint (bypassing authenticatedFetch to avoid circular dependency)
		const headers = {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		};

		const response = await fetch(LOGGING_ENDPOINT, {
			method: 'POST',
			headers,
			body: JSON.stringify(logEntry),
			credentials: 'include'
		});

		// If log posting fails, fail silently - we don't want logging failures to break the app
		if (!response.ok) {
			console.warn(`Failed to send log to API: ${response.status} ${response.statusText}`);
		}
	} catch (error) {
		// Fail silently - logging failures should never break the application
		console.warn('Error sending log to API:', error);
	}
}

/**
 * Log an informational message
 */
export async function logInfo(
	message: string,
	metadata?: Record<string, any>,
	event?: RequestEvent
): Promise<void> {
	const logEntry: LogEntry = {
		level: 'info',
		message,
		timestamp: new Date().toISOString(),
		metadata
	};
	await sendLogToAPI(logEntry, event);
}

/**
 * Log a warning message
 */
export async function logWarn(
	message: string,
	metadata?: Record<string, any>,
	event?: RequestEvent
): Promise<void> {
	const logEntry: LogEntry = {
		level: 'warn',
		message,
		timestamp: new Date().toISOString(),
		metadata
	};
	await sendLogToAPI(logEntry, event);
}

/**
 * Log an error message
 */
export async function logError(
	message: string,
	error?: Error | string,
	metadata?: Record<string, any>,
	event?: RequestEvent
): Promise<void> {
	const logEntry: LogEntry = {
		level: 'error',
		message,
		timestamp: new Date().toISOString(),
		error: error instanceof Error ? error.message : error,
		metadata: {
			...metadata,
			stack: error instanceof Error ? error.stack : undefined
		}
	};
	await sendLogToAPI(logEntry, event);
}

/**
 * Log a debug message
 */
export async function logDebug(
	message: string,
	metadata?: Record<string, any>,
	event?: RequestEvent
): Promise<void> {
	const logEntry: LogEntry = {
		level: 'debug',
		message,
		timestamp: new Date().toISOString(),
		metadata
	};
	await sendLogToAPI(logEntry, event);
}

/**
 * Log an API request/response
 */
export async function logAPICall(
	endpoint: string,
	method: string,
	statusCode: number,
	metadata?: Record<string, any>,
	event?: RequestEvent
): Promise<void> {
	const logEntry: LogEntry = {
		level: statusCode >= 400 ? 'error' : 'info',
		message: `API Call: ${method} ${endpoint}`,
		timestamp: new Date().toISOString(),
		endpoint,
		method,
		statusCode,
		metadata
	};
	await sendLogToAPI(logEntry, event);
}