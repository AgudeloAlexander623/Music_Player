/**
 * PLUGIN DE YOUTUBE
 *
 * Plugin de búsqueda para YouTube.
 * Se mantiene siempre activo independientemente de la configuración
 * de YOUTUBE_API_KEY, ya que el servicio implementa un fallback
 * automático a Invidious cuando no hay API key disponible.
 *
 * Para deshabilitar este plugin, el usuario debe hacerlo desde
 * la configuración de la aplicación (futura funcionalidad).
 */

import { searchYouTube } from '../youtube.services.js';

export default {
  name: 'youtube',
  description: 'YouTube — Búsqueda de videos musicales con fallback a Invidious.',
  requiredEnv: [],
  search(query, { limit = 10 } = {}) {
    return searchYouTube(query, limit);
  },
};
