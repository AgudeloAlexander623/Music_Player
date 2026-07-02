/**
 * ERRORES CENTRALIZADOS
 *
 * Jerarquía de errores para toda la aplicación.
 * Cada error lleva un statusCode HTTP para que el middleware
 * de error en app.js pueda responder con el código correcto.
 *
 * USO:
 *   throw new AppError('Algo salió mal', 400);
 *   throw new ValidationError('Email inválido');
 *   throw new NotFoundError('Usuario no encontrado');
 */

export class AppError extends Error {
  /**
   * @param {string} message - Mensaje descriptivo del error
   * @param {number} [statusCode=500] - Código HTTP
   */
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}

export class ValidationError extends AppError {
  /**
   * @param {string} message - Motivo de la validación fallida
   */
  constructor(message) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

export class AuthError extends AppError {
  /**
   * @param {string} [message='Authentication failed']
   */
  constructor(message = 'Authentication failed') {
    super(message, 401);
    this.name = 'AuthError';
  }
}

export class ForbiddenError extends AppError {
  /**
   * @param {string} [message='Access denied']
   */
  constructor(message = 'Access denied') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  /**
   * @param {string} [message='Resource not found']
   */
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  /**
   * @param {string} [message='Resource already exists']
   */
  constructor(message = 'Resource already exists') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

/**
 * Normaliza cualquier error a un objeto de respuesta JSON.
 * Si es AppError usa su statusCode, si no es 500.
 *
 * @param {Error} error
 * @returns {{ error: string, details: string, statusCode: number }}
 */
export function formatErrorResponse(error) {
  return {
    error: error.name || 'Internal server error',
    details: error.message || 'An unexpected error occurred',
    statusCode: error.statusCode || 500,
  };
}
