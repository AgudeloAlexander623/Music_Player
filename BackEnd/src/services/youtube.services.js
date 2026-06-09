/**
 * SERVICIO DE YOUTUBE Y YOUTUBE MUSIC
 *
 * Este módulo centraliza toda la comunicación con YouTube.
 * Implementa una estrategia de dos niveles para garantizar
 * que los plugins de YouTube y YouTube Music estén siempre
 * disponibles, incluso sin una API Key de Google.
 *
 * ESTRATEGIA DE BÚSQUEDA:
 * 1. YouTube Data API v3 — si hay YOUTUBE_API_KEY configurada
 *    y no es un placeholder, se intenta usar primero.
 * 2. Invidious API — fallback automático cuando no hay API key
 *    o cuando la API key falla. Usa una lista rotativa de
 *    instancias públicas de Invidious.
 *
 * DIAGNÓSTICO EN CONSOLA:
 * - Cada intento de búsqueda se registra con su estrategia
 * - Los errores HTTP se capturan con código y mensaje
 * - El estado de salud del servicio se puede consultar
 *   mediante getYouTubeServiceStatus()
 */

import logger from '../utils/logger.js';
import axios from 'axios';

const YOUTUBE_SEARCH_TIMEOUT = 5000;
const YOUTUBE_DETAILS_TIMEOUT = 5000;
const INVIDIOUS_TIMEOUT = 6000;

const INVIDIOUS_INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.snopyta.org',
  'https://yewtu.be',
  'https://inv.riverside.rocks',
  'https://invidious.jing.rocks',
  'https://invidious.xyz',
];

let lastApiCallTime = 0;
let invidiousInstanceIndex = 0;
let consecutiveInvidiousFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 3;

let diagnosticState = {
  youtubeApiAvailable: null,
  invidiousAvailable: null,
  lastYoutubeError: null,
  lastInvidiousError: null,
  totalSearches: 0,
  searchesByStrategy: { youtube_api: 0, invidious: 0, none: 0 },
};

export function _resetForTest() {
  lastApiCallTime = 0;
  invidiousInstanceIndex = 0;
  consecutiveInvidiousFailures = 0;
  diagnosticState = {
    youtubeApiAvailable: null,
    invidiousAvailable: null,
    lastYoutubeError: null,
    lastInvidiousError: null,
    totalSearches: 0,
    searchesByStrategy: { youtube_api: 0, invidious: 0, none: 0 },
  };
}

function getApiKey() {
  return process.env.YOUTUBE_API_KEY;
}

function hasValidApiKey() {
  const key = getApiKey();
  if (!key) return false;
  if (key === 'your_youtube_api_key_here') return false;
  if (key === 'your_youtube_api_key') return false;
  if (key.startsWith('your_')) return false;
  return true;
}

function formatDuration(durationStr) {
  if (!durationStr) return null;
  const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return null;
  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  const seconds = parseInt(match[3] || 0);
  return hours * 3600 + minutes * 60 + seconds;
}

let fallbackIdCounter = 0;

function normalizeVideo(video, videoId, source) {
  const previewUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : null;
  const id = videoId || `inv_fallback_${++fallbackIdCounter}`;
  return {
    id,
    title: video.title || 'Unknown',
    artist: video.author || video.channelTitle || 'Unknown',
    album: '',
    thumbnail: video.thumbnail
      || video.snippet?.thumbnails?.high?.url
      || video.snippet?.thumbnails?.medium?.url
      || video.snippet?.thumbnails?.default?.url
      || null,
    duration: video.lengthSeconds
      ? parseInt(video.lengthSeconds)
      : formatDuration(video.contentDetails?.duration),
    previewUrl,
    videoId,
    source,
  };
}

function rateLimit() {
  const now = Date.now();
  const elapsed = now - lastApiCallTime;
  const minInterval = 200;
  if (elapsed < minInterval) {
    return new Promise(resolve => setTimeout(resolve, minInterval - elapsed));
  }
  return Promise.resolve();
}

async function searchYouTubeAPI(query, limit) {
  const apiKey = getApiKey();
  const searchLimit = Math.min(limit, 50);

  const searchResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
    params: {
      part: 'snippet',
      q: query,
      maxResults: searchLimit,
      type: 'video',
      videoCategoryId: '10',
      key: apiKey,
    },
    timeout: YOUTUBE_SEARCH_TIMEOUT,
  });

  if (!searchResponse.data.items?.length) return [];

  const videoIds = searchResponse.data.items.map(v => v.id?.videoId).filter(Boolean);

  let durationMap = {};
  if (videoIds.length > 0) {
    try {
      const detailsResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
        params: {
          part: 'contentDetails',
          id: videoIds.join(','),
          key: apiKey,
        },
        timeout: YOUTUBE_DETAILS_TIMEOUT,
      });
      detailsResponse.data.items.forEach(v => {
        durationMap[v.id] = v.contentDetails?.duration;
      });
    } catch (error) {
      logger.warn('[YouTube Service] No se pudieron obtener duraciones', { error: error.message });
    }
  }

  return searchResponse.data.items.map(video => {
    const videoId = video.id?.videoId;
    const duration = formatDuration(durationMap[videoId]);
    const previewUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : null;

    return {
      id: videoId || video.etag,
      title: video.snippet.title,
      artist: video.snippet.channelTitle,
      album: '',
      thumbnail: video.snippet.thumbnails?.high?.url
        || video.snippet.thumbnails?.medium?.url
        || video.snippet.thumbnails?.default?.url
        || null,
      duration,
      previewUrl,
      videoId,
      source: 'youtube',
    };
  });
}

