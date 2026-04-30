/**
 * CONTROLADOR DE AUTENTICACIÓN
 *
 * Maneja los endpoints REST de autenticación:
 * - POST /api/auth/register - Crear nueva cuenta
 * - POST /api/auth/login - Iniciar sesión
 * - POST /api/auth/verify - Verificar token válido
 *
 * INTEGRACIÓN CON BD:
 * - Usa MySQL para almacenar usuarios
 * - Consulta ejecutadas a través del pool de conexiones
 * - Manejo de errores de BD integrado
 */

import {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  extractTokenFromHeader,
} from '../services/auth.service.js';
import { findOne, insert } from '../db/database.js';

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
    const { email, password } = req.body;

    // Validar entrada
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'email and password are required',
      });
    }

    // Validar formato de email simple
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format',
        details: 'Please provide a valid email address',
      });
    }

    // Validar longitud mínima de contraseña
    if (password.length < 6) {
      return res.status(400).json({
        error: 'Invalid password',
        details: 'Password must be at least 6 characters long',
      });
    }

    // Buscar si usuario ya existe
    const existingUser = await findOne('users', { email: email.toLowerCase() });

    if (existingUser) {
      return res.status(409).json({
        error: 'Email already registered',
        details: 'This email is already associated with an account. Try logging in instead.',
      });
    }

    // Hashear contraseña
    const hashedPassword = await hashPassword(password);

    // Insertar usuario en BD
    const result = await insert('users', {
      email: email.toLowerCase(),
      password_hash: hashedPassword,
    });

    const userId = result.insertId;

    // Generar token JWT
    const token = generateToken(userId, email.toLowerCase());

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        userId,
        email: email.toLowerCase(),
      },
    });
  } catch (error) {
    console.error(`[Register Error] ${error.message}`);

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

    // Generar token JWT
    const token = generateToken(user.id, user.email);

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: {
        userId: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error(`[Login Error] ${error.message}`);

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

    return res.status(200).json({
      success: true,
      message: 'Token is valid',
      user: {
        userId: decoded.userId,
        email: decoded.email,
      },
    });
  } catch (error) {
    console.error(`[Verify Token Error] ${error.message}`);

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
