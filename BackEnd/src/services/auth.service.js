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
import crypto from 'crypto';
import { findOne, insert, update } from '../db/database.js';
import { buildSpotifyAuthUrl } from './spotify.services.js';

const REFRESH_TOKEN_BYTES = 40;
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

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
 * GENERAR TOKEN INVITADO
 *
 * Crea un token JWT para sesión sin registro
 * - No requiere userId ni email
 * - payload incluye { guest: true }
 * - Expira en 24 horas
 * - Permite navegación sin cuenta
 *
 * USO:
 * - Frontend: modo invitado para explorar la app
 * - Backend: endpoints mutantes rechazan guest con 403
 *
 * PAYLOAD:
 * {
 *   guest: true,
 *   userId: null,
 *   email: null,
 *   iat: timestamp,
 *   exp: timestamp
 * }
 */
export function generateGuestToken() {
  try {
    if (!process.env.JWT_SECRET) {
      throw new AuthServiceError(
        'JWT_SECRET not configured in .env',
        500
      );
    }

    const token = jwt.sign(
      {
        userId: null,
        email: null,
        guest: true,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '24h',
        algorithm: 'HS256',
      }
    );

    return token;
  } catch (error) {
    if (error instanceof AuthServiceError) throw error;
    throw new AuthServiceError(`Could not generate guest token: ${error.message}`, 500);
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
    // jsonwebtoken lanza JsonWebTokenError y sus subclases
    // (TokenExpiredError, NotBeforeError, ...). Cualquier problema con el
    // token ES del cliente (401); solo lo inesperado es del servidor (500).
    if (error instanceof jwt.JsonWebTokenError) {
      const expired = error.name === 'TokenExpiredError';
      throw new AuthServiceError(expired ? 'Token has expired' : 'Invalid token', 401);
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

/**
 * GENERAR TOKEN DE REFRESCO
 *
 * Crea un token aleatorio seguro para renovar sesiones
 * - 40 bytes hex (80 caracteres)
 * - Expira en 30 días
 * - Se almacena hasheado en BD
 *
 * RETORNA:
 * {
 *   token: string (token plano para el cliente),
 *   tokenHash: string (SHA-256 para BD),
 *   expiresAt: Date
 * }
 */
export function generateRefreshToken() {
  try {
    const token = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    return { token, tokenHash, expiresAt };
  } catch (error) {
    throw new AuthServiceError(`Could not generate refresh token: ${error.message}`, 500);
  }
}

/**
 * HASHEAR TOKEN DE REFRESCO
 *
 * Convierte un token plano a su hash SHA-256
 * Útil para buscar tokens en BD sin almacenarlos en texto plano
 */
export function hashRefreshToken(token) {
  if (!token) {
    throw new AuthServiceError('Refresh token is required', 401);
  }
  return crypto.createHash('sha256').update(token).digest('hex');
}

/* ── Login social con Spotify (OAuth Authorization Code) ── */

const SPOTIFY_STATE_TTL_MS = 10 * 60 * 1000;
const spotifyOAuthStates = new Map(); // state -> { createdAt }

function pruneSpotifyStates() {
  const now = Date.now();
  for (const [state, entry] of spotifyOAuthStates) {
    if (now - entry.createdAt > SPOTIFY_STATE_TTL_MS) {
      spotifyOAuthStates.delete(state);
    }
  }
}

/**
 * Genera un estado OAuth y devuelve la URL de autorización de Spotify.
 * @returns {string} URL a la que redirigir al navegador del usuario
 */
export function createSpotifyLoginUrl() {
  pruneSpotifyStates();
  const state = crypto.randomBytes(16).toString('hex');
  spotifyOAuthStates.set(state, { createdAt: Date.now() });
  return buildSpotifyAuthUrl(state);
}

/**
 * Valida y consume un estado OAuth (defensa contra CSRF).
 * Solo retorna true una vez por estado; los expirados se descartan.
 * @param {string} state
 * @returns {boolean}
 */
export function consumeSpotifyState(state) {
  if (!state) return false;
  const entry = spotifyOAuthStates.get(state);
  if (!entry) return false;
  spotifyOAuthStates.delete(state);
  return Date.now() - entry.createdAt <= SPOTIFY_STATE_TTL_MS;
}

async function generateUniqueUsername(base) {
  const cleanBase = (base || 'spotify_user')
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, '')
    .slice(0, 20) || 'spotify_user';

  let candidate = cleanBase;
  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await findOne('users', { username: candidate });
    if (!existing) return candidate;
    candidate = `${cleanBase}_${Math.random().toString(36).slice(2, 6)}`;
  }
  return `${cleanBase}_${Date.now().toString(36)}`;
}

/**
 * Crea o actualiza el usuario local a partir del perfil de Spotify.
 *
 * Estrategia:
 * 1. Si ya existe un usuario con ese spotify_id → login (actualiza avatar).
 * 2. Si no, pero existe un usuario con el mismo email (cuenta email/password)
 *    → se vincula el spotify_id (accounts linking).
 * 3. Si no existe → se crea una cuenta nueva.
 *
 * Los usuarios creados por OAuth reciben un password_hash aleatorio, por lo
 * que el login por email/contraseña siempre les falla (solo entran por OAuth).
 *
 * @param {object} profile - Respuesta de GET /v1/me de Spotify
 * @returns {Promise<object>} Fila de `users`
 */
export async function upsertSpotifyUser(profile) {
  const spotifyId = profile?.id;
  if (!spotifyId) {
    throw new AuthServiceError('Spotify profile is missing the user id', 400);
  }

  const avatarUrl = profile.images?.[0]?.url ?? null;

  const existing = await findOne('users', { spotify_id: spotifyId });
  if (existing) {
    const patch = {};
    if (avatarUrl && existing.avatar_url !== avatarUrl) {
      patch.avatar_url = avatarUrl;
    }
    if (Object.keys(patch).length > 0) {
      await update('users', patch, { id: existing.id });
    }
    return existing;
  }

  const email = profile.email ? profile.email.toLowerCase() : null;

  if (email) {
    const byEmail = await findOne('users', { email });
    if (byEmail) {
      await update('users', { spotify_id: spotifyId }, { id: byEmail.id });
      return byEmail;
    }
  }

  const username = await generateUniqueUsername(profile.display_name);
  const passwordHash = await hashPassword(crypto.randomBytes(24).toString('hex'));
  const fallbackEmail = email || `${spotifyId}@spotify.local`;

  const result = await insert('users', {
    username,
    email: fallbackEmail,
    password_hash: passwordHash,
    spotify_id: spotifyId,
    avatar_url: avatarUrl,
  });

  return findOne('users', { id: result.insertId });
}

/**
 * URL base del frontend, usada para redirigir tras el callback de OAuth.
 * @returns {string}
 */
export function getFrontendUrl() {
  return process.env.FRONTEND_URL || 'http://localhost:5173';
}
