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
 * Normaliza cualquier error a un objeto de respuesta JSON SEGURO.
 *
 * POLÍTICA DE EXPOSICIÓN DE ERRORES:
 * - Errores 4xx (AppError): son intencionales y su mensaje es seguro para
 *   el cliente, se expone tal cual en el campo `error`.
 * - Errores 5xx (inesperados): son internos. Su `message` puede contener
 *   rutas, SQL o IPs internas, así que NUNCA se expone en producción:
 *   se responde un mensaje genérico y el detalle real queda solo en el log.
 * - En desarrollo (NODE_ENV !== production) se incluye el detalle real
 *   para facilitar la depuración.
 *
 * USO:
 *   const { statusCode, ...body } = formatErrorResponse(error);
 *   res.status(statusCode).json(body);
 *
 * @param {Error} error
 * @returns {{ error: string, details?: string, statusCode: number }}
 */
export function formatErrorResponse(error) {
  const statusCode = error.statusCode || 500;

  if (statusCode >= 500) {
    const isProd = process.env.NODE_ENV === 'production';
    return {
      error: 'Internal server error',
      details: isProd
        ? 'Ocurrió un error inesperado'
        : error.message || 'An unexpected error occurred',
      statusCode,
    };
  }

  return {
    error: error.message || 'Request failed',
    statusCode,
  };
}

/**
 * Envía la respuesta HTTP de error usando formatErrorResponse.
 * Centraliza la decisión de qué exponer para que ningún controller
 * tenga que repetir la lógica de saneamiento.
 *
 * @param {import('express').Response} res
 * @param {Error} error
 * @returns {import('express').Response}
 */
export function sendErrorResponse(res, error) {
  const { statusCode, ...body } = formatErrorResponse(error);
  return res.status(statusCode).json(body);
}
