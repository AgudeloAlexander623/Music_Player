import axios from "axios";

const AUDIUS_BASE = "https://discoveryprovider.audius.co/v1";
const TIMEOUT = 8000;

class FMAServiceError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "FMAServiceError";
    this.statusCode = statusCode;
  }
}

/**
 * Función helper para obtener la URL de streaming de un track de Audius.
 * Audius devuelve objetos de stream con múltiples mirrors.
 * @param {Object} track - Track de Audius
 * @returns {string|null} URL de streaming
 */
function getStreamUrl(track) {
  if (track?.stream?.url) return track.stream.url;
  if (
    track?.stream?.mirrors &&
    Array.isArray(track.stream.mirrors) &&
    track.stream.mirrors.length > 0
  ) {
    return track.stream.mirrors[0];
  }
  return null;
}

/**
 * Función helper para obtener la URL de la portada del track.
 * @param {Object} track - Track de Audius
 * @returns {string|null} URL de la imagen de portada
 */
function getArtworkUrl(track) {
  if (!track?.artwork) return null;
  return track.artwork["480x480"] || track.artwork["150x150"] || null;
}

export async function searchFMA(query, page = 1, limit = 10) {
  try {
    const offset = (page - 1) * limit;

    const res = await axios.get(`${AUDIUS_BASE}/tracks/search`, {
      params: {
        query,
        limit,
        offset,
      },
      timeout: TIMEOUT,
    });

    const tracks = res.data?.data;
    if (!Array.isArray(tracks) || tracks.length === 0) {
      return [];
    }

    return tracks.map((t) => ({
      id: t.id,
      name: t.title || "Unknown",
      artist: t.user?.name || "Unknown",
      album: t.genre || "",
      albumImage: getArtworkUrl(t),
      previewUrl: getStreamUrl(t),
      source: "fma",
      duration: t.duration ? parseInt(t.duration, 10) : null,
      license: t.license || null,
    }));
  } catch (error) {
    if (error instanceof FMAServiceError) {
      throw error;
    }
    if (error.response) {
      throw new FMAServiceError(
        `FMA/Audius search failed: ${error.response.status} ${error.response.statusText}`,
        error.response.status
      );
    }
    if (error.code === "ECONNABORTED") {
      throw new FMAServiceError(
        "FMA/Audius request timeout (8s). Service may be unavailable.",
        408
      );
    }
    throw new FMAServiceError(
      `Failed to search FMA/Audius: ${error.message}`,
      500
    );
  }
}
