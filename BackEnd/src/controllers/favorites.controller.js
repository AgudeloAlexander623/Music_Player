/**
 * CONTROLADOR DE FAVORITOS
 *
 * Maneja los endpoints REST de favoritos:
 * - POST /api/favorites - Agregar canción a favoritos
 * - GET /api/favorites - Obtener favoritos del usuario
 * - DELETE /api/favorites/:id - Eliminar favorito específico
 *
 * INTEGRACIÓN CON BD:
 * - Usa MySQL para almacenar favoritos
 * - Valida propiedad del usuario con JWT
 * - Previene duplicados con unique key
 */

import { insert, findMany, remove, findOne } from '../db/database.js';

class FavoritesControllerError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'FavoritesControllerError';
    this.statusCode = statusCode;
  }
}

/**
 * ENDPOINT: AGREGAR FAVORITO
 *
 * POST /api/favorites
 * Headers: Authorization: Bearer <token>
 * Body: {
 *   external_track_id: "spotify:track:123",
 *   source: "spotify" | "musicbrainz",
 *   track_title: "Song Name",
 *   artist: "Artist Name",
 *   album: "Album Name",
 *   preview_url: "https://..." (opcional)
 * }
 *
 * RESPUESTA EXITOSA (201):
 * {
 *   success: true,
 *   message: "Track added to favorites",
 *   favorite: { id: 1, ... }
 * }
 *
 * ERRORES:
 * - 400: Datos faltantes o inválidos
 * - 409: Canción ya está en favoritos
 * - 401: No autorizado (sin token)
 * - 500: Error servidor
 */
export const addFavorite = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { external_track_id, source, track_title, artist, album, preview_url } = req.body;

    // Validar campos requeridos
    if (!external_track_id || !source || !track_title) {
      throw new FavoritesControllerError('Missing required fields: external_track_id, source, track_title', 400);
    }

    // Validar source
    if (!['spotify', 'musicbrainz'].includes(source)) {
      throw new FavoritesControllerError('Invalid source. Must be "spotify" or "musicbrainz"', 400);
    }

    // Verificar si ya existe el favorito
    const existing = await findOne('favorite_tracks', {
      user_id: userId,
      external_track_id,
      source
    });

    if (existing) {
      throw new FavoritesControllerError('Track already in favorites', 409);
    }

    // Insertar nuevo favorito
    const result = await insert('favorite_tracks', {
      user_id: userId,
      external_track_id,
      source,
      track_title,
      artist: artist || null,
      album: album || null,
      preview_url: preview_url || null
    });

    // Obtener el favorito insertado
    const favorite = await findOne('favorite_tracks', { id: result.insertId });

    res.status(201).json({
      success: true,
      message: 'Track added to favorites',
      favorite
    });

  } catch (error) {
    console.error('[Add Favorite Error]', error.message);

    if (error instanceof FavoritesControllerError) {
      return res.status(error.statusCode).json({
        error: error.message
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};

/**
 * ENDPOINT: OBTENER FAVORITOS
 *
 * GET /api/favorites
 * Headers: Authorization: Bearer <token>
 *
 * RESPUESTA EXITOSA (200):
 * {
 *   success: true,
 *   favorites: [
 *     {
 *       id: 1,
 *       external_track_id: "spotify:track:123",
 *       source: "spotify",
 *       track_title: "Song Name",
 *       artist: "Artist Name",
 *       album: "Album Name",
 *       preview_url: "https://...",
 *       added_at: "2026-04-30T10:00:00.000Z"
 *     },
 *     ...
 *   ]
 * }
 *
 * ERRORES:
 * - 401: No autorizado (sin token)
 * - 500: Error servidor
 */
export const getFavorites = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Obtener todos los favoritos del usuario
    const favorites = await findMany('favorite_tracks', { user_id: userId });

    res.json({
      success: true,
      favorites
    });

  } catch (error) {
    console.error('[Get Favorites Error]', error.message);

    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};

/**
 * ENDPOINT: ELIMINAR FAVORITO
 *
 * DELETE /api/favorites/:id
 * Headers: Authorization: Bearer <token>
 *
 * RESPUESTA EXITOSA (200):
 * {
 *   success: true,
 *   message: "Track removed from favorites"
 * }
 *
 * ERRORES:
 * - 400: ID inválido
 * - 404: Favorito no encontrado
 * - 403: No autorizado (favorito pertenece a otro usuario)
 * - 401: No autorizado (sin token)
 * - 500: Error servidor
 */
export const removeFavorite = async (req, res) => {
  try {
    const userId = req.user.userId;
    const favoriteId = parseInt(req.params.id);

    // Validar ID
    if (isNaN(favoriteId)) {
      throw new FavoritesControllerError('Invalid favorite ID', 400);
    }

    // Verificar que el favorito existe y pertenece al usuario
    const favorite = await findOne('favorite_tracks', { id: favoriteId });

    if (!favorite) {
      throw new FavoritesControllerError('Favorite not found', 404);
    }

    if (favorite.user_id !== userId) {
      throw new FavoritesControllerError('Forbidden: Favorite belongs to another user', 403);
    }

    // Eliminar favorito
    await remove('favorite_tracks', { id: favoriteId });

    res.json({
      success: true,
      message: 'Track removed from favorites'
    });

  } catch (error) {
    console.error('[Remove Favorite Error]', error.message);

    if (error instanceof FavoritesControllerError) {
      return res.status(error.statusCode).json({
        error: error.message
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};