/**
 * CONTROLADOR DE FAVORITOS
 *
 * Maneja los endpoints REST de favoritos:
 * - POST   /api/favorites      - Agregar canción a favoritos
 * - GET    /api/favorites      - Obtener favoritos del usuario
 * - DELETE /api/favorites/:id  - Eliminar favorito específico
 *
 * Validación de datos con Zod, errores centralizados.
 */

import logger from '../utils/logger.js';
import { insert, findMany, remove, findOne } from '../db/database.js';
import { ValidationError, NotFoundError, ForbiddenError, ConflictError, sendErrorResponse } from '../utils/errors.js';
import { validate, addFavoriteSchema } from '../utils/validation.js';

/**
 * ENDPOINT: AGREGAR FAVORITO
 *
 * POST /api/favorites
 * Headers: Authorization: Bearer <token>
 * Body: { external_track_id, source, track_title, artist?, album?, album_image?, preview_url? }
 *
 * RESPUESTA EXITOSA (201): { success, message, favorite }
 */
export const addFavorite = async (req, res) => {
  try {
    const userId = req.user.userId;
    const data = validate(addFavoriteSchema, req.body);

    const existing = await findOne('favorite_tracks', {
      user_id: userId,
      external_track_id: data.external_track_id,
      source: data.source,
    });

    if (existing) {
      throw new ConflictError('Track already in favorites');
    }

    const result = await insert('favorite_tracks', {
      user_id: userId,
      external_track_id: data.external_track_id,
      source: data.source,
      track_title: data.track_title,
      artist: data.artist || null,
      album: data.album || null,
      album_image: data.album_image || null,
      preview_url: data.preview_url || null,
    });

    const favorite = await findOne('favorite_tracks', { id: result.insertId });

    res.status(201).json({
      success: true,
      message: 'Track added to favorites',
      favorite,
    });
  } catch (error) {
    logger.error('Error agregando favorito', { error: error.message });
    return sendErrorResponse(res, error);
  }
};

/**
 * ENDPOINT: OBTENER FAVORITOS
 *
 * GET /api/favorites
 * Headers: Authorization: Bearer <token>
 *
 * RESPUESTA EXITOSA (200): { success, favorites }
 */
export const getFavorites = async (req, res) => {
  try {
    const userId = req.user.userId;
    const favorites = await findMany('favorite_tracks', { user_id: userId });

    res.json({ success: true, favorites });
  } catch (error) {
    logger.error('Error obteniendo favoritos', { error: error.message });
    return sendErrorResponse(res, error);
  }
};

/**
 * ENDPOINT: ELIMINAR FAVORITO
 *
 * DELETE /api/favorites/:id
 * Headers: Authorization: Bearer <token>
 *
 * RESPUESTA EXITOSA (200): { success, message }
 */
export const removeFavorite = async (req, res) => {
  try {
    const userId = req.user.userId;
    const favoriteId = parseInt(req.params.id);

    if (isNaN(favoriteId)) {
      throw new ValidationError('Invalid favorite ID');
    }

    const favorite = await findOne('favorite_tracks', { id: favoriteId });

    if (!favorite) {
      throw new NotFoundError('Favorite not found');
    }

    if (favorite.user_id !== userId) {
      throw new ForbiddenError('Favorite belongs to another user');
    }

    await remove('favorite_tracks', { id: favoriteId });

    res.json({
      success: true,
      message: 'Track removed from favorites',
    });
  } catch (error) {
    logger.error('Error eliminando favorito', { error: error.message });
    return sendErrorResponse(res, error);
  }
};
