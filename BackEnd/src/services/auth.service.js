/**
 * SERVICIO DE AUTENTICACIÓN - JWT Y CONTRASEÑAS
 *
 * Este módulo maneja toda la lógica de autenticación:
 * - Hasheo seguro de contraseñas con bcryptjs
 * - Generación de tokens JWT
 * - Validación de tokens
 * - Manejo de problemas de seguridad
 *
 * FLUJO DE REGISTRO:
 * 1. Recibir email y contraseña
 * 2. Validar que no exista el usuario
 * 3. Hashear contraseña
 * 4. Guardar en BD
 * 5. Generar token JWT
 *
 * FLUJO DE LOGIN:
 * 1. Recibir email y contraseña
 * 2. Buscar usuario en BD
 * 3. Comparar contraseña contra hash
 * 4. Si coincide, generar token JWT
 * 5. Retornar token
 */

import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';

class AuthServiceError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'AuthServiceError';
    this.statusCode = statusCode;
  }
}

/**
 * HASHEAR CONTRASEÑA
 *
 * Convierte contraseña en texto plano a hash bcrypt seguro
 * - 10 rondas de sal (balance entre seguridad y velocidad)
 * - Imposible recuperar contraseña original
 * - Diferentes hashes para misma contraseña (random salt)
 */
export async function hashPassword(password) {
  try {
    if (!password || password.length < 6) {
      throw new AuthServiceError('Password must be at least 6 characters', 400);
    }
    const salt = await bcryptjs.genSalt(10);
    return await bcryptjs.hash(password, salt);
  } catch (error) {
    if (error instanceof AuthServiceError) throw error;
    throw new AuthServiceError(`Could not hash password: ${error.message}`, 500);
  }
}

/**
 * COMPARAR CONTRASEÑA
 *
 * Verifica que contraseña en texto plano coincida con hash almacenado
 * - Usa bcryptjs para comparación segura
 * - No expone el hash original
 * - Resistant a timing attacks
 */
export async function comparePassword(password, hash) {
  try {
    if (!password || !hash) {
      return false;
    }
    return await bcryptjs.compare(password, hash);
  } catch (error) {
    throw new AuthServiceError(`Could not compare passwords: ${error.message}`, 500);
  }
}

/**
 * GENERAR TOKEN JWT
 *
 * Crea un token JWT firmado que identifica al usuario
 * - Contiene userId y email en payload
 * - Expira en 24 horas
 * - Firmado con JWT_SECRET del .env
 *
 * PAYLOAD:
 * {
 *   userId: número,
 *   email: string,
 *   iat: timestamp (issued at),
 *   exp: timestamp (expiration)
 * }
 */
export function generateToken(userId, email) {
  try {
    if (!process.env.JWT_SECRET) {
      throw new AuthServiceError(
        'JWT_SECRET not configured in .env',
        500
      );
    }

    if (!userId || !email) {
      throw new AuthServiceError(
        'userId and email are required',
        400
      );
    }

    const token = jwt.sign(
      {
        userId,
        email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '24h', // Token expira en 24 horas
        algorithm: 'HS256',
      }
    );

    return token;
  } catch (error) {
    if (error instanceof AuthServiceError) throw error;
    throw new AuthServiceError(`Could not generate token: ${error.message}`, 500);
  }
}

/**
 * VERIFICAR TOKEN JWT
 *
 * Valida que un token JWT sea legítimo y no haya expirado
 * - Verifica firma con JWT_SECRET
 * - Comprueba fecha de expiración
 * - Retorna payload desdeñado si es válido
 *
 * RETORNA:
 * {
 *   userId: número,
 *   email: string,
 *   iat: timestamp,
 *   exp: timestamp
 * }
 */
export function verifyToken(token) {
  try {
    if (!token) {
      throw new AuthServiceError('Token is required', 401);
    }

    if (!process.env.JWT_SECRET) {
      throw new AuthServiceError('JWT_SECRET not configured in .env', 500);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
    });

    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AuthServiceError('Token has expired', 401);
    }
    if (error.name === 'JsonWebTokenError') {
      throw new AuthServiceError('Invalid token', 401);
    }
    if (error instanceof AuthServiceError) throw error;
    throw new AuthServiceError(`Could not verify token: ${error.message}`, 500);
  }
}

/**
 * EXTRAER TOKEN DE HEADER
 *
 * Helper para extraer token del header Authorization
 * Formato esperado: "Bearer <token>"
 *
 * RETORNA:
 * - token si está presente
 * - null si no está
 * - lanza error si formato es inválido
 */
export function extractTokenFromHeader(authHeader) {
  try {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new AuthServiceError(
        'Authorization header must be formatted as "Bearer <token>"',
        401
      );
    }

    return parts[1];
  } catch (error) {
    if (error instanceof AuthServiceError) throw error;
    throw new AuthServiceError(`Invalid authorization header: ${error.message}`, 401);
  }
}
