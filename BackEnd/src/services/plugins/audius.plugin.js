/**
 * PLUGIN DE AUDIUS
 *
 * Busca música en Audius, una plataforma descentralizada y gratuita.
 * No requiere API key para búsqueda y streaming.
 *
 * Catálogo: música independiente de todos los géneros.
 * Calidad de audio: 320kbps.
 */

import { searchAudius } from '../audius.services.js';

export default {
  name: 'audius',
  description:
    'Audius — Música descentralizada y gratuita. Sin anuncios, sin API key.',
  requiredEnv: [],
  search(query, { limit = 10, page = 1 } = {}) {
    return searchAudius(query, page, limit);
  },
};