async function searchInvidious(query, limit) {
  const searchLimit = Math.min(limit, 20);

  for (let attempt = 0; attempt < INVIDIOUS_INSTANCES.length; attempt++) {
    const instanceIndex = invidiousInstanceIndex % INVIDIOUS_INSTANCES.length;
    const instance = INVIDIOUS_INSTANCES[instanceIndex];

    invidiousInstanceIndex++;

    try {
      logger.info(`[YouTube Service] Intentando Invidious: ${instance}`);

      const response = await axios.get(`${instance}/api/v1/search`, {
        params: {
          q: query,
          page: 1,
          type: 'video',
          sort_by: 'relevance',
          limit: searchLimit,
        },
        timeout: INVIDIOUS_TIMEOUT,
        headers: {
          'Accept': 'application/json',
        },
      });

      const items = response.data;
      if (!Array.isArray(items) || items.length === 0) {
        logger.warn(`[YouTube Service] Invidious ${instance} retornó 0 resultados`);
        continue;
      }

      consecutiveInvidiousFailures = 0;
      diagnosticState.invidiousAvailable = true;
      diagnosticState.lastInvidiousError = null;
      logger.info(`[YouTube Service] Invidious OK: ${instance} (${items.length} resultados)`);

      return items.map(video => normalizeVideo(video, video.videoId, 'youtube'));
    } catch (error) {
      consecutiveInvidiousFailures++;
      const errMsg = error?.response?.status
        ? `HTTP ${error.response.status} ${error.response.statusText}`
        : error.code === 'ECONNABORTED'
          ? 'Timeout'
          : error.message;
      logger.warn(`[YouTube Service] Invidious ${instance} falló: ${errMsg}`);
      diagnosticState.lastInvidiousError = `${instance}: ${errMsg}`;
    }
  }

  diagnosticState.invidiousAvailable = false;
  logger.error('[YouTube Service] Todas las instancias de Invidious fallaron');
  return [];
}

async function fetchYouTubeVideos(query, limit) {
  diagnosticState.totalSearches++;

  if (hasValidApiKey()) {
    logger.info(`[YouTube Service] Usando YouTube Data API v3: "${query}"`);
    diagnosticState.searchesByStrategy.youtube_api++;
    try {
      await rateLimit();
      const results = await searchYouTubeAPI(query, limit);
      diagnosticState.youtubeApiAvailable = true;
      diagnosticState.lastYoutubeError = null;
      logger.info(`[YouTube Service] YouTube API retornó ${results.length} resultados`);
      return results;
    } catch (error) {
      const status = error?.response?.status;
      const errMsg = status
        ? `HTTP ${status} ${error.response.statusText}`
        : error.code === 'ECONNABORTED'
          ? 'Timeout'
          : error.message;

      logger.error(`[YouTube Service] YouTube API falló: ${errMsg}`);

      diagnosticState.lastYoutubeError = errMsg;

      if (status === 403 || status === 400) {
        logger.warn('[YouTube Service] La API Key puede ser inválida o cuota agotada. Cambiando a Invidious.');
        diagnosticState.youtubeApiAvailable = false;
      } else {
        logger.warn('[YouTube Service] Error transitorio en YouTube API. Cambiando a Invidious.');
        diagnosticState.youtubeApiAvailable = null;
      }
    }
  } else {
    logger.info('[YouTube Service] No hay YOUTUBE_API_KEY configurada. Usando Invidious como fallback.');
    diagnosticState.youtubeApiAvailable = false;
    diagnosticState.lastYoutubeError = 'YOUTUBE_API_KEY no configurada';
  }

  diagnosticState.searchesByStrategy.invidious++;
  return await searchInvidious(query, limit);
}

export async function searchYouTube(query, limit = 10) {
  try {
    return await fetchYouTubeVideos(query, limit);
  } catch (error) {
    logger.error('[YouTube Service] Error fatal en búsqueda', { error: error.message });
    return [];
  }
}

export async function searchYouTubeMusic(query, limit = 10) {
  try {
    const results = await fetchYouTubeVideos(`${query} music`, limit);
    return results.map(track => ({ ...track, source: 'youtube_music' }));
  } catch (error) {
    logger.error('[YouTube Service] Error fatal en búsqueda YouTube Music', { error: error.message });
    return [];
  }
}

export function getYouTubeServiceStatus() {
  const activeKey = hasValidApiKey();
  return {
    youtubeApiConfigured: activeKey,
    youtubeApiAvailable: diagnosticState.youtubeApiAvailable,
    invidiousAvailable: diagnosticState.invidiousAvailable,
    lastYoutubeError: diagnosticState.lastYoutubeError,
    lastInvidiousError: diagnosticState.lastInvidiousError,
    totalSearches: diagnosticState.totalSearches,
    searchesByStrategy: { ...diagnosticState.searchesByStrategy },
    activeStrategy: activeKey && diagnosticState.youtubeApiAvailable !== false
      ? 'youtube_api'
      : diagnosticState.invidiousAvailable
        ? 'invidious'
        : 'none',
    invidiousInstancesAvailable: INVIDIOUS_INSTANCES.length,
    recommendedAction: !activeKey
      ? 'Configura YOUTUBE_API_KEY en .env para mejor rendimiento y confiabilidad'
      : diagnosticState.youtubeApiAvailable === false
        ? 'La API Key configurada falló. Verifica que sea válida y que la cuota no esté agotada.'
        : null,
  };
}
