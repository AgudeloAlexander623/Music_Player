/**
 * MIDDLEWARE: VERIFICACIÓN DE TOKEN JWT
 *
 * Se aplica a rutas que requieren autenticación
 * Valida que:
 * - El header Authorization esté presente
 * - El token tenga formato "Bearer <token>"
 * - El token sea válido y no haya expirado
 * - El token contenga userId válido
 *
 * Si todo está bien, agrega el usuario al request: req.user = { userId, email }
 * Si hay error, retorna 401 con mensaje descriptivo
 *
 * USO EN RUTAS:
 * router.get('/protected', verifyToken, controllerFunction);
 */

import { verifyToken, extractTokenFromHeader } from '../services/auth.service.js';

export const verifyTokenMiddleware = (req, res, next) => {
  try {
    // Obtener header Authorization
    const authHeader = req.headers.authorization;

    // Extraer token
    let token;
    try {
      token = extractTokenFromHeader(authHeader);
    } catch (error) {
      return res.status(401).json({
        error: 'Invalid authorization header',
        details: error.message,
      });
    }

    // Verificar que token esté presente
    if (!token) {
      return res.status(401).json({
        error: 'Missing authorization token',
        details: 'Authorization header with Bearer token is required',
      });
    }

    // Verificar y decodificar token
    const decoded = verifyToken(token);

    // Agregar información del usuario al request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    // Continuar al siguiente middleware/controller
    next();
  } catch (error) {
    console.error(`[Token Verification Error] ${error.message}`);

    // Errores de token
    if (error.statusCode === 401) {
      return res.status(401).json({
        error: error.name || 'Authentication failed',
        details: error.message,
      });
    }

    // Otros errores
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    });
  }
};

/**
 * MIDDLEWARE OPCIONAL: Verifica token pero no bloquea si no es válido
 *
 * Útil para rutas que pueden ser públicas o privadas
 * Como comentarios públicos que muestran autor si está autenticado
 *
 * USO EN RUTAS:
 * router.get('/public', optionalVerifyToken, controllerFunction);
 * Dentro del controller: if (req.user) { usar datos del usuario }
 */
export const optionalVerifyTokenMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      // Sin token, solo continuar
      return next();
    }

    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      // Token inválido pero es opcional, continuamos
      return next();
    }

    // Intentar verificar
    const decoded = verifyToken(token);
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };
  } catch (error) {
    // Ignorar errores de token en middleware opcional
    console.warn(`[Optional Token Verification] Token validation skipped: ${error.message}`);
  }

  next();
};
