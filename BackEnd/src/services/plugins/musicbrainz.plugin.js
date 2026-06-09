/**
 * PLUGIN DE MUSICBRAINZ
 *
 * MusicBrainz es una base de datos musical colaborativa que ofrece
 * únicamente metadatos (sin previews de audio). Cada petición se
 * rate-limita a 1 solicitud por segundo, lo que puede ralentizar
 * las búsquedas cuando está habilitado.
 *
 * Por defecto este plugin está deshabilitado (requiere la variable
 * MUSICBRAINZ_ENABLED=true). Se recomienda activarlo solo cuando
 * se necesite información discográfica detallada, ya que no aporta
 * resultados reproducibles.
 */

import { searchMusicBrainz } from '../musicbrainz.service.js';

export default {
  name: 'musicbrainz',
  description: 'MusicBrainz — Base de datos musical colaborativa (metadata, sin audio).',
  requiredEnv: ['MUSICBRAINZ_ENABLED'],
  search(query, { limit = 10 } = {}) {
    return searchMusicBrainz(query, limit);
  },
};
