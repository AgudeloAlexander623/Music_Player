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

import logger from '../utils/logger.js';
import { verifyToken, extractTokenFromHeader } from '../services/auth.service.js';

export const verifyTokenMiddleware = (req, res, next) => {
  try {
    // Obtener header Authorization y extraer token
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

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
    req.user = decoded.guest
      ? { userId: null, email: null, guest: true }
      : { userId: decoded.userId, email: decoded.email };

    // Continuar al siguiente middleware/controller
    next();
  } catch (error) {
    logger.error('Error verificando token', { error: error.message });

    // La clasificación 401/500 la hace auth.service.js (verifyToken):
    // problemas del token → 401, problemas del servidor → 500.
    // Aquí solo se delega al handler global, que decide qué exponer.
    return next(error);
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
    logger.warn('Token validation skipped (optional)', { error: error.message });
  }

  next();
};

/**
 * MIDDLEWARE: BLOQUEAR USUARIOS INVITADOS
 *
 * Se aplica a rutas que requieren un usuario registrado
 * (favoritos, playlists, etc.)
 *
 * Si req.user.guest es true, retorna 403
 * Si el usuario es real (tiene userId), continúa normalmente
 *
 * USO EN RUTAS:
 * router.post('/favorites', verifyToken, requireRealUser, controller);
 */
export const requireRealUser = (req, res, next) => {
  if (req.user && req.user.guest) {
    return res.status(403).json({
      error: 'Acción no disponible en modo invitado',
      details: 'Regístrate o inicia sesión para usar esta función',
    });
  }
  next();
};
