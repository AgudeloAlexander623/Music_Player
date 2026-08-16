/**
 * CONTROLADOR DE AUTENTICACIÓN
 *
 * Maneja los endpoints REST de autenticación:
 * - POST /api/auth/register  - Crear nueva cuenta
 * - POST /api/auth/login     - Iniciar sesión
 * - POST /api/auth/verify    - Verificar token válido
 * - POST /api/auth/guest     - Sesión de invitado (sin registro)
 *
 * INTEGRACIÓN CON BD:
 * - Usa PostgreSQL para almacenar usuarios y refresh tokens
 * - Consultas ejecutadas a través del pool de conexiones
 */

import logger from '../utils/logger.js';
import {
  hashPassword,
  comparePassword,
  generateToken,
  generateGuestToken,
  verifyToken,
  extractTokenFromHeader,
  generateRefreshToken,
  hashRefreshToken,
  createSpotifyLoginUrl,
  consumeSpotifyState,
  upsertSpotifyUser,
  getFrontendUrl,
} from '../services/auth.service.js';
import { exchangeSpotifyCode, getSpotifyProfile } from '../services/spotify.services.js';
import { findOne, insert, findMany, remove } from '../db/database.js';
import { ValidationError, AuthError, ConflictError, ForbiddenError, sendErrorResponse } from '../utils/errors.js';
import { validate, registerSchema, loginSchema, refreshTokenSchema } from '../utils/validation.js';

/**
 * Valida que el email tenga un formato razonable.
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * ENDPOINT: REGISTRO DE USUARIO
 *
 * POST /api/auth/register
 * Body: { email, password, username }
 *
 * RESPUESTA EXITOSA (201):
 * { success, message, token, refresh_token, user }
 */
export const register = async (req, res) => {
  try {
    const { email, password, username } = validate(registerSchema, req.body);

    if (!isValidEmail(email)) {
      throw new ValidationError('Invalid email format');
    }

    const emailLower = email.toLowerCase();
    const usernameTrimmed = username.trim();

    const [existingUser, existingUsername] = await Promise.all([
      findOne('users', { email: emailLower }),
      findOne('users', { username: usernameTrimmed }),
    ]);

    if (existingUser) {
      throw new ConflictError('This email is already associated with an account. Try logging in instead.');
    }

    if (existingUsername) {
      throw new ConflictError('This username is already in use. Please choose another.');
    }

    const hashedPassword = await hashPassword(password);

    const result = await insert('users', {
      username: usernameTrimmed,
      email: emailLower,
      password_hash: hashedPassword,
    });

    const userId = result.insertId;

    const accessToken = generateToken(userId, emailLower);
    const refreshTokenData = generateRefreshToken();

    await insert('refresh_tokens', {
      user_id: userId,
      token_hash: refreshTokenData.tokenHash,
      expires_at: refreshTokenData.expiresAt,
    });

    const newUser = await findOne('users', { id: userId });

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token: accessToken,
      refresh_token: refreshTokenData.token,
      user: {
        userId,
        username: usernameTrimmed,
        email: emailLower,
        created_at: newUser.created_at,
      },
    });
  } catch (error) {
    logger.error('Error en registro', { error: error.message });
    return sendErrorResponse(res, error);
  }
};

/**
 * ENDPOINT: LOGIN DE USUARIO
 *
 * POST /api/auth/login
 * Body: { email, password }
 *
 * RESPUESTA EXITOSA (200):
 * { success, message, token, refresh_token, user }
 */
export const login = async (req, res) => {
  try {
    const { email, password } = validate(loginSchema, req.body);

    const user = await findOne('users', { email: email.toLowerCase() });

    if (!user) {
      throw new AuthError('Email or password is incorrect');
    }

    const passwordValid = await comparePassword(password, user.password_hash);

    if (!passwordValid) {
      throw new AuthError('Email or password is incorrect');
    }

    if (!user.is_active) {
      throw new ForbiddenError('This account has been disabled. Contact support.');
    }

    const accessToken = generateToken(user.id, user.email);
    const refreshTokenData = generateRefreshToken();

    await insert('refresh_tokens', {
      user_id: user.id,
      token_hash: refreshTokenData.tokenHash,
      expires_at: refreshTokenData.expiresAt,
    });

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      token: accessToken,
      refresh_token: refreshTokenData.token,
      user: {
        userId: user.id,
        username: user.username,
        email: user.email,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    logger.error('Error en login', { error: error.message });
    return sendErrorResponse(res, error);
  }
};

/**
 * ENDPOINT: VERIFICAR TOKEN
 *
 * POST /api/auth/verify
 * Header: Authorization: Bearer <token>
 *
 * RESPUESTA EXITOSA (200):
 * { success, message, user }
 */
export const verifyTokenEndpoint = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    let token;
    try {
      token = extractTokenFromHeader(authHeader);
    } catch (error) {
      throw new AuthError(error.message);
    }

    if (!token) {
      throw new AuthError('Authorization header with Bearer token is required');
    }

    const decoded = verifyToken(token);

    const user = decoded.guest
      ? { guest: true }
      : { userId: decoded.userId, email: decoded.email };

    return res.status(200).json({
      success: true,
      message: 'Token is valid',
      user,
    });
  } catch (error) {
    logger.error('Error verificando token', { error: error.message });
    return sendErrorResponse(res, error);
  }
};

/**
 * ENDPOINT: INICIO DE SESIÓN COMO INVITADO
 *
 * POST /api/auth/guest
 * Sin body requerido. Genera token JWT con flag guest: true.
 *
 * RESPUESTA EXITOSA (200):
 * { success, message, token, user: { guest: true } }
 */
