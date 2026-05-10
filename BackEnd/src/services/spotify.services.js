/**
 * SERVICIO DE SPOTIFY - INTEGRACIÓN CON SPOTIFY WEB API
 *
 * Este módulo maneja toda la comunicación con la API de Spotify:
 * - Autenticación automática con Client Credentials Flow
 * - Gestión inteligente de tokens (renovación automática)
 * - Búsqueda de tracks con metadata completa
 * - Manejo robusto de errores y timeouts
 *
 * FLUJO DE AUTENTICACIÓN:
 * 1. Verificar si hay token válido
 * 2. Si no hay o expiró, obtener nuevo token
 * 3. Usar token para hacer requests a la API
 *
 * LIMITACIONES DE SPOTIFY:
 * - Client Credentials NO permite acceso a datos de usuario
 * - Solo permite búsqueda pública y reproducción de previews (30s)
 * - Rate limit: ~1000 requests/hora por defecto
 */

import axios from "axios";

// Variables globales para cache del token
// El token dura 1 hora, se renueva automáticamente
let accessToken = null;
let expiresAt = 0;

/**
 * CLASE DE ERROR PERSONALIZADA PARA SPOTIFY
 *
 * Permite identificar errores específicos de Spotify
 * y enviar códigos HTTP apropiados al cliente
 */
class SpotifyServiceError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "SpotifyServiceError";
    this.statusCode = statusCode;
  }
}

/**
 * OBTENER TOKEN DE ACCESO DE SPOTIFY
 *
 * Usa Client Credentials Flow para obtener token temporal
 * - No requiere usuario específico
 * - Token dura 1 hora (3600 segundos)
 * - Se almacena en memoria para reutilización
 */
async function getToken() {
  try {
    // VALIDACIÓN CRÍTICA: Credenciales requeridas
    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
      throw new SpotifyServiceError(
        "Spotify credentials (SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET) are missing from .env",
        400
      );
    }

    // Request de autenticación a Spotify
    const res = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({ grant_type: "client_credentials" }),
      {
        headers: {
          // Autenticación Basic con credenciales en Base64
          Authorization:
            "Basic " +
            Buffer.from(
              `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
            ).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: 5000, // Timeout de 5 segundos
      }
    );

    // Guardar token y tiempo de expiración
    accessToken = res.data.access_token;
    expiresAt = Date.now() + res.data.expires_in * 1000;
  } catch (error) {
    if (error instanceof SpotifyServiceError) {
      throw error;
    }
    if (error.response) {
      throw new SpotifyServiceError(
        `Spotify authentication failed: ${error.response.status} ${error.response.statusText}`,
        error.response.status
      );
    }
    if (error.code === "ECONNABORTED") {
      throw new SpotifyServiceError(
        "Spotify token request timeout (5s). Service may be unavailable.",
        408
      );
    }
    throw new SpotifyServiceError(
      `Failed to obtain Spotify token: ${error.message}`,
      500
    );
  }
}

/**
 * VERIFICAR SI EL TOKEN HA EXPIRADO
 *
 * Los tokens de Spotify duran 1 hora (3600s)
 * Esta función verifica si necesitamos renovar
 */
function isTokenExpired() {
  return !accessToken || Date.now() >= expiresAt;
}

/**
 * ASEGURAR QUE TENEMOS UN TOKEN VÁLIDO
 *
 * Función helper que renueva el token si es necesario
 * Se llama automáticamente antes de cada request
 */
async function ensureToken() {
  if (isTokenExpired()) {
    await getToken();
  }
}

/**
 * BUSCAR CANCIONES EN SPOTIFY
 *
 * Función principal de búsqueda que:
 * - Asegura token válido
 * - Hace request a Spotify Search API
 * - Transforma respuesta al formato estándar del proyecto
 * - Maneja errores gracefully
 *
 * @param {string} query - Término de búsqueda (artista, canción, álbum)
 * @returns {Array} Array de tracks normalizados
 */
export async function searchSpotify(query) {
  try {
    // Asegurar token válido antes de buscar
    await ensureToken();

    // Request a Spotify Search API
    const res = await axios.get(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        timeout: 8000, // Timeout más largo para búsquedas
      }
    );

    // Validar respuesta
    if (!res.data.tracks || !res.data.tracks.items) {
      return [];
    }

    // Transformar datos de Spotify a formato estándar
    // Esto permite combinar resultados de múltiples APIs
    return res.data.tracks.items.map((track) => ({
      id: track.id,
      name: track.name,
      artist: track.artists[0]?.name ?? "",
      album: track.album?.name ?? "",
      albumImage: track.album?.images[0]?.url ?? "",
      previewUrl: track.preview_url,
      source: "spotify",
    }));
  } catch (error) {
    if (error instanceof SpotifyServiceError) {
      throw error;
    }
    if (error.response) {
      throw new SpotifyServiceError(
        `Spotify search failed: ${error.response.status} ${error.response.statusText}`,
        error.response.status
      );
    }
    if (error.code === "ECONNABORTED") {
      throw new SpotifyServiceError(
        "Spotify search request timeout (8s). Service may be slow.",
        408
      );
    }
    throw new SpotifyServiceError(
      `Failed to search Spotify: ${error.message}`,
      500
    );
  }
}