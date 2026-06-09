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
 * - Usa MySQL para almacenar usuarios
 * - Consulta ejecutadas a través del pool de conexiones
 * - Manejo de errores de BD integrado
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
} from '../services/auth.service.js';
import { findOne, insert, findMany, remove } from '../db/database.js';

class AuthControllerError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'AuthControllerError';
    this.statusCode = statusCode;
  }
}

/**
 * ENDPOINT: REGISTRO DE USUARIO
 *
 * POST /api/auth/register
 * Body: { email, password }
 *
 * RESPUESTA EXITOSA (201):
 * {
 *   success: true,
 *   message: "User registered successfully",
 *   token: "eyJhbGc...",
 *   user: { userId: 1, email: "user@example.com" }
 * }
 *
 * ERRORES:
 * - 400: Email/contraseña faltante o inválida
 * - 409: Email ya registrado
 * - 500: Error servidor
 */
export const register = async (req, res) => {
  try {
    const { email, password, username } = req.body;

    // Validar entrada
    if (!email || !password || !username) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'email, password, and username are required',
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format',
        details: 'Please provide a valid email address',
      });
    }

    // Validar username
    const usernameTrimmed = username.trim();
    if (usernameTrimmed.length < 3) {
      return res.status(400).json({
        error: 'Invalid username',
        details: 'Username must be at least 3 characters long',
      });
    }

    // Validar longitud mínima de contraseña
    if (password.length < 6) {
      return res.status(400).json({
        error: 'Invalid password',
        details: 'Password must be at least 6 characters long',
      });
    }

    const emailLower = email.toLowerCase();

    // Buscar si usuario ya existe por email
    const existingUser = await findOne('users', { email: emailLower });

    if (existingUser) {
      return res.status(409).json({
        error: 'Email already registered',
        details: 'This email is already associated with an account. Try logging in instead.',
      });
    }

    // Buscar si el username ya está tomado
    const existingUsername = await findOne('users', { username: usernameTrimmed });

    if (existingUsername) {
      return res.status(409).json({
        error: 'Username already taken',
        details: 'This username is already in use. Please choose another.',
      });
    }

    // Hashear contraseña
    const hashedPassword = await hashPassword(password);

    // Insertar usuario en BD
    const result = await insert('users', {
      username: usernameTrimmed,
      email: emailLower,
      password_hash: hashedPassword,
    });

    const userId = result.insertId;

    // Generar tokens
    const accessToken = generateToken(userId, emailLower);
    const refreshTokenData = generateRefreshToken();

    // Almacenar refresh token en BD
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

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        error: error.name,
        details: error.message,
      });
    }

    return res.status(500).json({
      error: 'Registration failed',
      details: error.message,
    });
  }
};

/**
 * ENDPOINT: LOGIN DE USUARIO
 *
 * POST /api/auth/login
 * Body: { email, password }
 *
 * RESPUESTA EXITOSA (200):
 * {
 *   success: true,
 *   message: "Logged in successfully",
 *   token: "eyJhbGc...",
 *   user: { userId: 1, email: "user@example.com" }
 * }
 *
 * ERRORES:
 * - 400: Email/contraseña faltante
 * - 401: Email no existe o contraseña incorrecta
 * - 500: Error servidor
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validar entrada
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'email and password are required',
      });
    }

    // Buscar usuario en BD por email
    const user = await findOne('users', { email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        details: 'Email or password is incorrect',
      });
    }

    // Comparar contraseña contra hash almacenado
    const passwordValid = await comparePassword(password, user.password_hash);

    if (!passwordValid) {
      return res.status(401).json({
        error: 'Invalid credentials',
        details: 'Email or password is incorrect',
      });
    }

    // Verificar que la cuenta esté activa
    if (!user.is_active) {
      return res.status(403).json({
        error: 'Account disabled',
        details: 'This account has been disabled. Contact support.',
      });
    }

    // Generar tokens
    const accessToken = generateToken(user.id, user.email);
    const refreshTokenData = generateRefreshToken();

    // Almacenar refresh token en BD
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

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        error: error.name,
        details: error.message,
      });
    }

    return res.status(500).json({
      error: 'Login failed',
      details: error.message,
    });
  }
};

/**
 * ENDPOINT: VERIFICAR TOKEN
 *
 * POST /api/auth/verify
 * Header: Authorization: Bearer <token>
 *
 * RESPUESTA EXITOSA (200):
 * {
 *   success: true,
 *   message: "Token is valid",
 *   user: { userId: 1, email: "user@example.com" }
 * }
 *
 * ERRORES:
 * - 401: Token faltante, inválido o expirado
 * - 500: Error servidor
 */
