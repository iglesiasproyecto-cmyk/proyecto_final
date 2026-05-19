import type { Tarea } from '@/services/eventos.service'
import { debugLog } from '@/lib/debug'

// Audit-aware error handling utilities
export function handleAuditError(error: any, operation: string, context?: any): never {
  console.error(`[AUDIT] ${operation} failed - audit logging may be affected:`, error, context)
  throw new Error(`${operation}: ${error.message}`)
}

export function logAuditSuccess(operation: string, context?: any) {
  debugLog('taskUtils', `${operation} completed successfully`, context)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DATABASE COMPLIANCE & AUDIT SYSTEM
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// 🔄 AUTOMATIC SYSTEMS:
// - updated_at columns are automatically managed by database triggers
// - Do not manually set updated_at in INSERT/UPDATE operations
// - Triggers ensure updated_at reflects the actual modification time
// - Soft delete is implemented using activo = false instead of DELETE
// - All SELECT queries filter WHERE activo = true to hide soft-deleted records
// - Audit logging is automatically handled by database triggers for all critical operations
// - All changes to sensitive data (users, roles, events, tasks, certificates) are logged
// - Audit logs include: table, action, user_id, record_id, old_values, new_values, timestamp
//
// 🔐 SECURITY IMPROVEMENTS:
// - contrasena_hash field REMOVED from frontend - authentication delegated to Supabase Auth
// - No manual password storage or hashing in application code
// - All authentication handled by Supabase Auth with proper security practices
// - Passwords never stored in application database, only in auth.users with proper encryption
// - Table: audit_log with fields for complete change tracking
//
// 🚨 ERROR HANDLING:
// - Use handleAuditError() for audit-aware error reporting
// - All critical operations log audit failures with [AUDIT] prefix
// - Audit failures are treated as critical system errors
//
// 📋 AUDITED OPERATIONS:
// - User role assignments/changes/removals
// - Event creation/modification/deletion
// - Task creation/assignment/completion
// - Certificate issuance
// - Ministry membership changes
// - Church/sede/pastor modifications
// - Any soft delete operations (activo = false)
//
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface TaskFilters {
  searchQuery: string
  dateFilter: string
  sortOrder: 'newest' | 'oldest'
}

export function filterAndSortTareas(tareas: Tarea[], filters: TaskFilters): Tarea[] {
  let result = [...tareas];

  // Search filter
  if (filters.searchQuery.trim()) {
    const q = filters.searchQuery.toLowerCase();
    result = result.filter(t =>
      t.titulo.toLowerCase().includes(q) ||
      (t.descripcion && t.descripcion.toLowerCase().includes(q))
    );
  }

  // Date filter
  if (filters.dateFilter) {
    result = result.filter(t => {
      if (!t.fechaLimite) return false;
      // Compare only the date part (YYYY-MM-DD) to handle both date strings and timestamps
      const taskDate = new Date(t.fechaLimite).toISOString().split('T')[0];
      return taskDate === filters.dateFilter;
    });
  }

  // Sort by creation date
  result.sort((a, b) => {
    const dateA = new Date(a.creadoEn).getTime();
    const dateB = new Date(b.creadoEn).getTime();
    return filters.sortOrder === "newest" ? dateB - dateA : dateA - dateB;
  });

  return result;
}