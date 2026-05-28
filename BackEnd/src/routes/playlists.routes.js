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
import { verifyTokenMiddleware, requireRealUser } from '../middleware/verifyToken.js';
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

// Rutas de playlists (solo lectura para invitados)
router.post('/', requireRealUser, createPlaylist);
router.get('/', getPlaylists);
router.put('/:id', requireRealUser, updatePlaylist);
router.delete('/:id', requireRealUser, deletePlaylist);

// Rutas de tracks en playlists (solo lectura para invitados)
router.post('/:id/tracks', requireRealUser, addTrackToPlaylist);
router.get('/:id/tracks', getPlaylistTracks);
router.delete('/:id/tracks/:trackId', requireRealUser, removeTrackFromPlaylist);

export default router;
