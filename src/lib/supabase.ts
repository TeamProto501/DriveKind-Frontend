import { createBrowserClient } from '@supabase/ssr'
import {
	PUBLIC_SUPABASE_ANON_KEY,
	PUBLIC_SUPABASE_URL,
} from "$env/static/public"

if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_ANON_KEY) {
	throw new Error('Missing Supabase environment variables');
}

export const supabase = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
	global: {
		fetch,
	},
	cookies: {
		getAll() {
			return []
		},
		setAll() {
			// No-op on the client since cookies are handled by the browser
		},
	},
});