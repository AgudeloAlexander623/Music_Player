/**
 * PLUGIN DE YOUTUBE MUSIC
 *
 * Plugin de búsqueda para YouTube Music.
 * Se mantiene siempre activo igual que YouTube, compartiendo
 * el mismo mecanismo de fallback a Invidious cuando no hay
 * API key configurada.
 *
 * La diferencia con YouTube es que este plugin agrega " music"
 * al query de búsqueda para obtener resultados más musicales,
 * y marca los resultados con source: 'youtube_music'.
 */

import { searchYouTubeMusic } from '../youtube.services.js';

export default {
  name: 'youtube_music',
  description: 'YouTube Music — Resultados musicales (agrega "music" al query).',
  requiredEnv: [],
  search(query, { limit = 10 } = {}) {
    return searchYouTubeMusic(query, limit);
  },
};
