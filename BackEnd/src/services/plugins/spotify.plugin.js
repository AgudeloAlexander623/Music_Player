/**
 * PLUGIN DE SPOTIFY (DESHABILITADO)
 *
 * Spotify queda deshabilitado por falta de credenciales válidas.
 * El código fuente se conserva intacto para una futura reactivación.
 * Para volver a habilitarlo:
 *   1. Obtener SPOTIFY_CLIENT_ID y SPOTIFY_CLIENT_SECRET desde
 *      https://developer.spotify.com/dashboard
 *   2. Configurarlos en .env o mediante la UI de configuración
 *   3. Cambiar isAvailable() para que retorne true cuando haya credenciales
 */

export default {
  name: 'spotify',
  description: 'Spotify — Búsqueda musical con previews de 30 segundos.',
  requiredEnv: ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET'],
  isAvailable() {
    return false;
  },
  search(query, { limit = 10, page = 1 } = {}) {
    return Promise.resolve([]);
  },
};