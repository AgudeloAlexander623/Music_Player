/**
 * PLUGIN DE MUSICBRAINZ
 *
 * MusicBrainz es una base de datos musical colaborativa que ofrece
 * únicamente metadatos (sin previews de audio). Cada petición se
 * rate-limita a 1 solicitud por segundo para cumplir con las
 * políticas de uso de la API.
 *
 * Como MusicBrainz solo aporta metadatos (fechas de lanzamiento,
 * discografía detallada, etc.) y no resultados reproducibles,
 * puede ralentizar ligeramente las búsquedas en ~1.1 segundos
 * debido al rate limit, pero se ejecuta en paralelo con los
 * demás plugins gracias a Promise.all en el registro.
 *
 * Este plugin está activo por defecto desde la versión 1.0.0-beta.
 * Si no se desea usar, se puede desactivar desde la interfaz
 * de plugins en /api/plugins.
 */

import { searchMusicBrainz } from '../musicbrainz.service.js';

export default {
  name: 'musicbrainz',
  description: 'MusicBrainz — Base de datos musical colaborativa (metadata, sin audio). Activo por defecto.',
  requiredEnv: [],
  search(query, { limit = 10 } = {}) {
    return searchMusicBrainz(query, limit);
  },
};
