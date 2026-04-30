/**
 * CONTROLADOR DE PLAYLISTS
 *
 * Maneja los endpoints REST de playlists:
 * - POST /api/playlists - Crear playlist
 * - GET /api/playlists - Obtener playlists del usuario
 * - PUT /api/playlists/:id - Actualizar playlist
 * - DELETE /api/playlists/:id - Eliminar playlist
 *
 * Manejo de tracks en playlists:
 * - POST /api/playlists/:id/tracks - Agregar track a playlist
 * - GET /api/playlists/:id/tracks - Obtener tracks de playlist
 * - DELETE /api/playlists/:id/tracks/:trackId - Eliminar track de playlist
 *
 * INTEGRACIÓN CON BD:
 * - Usa MySQL para almacenar playlists y tracks
 * - Valida propiedad del usuario con JWT
 */

import { insert, findMany, findOne, update, remove } from '../db/database.js';

class PlaylistsControllerError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'PlaylistsControllerError';
    this.statusCode = statusCode;
  }
}

/**
 * ENDPOINT: CREAR PLAYLIST
 *
 * POST /api/playlists
 * Headers: Authorization: Bearer <token>
 * Body: {
 *   name: "Mi Playlist",
 *   description: "Descripción opcional"
 * }
 *
 * RESPUESTA EXITOSA (201):
 * {
 *   success: true,
 *   message: "Playlist created successfully",
 *   playlist: { id: 1, name: "...", ... }
 * }
 */