export const verifyTokenEndpoint = async (req, res) => {
  try {
    // Extraer token del header Authorization
    const authHeader = req.headers.authorization;
    let token;

    try {
      token = extractTokenFromHeader(authHeader);
    } catch (error) {
      return res.status(401).json({
        error: error.name,
        details: error.message,
      });
    }

    if (!token) {
      return res.status(401).json({
        error: 'Missing authorization',
        details: 'Authorization header with Bearer token is required',
      });
    }

    // Verificar token
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

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        error: error.name,
        details: error.message,
      });
    }

    return res.status(500).json({
      error: 'Token verification failed',
      details: error.message,
    });
  }
};

/**
 * ENDPOINT: INICIO DE SESIÓN COMO INVITADO
 *
 * POST /api/auth/guest
 * Sin body requerido
 * No requiere registro ni autenticación previa
 *
 * FLUJO:
 * 1. Genera token JWT con flag guest: true
 * 2. No consulta BD (no necesita usuario real)
 * 3. Retorna token con sesión limitada
 *
 * RESPUESTA EXITOSA (200):
 * {
 *   success: true,
 *   message: "Guest session started",
 *   token: "eyJhbGc...",
 *   user: { guest: true }
 * }
 *
 * LIMITACIONES DEL MODO INVITADO:
 * - Puede buscar canciones y explorar la app
 * - No puede guardar favoritos
 * - No puede crear/modificar playlists
 * - Los endpoints mutantes retornan 403
 *
 * ERRORES:
 * - 500: Error al generar token
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

    return res.status(500).json({
      error: 'Guest login failed',
      details: error.message,
    });
  }
};

/**
 * ENDPOINT: REFRESCAR TOKEN
 *
 * POST /api/auth/refresh
 * Body: { refresh_token }
 *
 * Recibe un refresh token válido y retorna un nuevo access token
 * Opcionalmente rota el refresh token (revoca el anterior, crea uno nuevo)
 *
 * RESPUESTA EXITOSA (200):
 * {
 *   success: true,
 *   token: "nuevo.jwt.token",
 *   refresh_token: "nuevo-refresh-token"
 * }
 */
export const refreshToken = async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        error: 'Missing refresh token',
        details: 'refresh_token field is required',
      });
    }

    // Hashear el token recibido para buscar en BD
    const tokenHash = hashRefreshToken(refresh_token);

    // Buscar token en BD
    const storedToken = await findOne('refresh_tokens', { token_hash: tokenHash });

    if (!storedToken) {
      return res.status(401).json({
        error: 'Invalid refresh token',
        details: 'Refresh token not found. Please log in again.',
      });
    }

    // Verificar que no esté revocado
    if (storedToken.revoked) {
      // Si el token fue revocado, podría ser un intento de reuso
      // Revocar todos los tokens del usuario por seguridad
      const userTokens = await findMany('refresh_tokens', { user_id: storedToken.user_id });
      for (const t of userTokens) {
        await remove('refresh_tokens', { id: t.id });
      }

      return res.status(401).json({
        error: 'Refresh token revoked',
        details: 'This token has been revoked. Please log in again.',
      });
    }

    // Verificar expiración
    if (new Date() > new Date(storedToken.expires_at)) {
      await remove('refresh_tokens', { id: storedToken.id });
      return res.status(401).json({
        error: 'Refresh token expired',
        details: 'Your session has expired. Please log in again.',
      });
    }

    // Obtener datos del usuario
    const user = await findOne('users', { id: storedToken.user_id });

    if (!user) {
      return res.status(401).json({
        error: 'User not found',
        details: 'The user associated with this token no longer exists.',
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        error: 'Account disabled',
        details: 'This account has been disabled.',
      });
    }

    // Rotación de refresh token: revocar el anterior, crear uno nuevo
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

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        error: error.name,
        details: error.message,
      });
    }

    return res.status(500).json({
      error: 'Token refresh failed',
      details: error.message,
    });
  }
};

/**
 * ENDPOINT: CERRAR SESIÓN
 *
 * POST /api/auth/logout
 * Body: { refresh_token } (opcional)
 * Headers: Authorization: Bearer <token> (opcional)
 *
 * Invalida todos los refresh tokens del usuario
 *
 * RESPUESTA EXITOSA (200):
 * {
 *   success: true,
 *   message: "Logged out successfully"
 * }
 */
export const logout = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        error: 'Not authenticated',
        details: 'No valid user session found.',
      });
    }

    // Eliminar todos los refresh tokens del usuario
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

    return res.status(500).json({
      error: 'Logout failed',
      details: error.message,
    });
  }
};
