/**
 * RUTAS DE AUTENTICACIÓN
 *
 * Define los endpoints REST para:
 * - Registro de usuarios
 * - Login
 * - Verificación de tokens
 *
 * Todas las rutas son públicas (sin middleware JWT)
 * El middleware se aplica en rutas protegidas
 */

import express from 'express';
import {
  register,
  login,
  verifyTokenEndpoint,
} from '../controllers/auth.controller.js';

const router = express.Router();

/**
 * POST /api/auth/register
 * Crear nueva cuenta de usuario
 *
 * Body:
 * {
 *   "email": "user@example.com",
 *   "password": "securePassword123"
 * }
 *
 * Respuesta: { success, token, user }
 */
router.post('/register', register);

/**
 * POST /api/auth/login
 * Iniciar sesión con email y contraseña
 *
 * Body:
 * {
 *   "email": "user@example.com",
 *   "password": "securePassword123"
 * }
 *
 * Respuesta: { success, token, user }
 */
router.post('/login', login);

/**
 * POST /api/auth/verify
 * Verificar que un token JWT es válido
 *
 * Headers:
 * Authorization: Bearer <token>
 *
 * Respuesta: { success, user }
 */
router.post('/verify', verifyTokenEndpoint);

export default router;
