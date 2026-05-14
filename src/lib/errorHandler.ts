/**
 * Error handling utilities for Supabase API errors
 * Provides error categorization, type-safe interfaces, and user-friendly Spanish messages
 */

/**
 * Union type for categorized error types
 */
export type ApiErrorType = 'rls_violation' | 'not_found' | 'conflict' | 'validation' | 'network' | 'unknown';

/**
 * Interface for categorized API errors
 */
export interface ApiError {
  type: ApiErrorType;
  message: string;
  details?: Record<string, any>;
  statusCode?: number;
}

/**
 * Error messages mapped by error type
 */
const ERROR_MESSAGES: Record<ApiErrorType, string> = {
  rls_violation: 'No tienes permiso para realizar esta acción',
  not_found: 'El recurso no fue encontrado',
  conflict: 'Este registro ya existe',
  validation: 'Los datos proporcionados no son válidos',
  network: 'Error de conexión. Verifica tu internet e intenta de nuevo',
  unknown: 'Algo salió mal. Intenta de nuevo más tarde',
};

/**
 * Categorizes raw Supabase errors into typed ApiError objects
 * Maps error codes and messages to specific error categories
 */
export function categorizeSupabaseError(error: unknown): ApiError {
  // Handle missing or non-object error
  if (!error || typeof error !== 'object') {
    return {
      type: 'unknown',
      message: ERROR_MESSAGES.unknown,
    };
  }

  const err = error as Record<string, any>;
  const errorMessage = err?.message?.toLowerCase() || '';
  const errorCode = err?.code || '';

  // RLS Violations (permission denied)
  if (
    errorMessage.includes('permission denied') ||
    errorCode === 'PGRST100' ||
    errorMessage.includes('forbid')
  ) {
    return {
      type: 'rls_violation',
      message: ERROR_MESSAGES.rls_violation,
      statusCode: 403,
      details: { originalError: error },
    };
  }

  // Not Found
  if (errorCode === 'PGRST116' || errorMessage.includes('not found')) {
    return {
      type: 'not_found',
      message: ERROR_MESSAGES.not_found,
      statusCode: 404,
      details: { originalError: error },
    };
  }

  // Conflict (duplicate key)
  if (errorCode === '23505' || errorMessage.includes('duplicate key')) {
    return {
      type: 'conflict',
      message: ERROR_MESSAGES.conflict,
      statusCode: 409,
      details: { originalError: error },
    };
  }

  // Validation (foreign key violation)
  if (errorCode === '23503') {
    return {
      type: 'validation',
      message: ERROR_MESSAGES.validation,
      statusCode: 400,
      details: { originalError: error },
    };
  }

  // Network errors
  if (errorMessage.includes('failed to fetch') || errorMessage.includes('network')) {
    return {
      type: 'network',
      message: ERROR_MESSAGES.network,
      statusCode: 0,
      details: { originalError: error },
    };
  }

  // Unknown error (default case)
  return {
    type: 'unknown',
    message: err?.message || ERROR_MESSAGES.unknown,
    details: { originalError: error },
  };
}

/**
 * Returns a user-friendly Spanish message for the given error
 */
export function getUserFriendlyMessage(error: ApiError): string {
  return ERROR_MESSAGES[error.type] ?? ERROR_MESSAGES.unknown;
}