export const createPlaylist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, description } = req.body;

    // Validar nombre requerido
    if (!name || name.trim().length === 0) {
      throw new PlaylistsControllerError('Playlist name is required', 400);
    }

    // Crear playlist
    const result = await insert('playlists', {
      user_id: userId,
      name: name.trim(),
      description: description ? description.trim() : null
    });

    // Obtener playlist creada
    const playlist = await findOne('playlists', { id: result.insertId });

    res.status(201).json({
      success: true,
      message: 'Playlist created successfully',
      playlist
    });

  } catch (error) {
    console.error('[Create Playlist Error]', error.message);

    if (error instanceof PlaylistsControllerError) {
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
 * ENDPOINT: OBTENER PLAYLISTS DEL USUARIO
 *
 * GET /api/playlists
 * Headers: Authorization: Bearer <token>
 *
 * RESPUESTA EXITOSA (200):
 * {
 *   success: true,
 *   playlists: [
 *     {
 *       id: 1,
 *       name: "Mi Playlist",
 *       description: "Descripción",
 *       created_at: "2026-04-30T10:00:00.000Z",
 *       updated_at: "2026-04-30T10:00:00.000Z"
 *     },
 *     ...
 *   ]
 * }
 */
export const getPlaylists = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Obtener playlists del usuario
    const playlists = await findMany('playlists', { user_id: userId });

    res.json({
      success: true,
      playlists
    });

  } catch (error) {
    console.error('[Get Playlists Error]', error.message);

    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};

/**
 * ENDPOINT: ACTUALIZAR PLAYLIST
 *
 * PUT /api/playlists/:id
 * Headers: Authorization: Bearer <token>
 * Body: {
 *   name: "Nuevo nombre",
 *   description: "Nueva descripción"
 * }
 *
 * RESPUESTA EXITOSA (200):
 * {
 *   success: true,
 *   message: "Playlist updated successfully",
 *   playlist: { ... }
 * }
 */
export const updatePlaylist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const playlistId = parseInt(req.params.id);
    const { name, description } = req.body;

    // Validar ID
    if (isNaN(playlistId)) {
      throw new PlaylistsControllerError('Invalid playlist ID', 400);
    }

    // Verificar que la playlist existe y pertenece al usuario
    const playlist = await findOne('playlists', { id: playlistId });

    if (!playlist) {
      throw new PlaylistsControllerError('Playlist not found', 404);
    }

    if (playlist.user_id !== userId) {
      throw new PlaylistsControllerError('Forbidden: Playlist belongs to another user', 403);
    }

    // Validar nombre si se proporciona
    if (name !== undefined && (name === null || name.trim().length === 0)) {
      throw new PlaylistsControllerError('Playlist name cannot be empty', 400);
    }

    // Preparar datos para actualizar
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description ? description.trim() : null;

    // Actualizar playlist
    await update('playlists', updateData, { id: playlistId });

    // Obtener playlist actualizada
    const updatedPlaylist = await findOne('playlists', { id: playlistId });

    res.json({
      success: true,
      message: 'Playlist updated successfully',
      playlist: updatedPlaylist
    });

  } catch (error) {
    console.error('[Update Playlist Error]', error.message);

    if (error instanceof PlaylistsControllerError) {
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
 * ENDPOINT: ELIMINAR PLAYLIST
 *
 * DELETE /api/playlists/:id
 * Headers: Authorization: Bearer <token>
 *
 * RESPUESTA EXITOSA (200):
 * {
 *   success: true,
 *   message: "Playlist deleted successfully"
 * }
 */
export const deletePlaylist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const playlistId = parseInt(req.params.id);

    // Validar ID
    if (isNaN(playlistId)) {
      throw new PlaylistsControllerError('Invalid playlist ID', 400);
    }

    // Verificar que la playlist existe y pertenece al usuario
    const playlist = await findOne('playlists', { id: playlistId });

    if (!playlist) {
      throw new PlaylistsControllerError('Playlist not found', 404);
    }

    if (playlist.user_id !== userId) {
      throw new PlaylistsControllerError('Forbidden: Playlist belongs to another user', 403);
    }

    // Eliminar playlist (los tracks se eliminan automáticamente por CASCADE)
    await remove('playlists', { id: playlistId });

    res.json({
      success: true,
      message: 'Playlist deleted successfully'
    });

  } catch (error) {
    console.error('[Delete Playlist Error]', error.message);

    if (error instanceof PlaylistsControllerError) {
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
 * ENDPOINT: AGREGAR TRACK A PLAYLIST
 *
 * POST /api/playlists/:id/tracks
 * Headers: Authorization: Bearer <token>
 * Body: {
 *   external_track_id: "spotify:track:123",
 *   source: "spotify" | "musicbrainz",
 *   track_title: "Song Name",
 *   artist: "Artist Name",
 *   album: "Album Name",
 *   preview_url: "https://..."
 * }
 *
 * RESPUESTA EXITOSA (201):
 * {
 *   success: true,
 *   message: "Track added to playlist",
 *   track: { id: 1, ... }
 * }
 */
export const addTrackToPlaylist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const playlistId = parseInt(req.params.id);
    const { external_track_id, source, track_title, artist, album, preview_url } = req.body;

    // Validar ID de playlist
    if (isNaN(playlistId)) {
      throw new PlaylistsControllerError('Invalid playlist ID', 400);
    }

    // Verificar que la playlist existe y pertenece al usuario
    const playlist = await findOne('playlists', { id: playlistId });

    if (!playlist) {
      throw new PlaylistsControllerError('Playlist not found', 404);
    }

    if (playlist.user_id !== userId) {
      throw new PlaylistsControllerError('Forbidden: Playlist belongs to another user', 403);
    }

    // Validar campos requeridos
    if (!external_track_id || !source || !track_title) {
      throw new PlaylistsControllerError('Missing required fields: external_track_id, source, track_title', 400);
    }

    // Validar source
    if (!['spotify', 'musicbrainz'].includes(source)) {
      throw new PlaylistsControllerError('Invalid source. Must be "spotify" or "musicbrainz"', 400);
    }

    // Agregar track a la playlist
    const result = await insert('playlist_tracks', {
      playlist_id: playlistId,
      external_track_id,
      source,
      track_title,
      artist: artist || null,
      album: album || null,
      preview_url: preview_url || null
    });

    // Obtener el track agregado
    const track = await findOne('playlist_tracks', { id: result.insertId });

    res.status(201).json({
      success: true,
      message: 'Track added to playlist',
      track
    });

  } catch (error) {
    console.error('[Add Track to Playlist Error]', error.message);

    if (error instanceof PlaylistsControllerError) {
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
 * ENDPOINT: OBTENER TRACKS DE PLAYLIST
 *
 * GET /api/playlists/:id/tracks
 * Headers: Authorization: Bearer <token>
 *
 * RESPUESTA EXITOSA (200):
 * {
 *   success: true,
 *   tracks: [
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
 */
export const getPlaylistTracks = async (req, res) => {
  try {
    const userId = req.user.userId;
    const playlistId = parseInt(req.params.id);

    // Validar ID
    if (isNaN(playlistId)) {
      throw new PlaylistsControllerError('Invalid playlist ID', 400);
    }

    // Verificar que la playlist existe y pertenece al usuario
    const playlist = await findOne('playlists', { id: playlistId });

    if (!playlist) {
      throw new PlaylistsControllerError('Playlist not found', 404);
    }

    if (playlist.user_id !== userId) {
      throw new PlaylistsControllerError('Forbidden: Playlist belongs to another user', 403);
    }

    // Obtener tracks de la playlist
    const tracks = await findMany('playlist_tracks', { playlist_id: playlistId });

    res.json({
      success: true,
      tracks
    });

  } catch (error) {
    console.error('[Get Playlist Tracks Error]', error.message);

    if (error instanceof PlaylistsControllerError) {
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
 * ENDPOINT: ELIMINAR TRACK DE PLAYLIST
 *
 * DELETE /api/playlists/:id/tracks/:trackId
 * Headers: Authorization: Bearer <token>
 *
 * RESPUESTA EXITOSA (200):
 * {
 *   success: true,
 *   message: "Track removed from playlist"
 * }
 */
export const removeTrackFromPlaylist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const playlistId = parseInt(req.params.id);
    const trackId = parseInt(req.params.trackId);

    // Validar IDs
    if (isNaN(playlistId)) {
      throw new PlaylistsControllerError('Invalid playlist ID', 400);
    }

    if (isNaN(trackId)) {
      throw new PlaylistsControllerError('Invalid track ID', 400);
    }

    // Verificar que la playlist existe y pertenece al usuario
    const playlist = await findOne('playlists', { id: playlistId });

    if (!playlist) {
      throw new PlaylistsControllerError('Playlist not found', 404);
    }

    if (playlist.user_id !== userId) {
      throw new PlaylistsControllerError('Forbidden: Playlist belongs to another user', 403);
    }

    // Verificar que el track existe en la playlist
    const track = await findOne('playlist_tracks', { id: trackId, playlist_id: playlistId });

    if (!track) {
      throw new PlaylistsControllerError('Track not found in playlist', 404);
    }

    // Eliminar track de la playlist
    await remove('playlist_tracks', { id: trackId });

    res.json({
      success: true,
      message: 'Track removed from playlist'
    });

  } catch (error) {
    console.error('[Remove Track from Playlist Error]', error.message);

    if (error instanceof PlaylistsControllerError) {
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