/**
 * RUTAS DE PLAYLISTS
 *
 * Define los endpoints REST para gestión de playlists:
 * - POST /api/playlists - Crear playlist
 * - GET /api/playlists - Obtener playlists del usuario
 * - PUT /api/playlists/:id - Actualizar playlist
 * - DELETE /api/playlists/:id - Eliminar playlist
 * - POST /api/playlists/:id/tracks - Agregar track a playlist
 * - GET /api/playlists/:id/tracks - Obtener tracks de playlist
 * - DELETE /api/playlists/:id/tracks/:trackId - Eliminar track de playlist
 *
 * Todas las rutas requieren autenticación JWT
 */

import express from 'express';
import { verifyTokenMiddleware } from '../middleware/verifyToken.js';
import {
  createPlaylist,
  getPlaylists,
  updatePlaylist,
  deletePlaylist,
  addTrackToPlaylist,
  getPlaylistTracks,
  removeTrackFromPlaylist,
} from '../controllers/playlists.controller.js';

const router = express.Router();

// Middleware de autenticación para todas las rutas
router.use(verifyTokenMiddleware);

// Rutas de playlists
router.post('/', createPlaylist);
router.get('/', getPlaylists);
router.put('/:id', updatePlaylist);
router.delete('/:id', deletePlaylist);

// Rutas de tracks en playlists
router.post('/:id/tracks', addTrackToPlaylist);
router.get('/:id/tracks', getPlaylistTracks);
router.delete('/:id/tracks/:trackId', removeTrackFromPlaylist);

export default router;
