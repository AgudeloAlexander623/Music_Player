/**
 * CONTROLADOR DE PLAYLISTS
 *
 * Maneja los endpoints REST de playlists:
 * - POST   /api/playlists             - Crear playlist
 * - GET    /api/playlists             - Obtener playlists del usuario
 * - PUT    /api/playlists/:id         - Actualizar playlist
 * - DELETE /api/playlists/:id         - Eliminar playlist
 * - POST   /api/playlists/:id/tracks  - Agregar track a playlist
 * - GET    /api/playlists/:id/tracks  - Obtener tracks de playlist
 * - DELETE /api/playlists/:id/tracks/:trackId - Eliminar track de playlist
 *
 * Validación con Zod, errores centralizados.
 */

import logger from '../utils/logger.js';
import { insert, findMany, findOne, update, remove } from '../db/database.js';
import { ValidationError, NotFoundError, ForbiddenError, sendErrorResponse } from '../utils/errors.js';
import {
  validate,
  createPlaylistSchema,
  updatePlaylistSchema,
  addTrackToPlaylistSchema,
} from '../utils/validation.js';

/**
 * Valida que un playlistId sea numérico.
 * @param {string} id - ID del playlist desde params
 * @returns {number}
 * @throws {ValidationError}
 */
function parsePlaylistId(id) {
  const parsed = parseInt(id);
  if (isNaN(parsed)) {
    throw new ValidationError('Invalid playlist ID');
  }
  return parsed;
}

/**
 * Verifica que la playlist existe y pertenece al usuario.
 * @param {number} playlistId
 * @param {number} userId
 * @returns {Promise<object>}
 * @throws {NotFoundError|ForbiddenError}
 */
async function verifyPlaylistOwnership(playlistId, userId) {
  const playlist = await findOne('playlists', { id: playlistId });

  if (!playlist) {
    throw new NotFoundError('Playlist not found');
  }

  if (playlist.user_id !== userId) {
    throw new ForbiddenError('Playlist belongs to another user');
  }

  return playlist;
}

/**
 * ENDPOINT: CREAR PLAYLIST
 *
 * POST /api/playlists
 * Headers: Authorization: Bearer <token>
 * Body: { name, description? }
 *
 * RESPUESTA EXITOSA (201): { success, message, playlist }
 */
export const createPlaylist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, description } = validate(createPlaylistSchema, req.body);

    const result = await insert('playlists', {
      user_id: userId,
      name: name.trim(),
      description: description ? description.trim() : null,
    });

    const playlist = await findOne('playlists', { id: result.insertId });

    res.status(201).json({
      success: true,
      message: 'Playlist created successfully',
      playlist,
    });
  } catch (error) {
    logger.error('Error creando playlist', { error: error.message });
    return sendErrorResponse(res, error);
  }
};

/**
 * ENDPOINT: OBTENER PLAYLISTS DEL USUARIO
 *
 * GET /api/playlists
 * Headers: Authorization: Bearer <token>
 *
 * RESPUESTA EXITOSA (200): { success, playlists }
 */
export const getPlaylists = async (req, res) => {
  try {
    const userId = req.user.userId;
    const playlists = await findMany('playlists', { user_id: userId });

    res.json({ success: true, playlists });
  } catch (error) {
    logger.error('Error obteniendo playlists', { error: error.message });
    return sendErrorResponse(res, error);
  }
};

/**
 * ENDPOINT: ACTUALIZAR PLAYLIST
 *
 * PUT /api/playlists/:id
 * Headers: Authorization: Bearer <token>
 * Body: { name?, description? }
 *
 * RESPUESTA EXITOSA (200): { success, message, playlist }
 */
