/**
 * RUTAS DE FAVORITOS
 *
 * Define las rutas REST para gestión de favoritos:
 * - POST /api/favorites - Agregar favorito
 * - GET /api/favorites - Obtener favoritos
 * - DELETE /api/favorites/:id - Eliminar favorito
 *
 * Todas las rutas requieren autenticación JWT
 */

import express from 'express';
import { addFavorite, getFavorites, removeFavorite } from '../controllers/favorites.controller.js';
import { verifyTokenMiddleware } from '../middleware/verifyToken.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(verifyTokenMiddleware);

/**
 * AGREGAR FAVORITO
 * POST /api/favorites
 */
router.post('/', addFavorite);

/**
 * OBTENER FAVORITOS DEL USUARIO
 * GET /api/favorites
 */
router.get('/', getFavorites);

/**
 * ELIMINAR FAVORITO ESPECÍFICO
 * DELETE /api/favorites/:id
 */
router.delete('/:id', removeFavorite);

export default router;