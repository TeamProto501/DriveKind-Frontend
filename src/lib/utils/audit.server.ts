// src/lib/utils/audit.server.ts
// Utility functions for manual audit logging from server-side code
// Respects NOT NULL constraints on old_value and new_value

import type { SupabaseClient } from '@supabase/supabase-js';

export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE';

export interface AuditLogEntry {
	userId: string;
	orgId: number;
	action: AuditAction;
	tableName: string;
	fieldName?: string;
	oldValue?: string;  // Use '' for INSERT (no old value)
	newValue?: string;  // Use '' for DELETE (no new value)
}

/**
 * Log an audit entry to the transactions_audit_log table.
 * Respects NOT NULL constraints - oldValue/newValue default to empty string.
 */
export async function logAudit(
	supabase: SupabaseClient,
	entry: AuditLogEntry
): Promise<{ success: boolean; error?: string }> {
	try {
		const { error } = await supabase.from('transactions_audit_log').insert({
			user_id: entry.userId,
			org_id: entry.orgId,
			action_enum: entry.action,
			table_name_enum: entry.tableName,
			field_name: entry.fieldName || 'manual_log',
			old_value: truncate(entry.oldValue || '', 500),  // NOT NULL - default ''
			new_value: truncate(entry.newValue || '', 500),  // NOT NULL - default ''
			// timestamp defaults to now() in DB
		});

		if (error) {
			console.error('[Audit] Failed to log:', error.message);
			return { success: false, error: error.message };
		}

		return { success: true };
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		console.error('[Audit] Exception:', message);
		return { success: false, error: message };
	}
}

/**
 * Log multiple field changes for an UPDATE operation.
 * Compares old and new objects and logs each changed field.
 */
export async function logUpdateChanges(
	supabase: SupabaseClient,
	userId: string,
	orgId: number,
	tableName: string,
	oldRecord: Record<string, any>,
	newRecord: Record<string, any>,
	options?: {
		excludeFields?: string[];
	}
): Promise<{ success: boolean; changesLogged: number; error?: string }> {
	const excludeFields = new Set([
		'updated_at',
		'modified_at',
		'last_modified',
		'created_at',
		...(options?.excludeFields || [])
	]);

	const changes: {
		field_name: string;
		old_value: string;
		new_value: string;
	}[] = [];

	for (const key of Object.keys(newRecord)) {
		if (excludeFields.has(key)) continue;

		const oldVal = oldRecord[key];
		const newVal = newRecord[key];

		// Compare as strings to handle different types
		const oldStr = oldVal === null || oldVal === undefined ? '' : String(oldVal);
		const newStr = newVal === null || newVal === undefined ? '' : String(newVal);

		if (oldStr !== newStr) {
			changes.push({
				field_name: key,
				old_value: truncate(oldStr, 500),
				new_value: truncate(newStr, 500),
			});
		}
	}

	if (changes.length === 0) {
		return { success: true, changesLogged: 0 };
	}

	try {
		const { error } = await supabase.from('transactions_audit_log').insert(
			changes.map((c) => ({
				user_id: userId,
				org_id: orgId,
				action_enum: 'UPDATE' as const,
				table_name_enum: tableName,
				field_name: c.field_name,
				old_value: c.old_value,
				new_value: c.new_value,
			}))
		);

		if (error) {
			console.error('[Audit] Failed to log changes:', error.message);
			return { success: false, changesLogged: 0, error: error.message };
		}

		return { success: true, changesLogged: changes.length };
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		console.error('[Audit] Exception:', message);
		return { success: false, changesLogged: 0, error: message };
	}
}

/**
 * Log a record creation (INSERT).
 * old_value = '' (nothing existed before)
 * new_value = JSON of new record
 */
export async function logInsert(
	supabase: SupabaseClient,
	userId: string,
	orgId: number,
	tableName: string,
	record: Record<string, any>,
	identifierField?: string
): Promise<{ success: boolean; error?: string }> {
	const identifier = identifierField && record[identifierField] 
		? String(record[identifierField]) 
		: 'new_record';

	return logAudit(supabase, {
		userId,
		orgId,
		action: 'INSERT',
		tableName,
		fieldName: `record_created:${identifier}`,
		oldValue: '',  // No old value for INSERT
		newValue: JSON.stringify(record),
	});
}

/**
 * Log a record deletion (DELETE).
 * old_value = JSON of deleted record
 * new_value = '' (nothing exists after)
 */
export async function logDelete(
	supabase: SupabaseClient,
	userId: string,
	orgId: number,
	tableName: string,
	record: Record<string, any>,
	identifierField?: string
): Promise<{ success: boolean; error?: string }> {
	const identifier = identifierField && record[identifierField]
		? String(record[identifierField])
		: 'deleted_record';

	return logAudit(supabase, {
		userId,
		orgId,
		action: 'DELETE',
		tableName,
		fieldName: `record_deleted:${identifier}`,
		oldValue: JSON.stringify(record),
		newValue: '',  // No new value for DELETE
	});
}

// Helper to truncate strings
function truncate(str: string, maxLength: number): string {
	if (str.length <= maxLength) return str;
	return str.substring(0, maxLength) + '...';
}


// ============================================================================
// EXAMPLE USAGE IN A +page.server.ts ACTION:
// ============================================================================
/*
import { logUpdateChanges, logInsert, logDelete } from '$lib/utils/audit.server';
import { createSupabaseServerClient } from '$lib/supabase.server';

export const actions = {
  updateRide: async (event) => {
    const supabase = createSupabaseServerClient(event);
    const formData = await event.request.formData();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('staff_profiles')
      .select('org_id')
      .eq('user_id', user.id)
      .single();
    
    const rideId = formData.get('ride_id');
    
    // Fetch old record first
    const { data: oldRide } = await supabase
      .from('rides')
      .select('*')
      .eq('ride_id', rideId)
      .single();
    
    // Build update payload
    const updates = {
      status: formData.get('status'),
      pickup_address: formData.get('pickup_address'),
      // ... other fields
    };
    
    // Perform update
    const { error } = await supabase
      .from('rides')
      .update(updates)
      .eq('ride_id', rideId);
    
    if (!error && oldRide) {
      // Log the changes (database triggers will also log, this is optional)
      await logUpdateChanges(
        supabase,
        user.id,
        profile.org_id,
        'rides',
        oldRide,
        { ...oldRide, ...updates }
      );
    }
    
    return { success: !error };
  },
  
  deleteRide: async (event) => {
    const supabase = createSupabaseServerClient(event);
    const formData = await event.request.formData();
    
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('staff_profiles')
      .select('org_id')
      .eq('user_id', user.id)
      .single();
    
    const rideId = formData.get('ride_id');
    
    // Fetch record before deleting (for audit log)
    const { data: ride } = await supabase
      .from('rides')
      .select('*')
      .eq('ride_id', rideId)
      .single();
    
    // Delete
    const { error } = await supabase
      .from('rides')
      .delete()
      .eq('ride_id', rideId);
    
    if (!error && ride) {
      // Log deletion (database trigger will also log)
      await logDelete(supabase, user.id, profile.org_id, 'rides', ride, 'ride_id');
    }
    
    return { success: !error };
  }
};
*/