export const guestLogin = async (req, res) => {
  try {
    const token = generateGuestToken();

    return res.status(200).json({
      success: true,
      message: 'Guest session started',
      token,
      user: { guest: true },
    });
  } catch (error) {
    logger.error('Error en guest login', { error: error.message });
    return sendErrorResponse(res, error);
  }
};

/**
 * ENDPOINT: REFRESCAR TOKEN
 *
 * POST /api/auth/refresh
 * Body: { refresh_token }
 *
 * Recibe un refresh token válido y retorna un nuevo access token.
 * Implementa rotación de refresh token por seguridad.
 *
 * RESPUESTA EXITOSA (200):
 * { success, token, refresh_token, user }
 */
export const refreshToken = async (req, res) => {
  try {
    const { refresh_token } = validate(refreshTokenSchema, req.body);

    const tokenHash = hashRefreshToken(refresh_token);
    const storedToken = await findOne('refresh_tokens', { token_hash: tokenHash });

    if (!storedToken) {
      throw new AuthError('Refresh token not found. Please log in again.');
    }

    if (storedToken.revoked) {
      const userTokens = await findMany('refresh_tokens', { user_id: storedToken.user_id });
      for (const t of userTokens) {
        await remove('refresh_tokens', { id: t.id });
      }

      throw new AuthError('This token has been revoked. Please log in again.');
    }

    if (new Date() > new Date(storedToken.expires_at)) {
      await remove('refresh_tokens', { id: storedToken.id });
      throw new AuthError('Your session has expired. Please log in again.');
    }

    const user = await findOne('users', { id: storedToken.user_id });

    if (!user) {
      throw new AuthError('The user associated with this token no longer exists.');
    }

    if (!user.is_active) {
      throw new ForbiddenError('This account has been disabled.');
    }

    await remove('refresh_tokens', { id: storedToken.id });

    const newAccessToken = generateToken(user.id, user.email);
    const newRefreshTokenData = generateRefreshToken();

    await insert('refresh_tokens', {
      user_id: user.id,
      token_hash: newRefreshTokenData.tokenHash,
      expires_at: newRefreshTokenData.expiresAt,
    });

    return res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      token: newAccessToken,
      refresh_token: newRefreshTokenData.token,
      user: {
        userId: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    logger.error('Error refrescando token', { error: error.message });
    return sendErrorResponse(res, error);
  }
};

/**
 * ENDPOINT: CERRAR SESIÓN
 *
 * POST /api/auth/logout
 * Headers: Authorization: Bearer <token>
 *
 * Invalida todos los refresh tokens del usuario.
 *
 * RESPUESTA EXITOSA (200):
 * { success, message }
 */
export const logout = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new AuthError('No valid user session found.');
    }

    const tokens = await findMany('refresh_tokens', { user_id: userId });
    for (const t of tokens) {
      await remove('refresh_tokens', { id: t.id });
    }

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    logger.error('Error en logout', { error: error.message });
    return sendErrorResponse(res, error);
  }
};

/**
 * ENDPOINT: INICIAR LOGIN SOCIAL CON SPOTIFY
 *
 * GET /api/auth/spotify/login
 * Redirige (302) al navegador a la página de autorización de Spotify.
 */
export const spotifyLogin = async (_req, res) => {
  try {
    const url = createSpotifyLoginUrl();
    return res.redirect(url);
  } catch (error) {
    logger.error('Error iniciando login de Spotify', { error: error.message });
    return sendErrorResponse(res, error);
  }
};

/**
 * ENDPOINT: CALLBACK DE SPOTIFY OAuth
 *
 * GET /api/auth/spotify/callback?code=...&state=...
 * Spotify redirige aquí tras la autorización. El backend:
 * 1. Valida el estado (anti-CSRF)
 * 2. Intercambia el code por tokens
 * 3. Obtiene el perfil del usuario (/v1/me)
 * 4. Crea/vincula/actualiza el usuario local
 * 5. Emite JWT + refresh token y redirige al frontend con la sesión
 */
export const spotifyCallback = async (req, res) => {
  const frontendUrl = getFrontendUrl();

  try {
    const { code, state, error: spotifyError } = req.query;

    if (spotifyError) {
      logger.warn('Usuario rechazó la autorización de Spotify', { error: spotifyError });
      return res.redirect(`${frontendUrl}/login?error=spotify_denied`);
    }

    if (!consumeSpotifyState(state)) {
      logger.warn('Estado OAuth inválido o expirado');
      return res.redirect(`${frontendUrl}/login?error=invalid_state`);
    }

    if (!code) {
      logger.warn('Falta el código de autorización de Spotify');
      return res.redirect(`${frontendUrl}/login?error=missing_code`);
    }

    const tokenData = await exchangeSpotifyCode(code);
    const profile = await getSpotifyProfile(tokenData.access_token);

    const user = await upsertSpotifyUser(profile);

    if (!user.is_active) {
      throw new ForbiddenError('This account has been disabled.');
    }

    const accessToken = generateToken(user.id, user.email);
    const refreshTokenData = generateRefreshToken();

    await insert('refresh_tokens', {
      user_id: user.id,
      token_hash: refreshTokenData.tokenHash,
      expires_at: refreshTokenData.expiresAt,
    });

    const params = new URLSearchParams({
      token: accessToken,
      refresh_token: refreshTokenData.token,
      user: JSON.stringify({
        userId: user.id,
        username: user.username,
        email: user.email,
        avatar_url: user.avatar_url ?? null,
      }),
    });

    return res.redirect(`${frontendUrl}/auth/callback?${params.toString()}`);
  } catch (error) {
    logger.error('Error en callback de Spotify', { error: error.message });
    return res.redirect(`${frontendUrl}/login?error=spotify_auth_failed`);
  }
};