export const updatePlaylist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const playlistId = parsePlaylistId(req.params.id);
    const data = validate(updatePlaylistSchema, req.body);

    await verifyPlaylistOwnership(playlistId, userId);

    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.description !== undefined) {
      updateData.description = data.description ? data.description.trim() : null;
    }

    await update('playlists', updateData, { id: playlistId });
    const updatedPlaylist = await findOne('playlists', { id: playlistId });

    res.json({
      success: true,
      message: 'Playlist updated successfully',
      playlist: updatedPlaylist,
    });
  } catch (error) {
    logger.error('Error actualizando playlist', { error: error.message });
    return sendErrorResponse(res, error);
  }
};

/**
 * ENDPOINT: ELIMINAR PLAYLIST
 *
 * DELETE /api/playlists/:id
 * Headers: Authorization: Bearer <token>
 *
 * RESPUESTA EXITOSA (200): { success, message }
 */
export const deletePlaylist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const playlistId = parsePlaylistId(req.params.id);

    await verifyPlaylistOwnership(playlistId, userId);

    await remove('playlists', { id: playlistId });

    res.json({
      success: true,
      message: 'Playlist deleted successfully',
    });
  } catch (error) {
    logger.error('Error eliminando playlist', { error: error.message });
    return sendErrorResponse(res, error);
  }
};

/**
 * ENDPOINT: AGREGAR TRACK A PLAYLIST
 *
 * POST /api/playlists/:id/tracks
 * Headers: Authorization: Bearer <token>
 * Body: { external_track_id, source, track_title, artist?, album?, album_image?, preview_url? }
 *
 * RESPUESTA EXITOSA (201): { success, message, track }
 */
export const addTrackToPlaylist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const playlistId = parsePlaylistId(req.params.id);
    const data = validate(addTrackToPlaylistSchema, req.body);

    await verifyPlaylistOwnership(playlistId, userId);

    const result = await insert('playlist_tracks', {
      playlist_id: playlistId,
      external_track_id: data.external_track_id,
      source: data.source,
      track_title: data.track_title,
      artist: data.artist || null,
      album: data.album || null,
      album_image: data.album_image || null,
      preview_url: data.preview_url || null,
      video_id: data.video_id || null,
    });

    const newTrack = await findOne('playlist_tracks', { id: result.insertId });

    res.status(201).json({
      success: true,
      message: 'Track added to playlist',
      track: newTrack,
    });
  } catch (error) {
    logger.error('Error agregando track a playlist', { error: error.message });
    return sendErrorResponse(res, error);
  }
};

/**
 * ENDPOINT: OBTENER TRACKS DE PLAYLIST
 *
 * GET /api/playlists/:id/tracks
 * Headers: Authorization: Bearer <token>
 *
 * RESPUESTA EXITOSA (200): { success, tracks }
 */
export const getPlaylistTracks = async (req, res) => {
  try {
    const userId = req.user.userId;
    const playlistId = parsePlaylistId(req.params.id);

    await verifyPlaylistOwnership(playlistId, userId);

    const tracks = await findMany('playlist_tracks', { playlist_id: playlistId });

    res.json({ success: true, tracks });
  } catch (error) {
    logger.error('Error obteniendo tracks de playlist', { error: error.message });
    return sendErrorResponse(res, error);
  }
};

/**
 * ENDPOINT: ELIMINAR TRACK DE PLAYLIST
 *
 * DELETE /api/playlists/:id/tracks/:trackId
 * Headers: Authorization: Bearer <token>
 *
 * RESPUESTA EXITOSA (200): { success, message }
 */
export const removeTrackFromPlaylist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const playlistId = parsePlaylistId(req.params.id);
    const trackId = parseInt(req.params.trackId);

    if (isNaN(trackId)) {
      throw new ValidationError('Invalid track ID');
    }

    await verifyPlaylistOwnership(playlistId, userId);

    const track = await findOne('playlist_tracks', { id: trackId, playlist_id: playlistId });

    if (!track) {
      throw new NotFoundError('Track not found in playlist');
    }

    await remove('playlist_tracks', { id: trackId });

    res.json({
      success: true,
      message: 'Track removed from playlist',
    });
  } catch (error) {
    logger.error('Error eliminando track de playlist', { error: error.message });
    return sendErrorResponse(res, error);
  }
};
