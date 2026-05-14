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
 * Custom error class for Supabase errors
 */
export class SupabaseError extends Error {
  type: ApiErrorType;
  details?: Record<string, any>;
  statusCode?: number;

  constructor(type: ApiErrorType, message: string, details?: Record<string, any>, statusCode?: number) {
    super(message);
    this.name = 'SupabaseError';
    this.type = type;
    this.details = details;
    this.statusCode = statusCode;
  }
}

/**
 * Categorizes raw Supabase errors into typed ApiError objects
 * Maps error codes and messages to specific error categories
 */
export function categorizeSupabaseError(error: any): ApiError {
  // Handle missing error
  if (!error) {
    return {
      type: 'unknown',
      message: 'Error desconocido',
    };
  }

  const errorMessage = error?.message?.toLowerCase() || '';
  const errorCode = error?.code || '';

  // RLS Violations (permission denied)
  if (
    errorMessage.includes('permission denied') ||
    errorCode === 'PGRST100' ||
    errorMessage.includes('forbid')
  ) {
    return {
      type: 'rls_violation',
      message: 'No tienes permiso para realizar esta acción',
      statusCode: 403,
      details: { originalError: error },
    };
  }

  // Not Found
  if (errorCode === 'PGRST116' || errorMessage.includes('not found')) {
    return {
      type: 'not_found',
      message: 'El recurso no fue encontrado',
      statusCode: 404,
      details: { originalError: error },
    };
  }

  // Conflict (duplicate key)
  if (errorCode === '23505' || errorMessage.includes('duplicate key')) {
    return {
      type: 'conflict',
      message: 'Este registro ya existe',
      statusCode: 409,
      details: { originalError: error },
    };
  }

  // Validation (foreign key violation)
  if (errorCode === '23503') {
    return {
      type: 'validation',
      message: 'El registro referenciado no existe',
      statusCode: 400,
      details: { originalError: error },
    };
  }

  // Network errors
  if (errorMessage.includes('failed to fetch') || errorMessage.includes('network')) {
    return {
      type: 'network',
      message: 'Error de conexión. Intenta de nuevo',
      details: { originalError: error },
    };
  }

  // Unknown error (default case)
  return {
    type: 'unknown',
    message: error?.message || 'Error desconocido',
    details: { originalError: error },
  };
}

/**
 * Returns a user-friendly Spanish message for the given error
 */
export function getUserFriendlyMessage(error: ApiError): string {
  switch (error.type) {
    case 'rls_violation':
      return 'No tienes permiso para realizar esta acción';
    case 'not_found':
      return 'El recurso no fue encontrado';
    case 'conflict':
      return 'Este registro ya existe';
    case 'validation':
      return 'Los datos proporcionados no son válidos';
    case 'network':
      return 'Error de conexión. Verifica tu internet e intenta de nuevo';
    case 'unknown':
      return 'Algo salió mal. Intenta de nuevo más tarde';
    default:
      return 'Algo salió mal. Intenta de nuevo más tarde';
  }
}
