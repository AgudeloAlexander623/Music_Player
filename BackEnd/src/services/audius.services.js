/**
 * SERVICIO DE AUDIUS
 *
 * Cliente para la API REST de Audius, una plataforma de streaming
 * musical descentralizada y gratuita.
 *
 * ENDPOINT: https://api.audius.co/v1/tracks/search
 * DOCS: https://docs.audius.org/developers/api
 *
 * No requiere API key para operaciones de solo lectura.
 */

import axios from 'axios';

class AudiusServiceError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'AudiusServiceError';
    this.statusCode = statusCode;
  }
}

const AUDIUS_BASE = 'https://discoveryprovider.audius.co/v1';
const TIMEOUT = 8000;

/**
 * Obtiene la URL de streaming de un track de Audius.
 * Audius devuelve objetos con múltiples mirrors por redundancia.
 *
 * @param {object} track
 * @returns {string|null}
 */
function getStreamUrl(track) {
  if (track?.stream?.url) return track.stream.url;
  if (Array.isArray(track?.stream?.mirrors) && track.stream.mirrors.length > 0) {
    return track.stream.mirrors[0];
  }
  return null;
}

/**
 * Obtiene la URL de la portada del track.
 *
 * @param {object} track
 * @returns {string|null}
 */
function getArtworkUrl(track) {
  if (!track?.artwork) return null;
  return track.artwork['480x480'] || track.artwork['150x150'] || null;
}

/**
 * Busca tracks en Audius por query de texto.
 *
 * @param {string} query - Término de búsqueda
 * @param {number} [page=1] - Número de página
 * @param {number} [limit=10] - Resultados por página (máx 50)
 * @returns {Promise<Array>} Lista de tracks normalizados
 * @throws {AudiusServiceError}
 */
export async function searchAudius(query, page = 1, limit = 10) {
  try {
    const offset = (page - 1) * limit;
    const searchLimit = Math.min(limit, 50);

    const res = await axios.get(`${AUDIUS_BASE}/tracks/search`, {
      params: { query, limit: searchLimit, offset },
      timeout: TIMEOUT,
    });

    const tracks = res.data?.data;
    if (!Array.isArray(tracks) || tracks.length === 0) {
      return [];
    }

    return tracks.map((t) => ({
      id: t.id,
      name: t.title || 'Unknown',
      artist: t.user?.name || 'Unknown',
      album: t.genre || '',
      albumImage: getArtworkUrl(t),
      previewUrl: getStreamUrl(t),
      source: 'audius',
      duration: t.duration ? parseInt(t.duration, 10) : null,
    }));
  } catch (error) {
    if (error instanceof AudiusServiceError) throw error;

    if (error.response) {
      throw new AudiusServiceError(
        `Audius search failed: ${error.response.status}`,
        error.response.status,
      );
    }

    if (error.code === 'ECONNABORTED') {
      throw new AudiusServiceError('Audius request timeout (8s)', 408);
    }

    throw new AudiusServiceError(`Failed to search Audius: ${error.message}`, 500);
  }
}
