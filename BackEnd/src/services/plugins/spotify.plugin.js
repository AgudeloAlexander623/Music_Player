/**
 * PLUGIN DE SPOTIFY
 *
 * Búsqueda musical con previews de 30 segundos.
 * Se activa automáticamente cuando hay credenciales válidas
 * (SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET en .env o configuradas
 * desde la UI vía POST /api/spotify/configure).
 */

import { searchSpotify, getClientId, getClientSecret } from '../spotify.services.js';

export default {
  name: 'spotify',
  description: 'Spotify — Búsqueda musical con previews de 30 segundos.',
  requiredEnv: ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET'],
  isAvailable() {
    return Boolean(getClientId() && getClientSecret());
  },
  search(query, { limit = 10, page = 1 } = {}) {
    return searchSpotify(query, limit, page);
  },
};