import logger from '../utils/logger.js';
import axios from 'axios';

const YOUTUBE_SEARCH_TIMEOUT = 5000;
const YOUTUBE_DETAILS_TIMEOUT = 5000;
const SCRAPE_TIMEOUT = 10000;
const INVIDIOUS_TIMEOUT = 8000;

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
];

const INVIDIOUS_INSTANCES = [
  'https://inv.nadeko.net',
  'https://yewtu.be',
  'https://invidious.snopyta.org',
  'https://vid.puffyan.us',
];

let lastApiCallTime = 0;

let diagnosticState = {
  youtubeApiAvailable: null,
  scrapeAvailable: null,
  invidiousAvailable: null,
  lastYoutubeError: null,
  lastScrapeError: null,
  lastInvidiousError: null,
  totalSearches: 0,
  searchesByStrategy: { youtube_api: 0, scrape: 0, invidious: 0, none: 0 },
};

export function _resetForTest() {
  lastApiCallTime = 0;
  diagnosticState = {
    youtubeApiAvailable: null,
    scrapeAvailable: null,
    invidiousAvailable: null,
    lastYoutubeError: null,
    lastScrapeError: null,
    lastInvidiousError: null,
    totalSearches: 0,
    searchesByStrategy: { youtube_api: 0, scrape: 0, invidious: 0, none: 0 },
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

function _getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
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

function parseHHMMSS(str) {
  if (!str) return null;
  const parts = str.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return null;
}

function normalizeVideo(video, videoId, source) {
  const previewUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : null;
  return {
    id: videoId || `fb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
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
      : video.duration
        ? (typeof video.duration === 'number' ? video.duration : parseHHMMSS(video.duration))
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

/**
 * Busca recursivamente objetos videoRenderer dentro de una estructura JSON
 * sin importar en qué parte del árbol se encuentren. Esto hace el parsing
 * resistente a cambios en la estructura de ytInitialData.
 */
function _findVideoRenderers(obj, maxResults) {
  const results = [];

  function walk(node) {
    if (results.length >= maxResults) return;
    if (!node || typeof node !== 'object') return;

    if (node.videoRenderer && node.videoRenderer.videoId) {
      results.push(node.videoRenderer);
      return;
    }

    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          walk(item);
          if (results.length >= maxResults) return;
        }
      } else {
        walk(value);
        if (results.length >= maxResults) return;
      }
    }
  }

  walk(obj);
  return results;
}

function _extractVideoRenderers(html, limit) {
  const match = html.match(/ytInitialData\s*=\s*({.*?});/s);
  if (!match) {
    logger.warn('[YouTube Service] No se encontró ytInitialData en la página');
    return [];
  }

  let data;
  try {
    data = JSON.parse(match[1]);
  } catch {
    logger.warn('[YouTube Service] Error al parsear ytInitialData');
    return [];
  }

  const renderers = _findVideoRenderers(data, limit);

  if (renderers.length === 0) {
    logger.warn('[YouTube Service] No se encontraron videoRenderers en ytInitialData');
    return [];
  }

  return renderers.map((vr) => {
    const titleRuns = vr.title?.runs;
    const title = titleRuns
      ? titleRuns.map((r) => r.text).join('')
      : vr.title?.simpleText || '';

    const ownerRuns = vr.ownerText?.runs;
    const channel = ownerRuns?.[0]?.text || '';

    const lengthText = vr.lengthText?.simpleText || '';

    const thumbs = vr.thumbnail?.thumbnails ?? [];
    const thumbnail = thumbs.length > 0 ? thumbs[thumbs.length - 1].url : '';

    return {
      videoId: vr.videoId,
      title,
      author: channel,
      duration: lengthText,
      thumbnail,
    };
  });
}

/**
 * Intenta extraer información básica de videos desde el HTML sin depender
 * de ytInitialData. Busca patrones como enlaces a /watch, títulos y duraciones
 * directamente en el HTML crudo. Es menos preciso que ytInitialData pero sirve
 * como respaldo cuando YouTube cambia la estructura del JSON embebido.
 */
function _extractFromHtml(html) {
  const videos = [];
  const seenVideoIds = new Set();

  const videoIdRegex = /\/watch\?v=([a-zA-Z0-9_-]{11})/g;
  let match;

  while ((match = videoIdRegex.exec(html)) !== null) {
    const videoId = match[1];
    if (seenVideoIds.has(videoId)) continue;
    seenVideoIds.add(videoId);

    const contextStart = Math.max(0, match.index - 300);
    const contextEnd = Math.min(html.length, match.index + 300);
    const context = html.slice(contextStart, contextEnd);

    const titleMatch = context.match(/title="([^"]*?)"/);
    const title = titleMatch ? titleMatch[1] : 'Unknown';

    const durationRegex = /(\d+):(\d{2})(?::(\d{2}))?/;
    const durationMatch = context.match(durationRegex);
    const duration = durationMatch
      ? durationMatch[3]
        ? parseInt(durationMatch[1]) * 3600 + parseInt(durationMatch[2]) * 60 + parseInt(durationMatch[3])
        : parseInt(durationMatch[1]) * 60 + parseInt(durationMatch[2])
      : '';

    const channelMatch = context.match(/by\s+([^"<]{2,40}?)(?:\s*<\/|\s*-)/);
    const channel = channelMatch ? channelMatch[1].trim() : 'Unknown';

    videos.push({
      videoId,
      title: title.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'"),
      author: channel,
      duration,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    });

    if (videos.length >= 10) break;
  }

  return videos;
}

/**
 * Busca en instancias de Invidious (frontend alternativo de YouTube que
 * expone una API pública). Se usa como último recurso cuando el scraping
 * directo falla.
 */
async function _searchInvidious(query, limit) {
  const searchLimit = Math.min(limit, 15);

  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const response = await axios.get(`${instance}/api/v1/search`, {
        params: { q: query, type: 'video' },
        timeout: INVIDIOUS_TIMEOUT,
        headers: { 'User-Agent': _getRandomUserAgent() },
      });

      if (!Array.isArray(response.data) || response.data.length === 0) continue;

      const videos = response.data
        .filter((v) => v.type === 'video' && v.videoId)
        .slice(0, searchLimit)
        .map((v) => {
          const duration = typeof v.lengthSeconds === 'number'
            ? v.lengthSeconds
            : parseHHMMSS(v.lengthSeconds || '');

          return {
            videoId: v.videoId,
            title: v.title || 'Unknown',
            author: v.author || 'Unknown',
            duration,
            thumbnail: v.videoThumbnails?.[0]?.url
              || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
          };
        });

      if (videos.length > 0) {
        logger.info(`[YouTube Service] Invidious (${instance}) exitoso: ${videos.length} resultados`);
        diagnosticState.invidiousAvailable = true;
        diagnosticState.lastInvidiousError = null;
        return videos.map((v) => normalizeVideo(v, v.videoId, 'youtube'));
      }
    } catch (error) {
      const errMsg = error.code === 'ECONNABORTED' ? 'Timeout' : error.message;
      logger.warn(`[YouTube Service] Invidious (${instance}) falló: ${errMsg}`);
      diagnosticState.lastInvidiousError = errMsg;
      continue;
    }
  }

  diagnosticState.invidiousAvailable = false;
  return [];
}

async function searchYouTubeScrape(query, limit) {
  const searchLimit = Math.min(limit, 20);

  try {
    logger.info(`[YouTube Service] Scrapeando YouTube directamente: "${query}"`);

    const response = await axios.get('https://www.youtube.com/results', {
      params: { search_query: query },
      timeout: SCRAPE_TIMEOUT,
      headers: {
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': _getRandomUserAgent(),
      },
    });

    const html = response.data;

    /* ── Estrategia 1: ytInitialData con búsqueda recursiva ── */
    const videosFromData = _extractVideoRenderers(html, searchLimit);
    if (videosFromData.length > 0) {
      logger.info(`[YouTube Service] Scrapeo ytInitialData exitoso: ${videosFromData.length} resultados`);
      diagnosticState.scrapeAvailable = true;
      diagnosticState.lastScrapeError = null;
      return videosFromData.map((v) => normalizeVideo(v, v.videoId, 'youtube'));
    }

    /* ── Estrategia 2: Extracción por expresiones regulares del HTML ── */
    logger.warn('[YouTube Service] ytInitialData sin resultados, intentando extracción por regex');
    const videosFromHtml = _extractFromHtml(html);
    if (videosFromHtml.length > 0) {
      logger.info(`[YouTube Service] Extracción por regex exitosa: ${videosFromHtml.length} resultados`);
      diagnosticState.scrapeAvailable = true;
      diagnosticState.lastScrapeError = null;
      return videosFromHtml.map((v) => normalizeVideo(v, v.videoId, 'youtube'));
    }

    /* ── Estrategia 3: Invidious como último recurso ── */
    logger.warn('[YouTube Service] Scraping directo sin resultados, intentando Invidious');
    diagnosticState.scrapeAvailable = false;
    diagnosticState.lastScrapeError = 'ytInitialData no encontrado o vacío';
    return await _searchInvidious(query, limit);
  } catch (error) {
    const errMsg = error?.response?.status
      ? `HTTP ${error.response.status} ${error.response.statusText}`
      : error.code === 'ECONNABORTED'
        ? 'Timeout'
        : error.message;

    logger.warn(`[YouTube Service] Scrapeo directo falló: ${errMsg}`);
    diagnosticState.lastScrapeError = errMsg;

    /* ── Fallback: si el error fue de red o HTTP, intentar Invidious ── */
    return await _searchInvidious(query, limit);
  }
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
        logger.warn('[YouTube Service] API Key inválida o cuota agotada. Cambiando a scrapeo directo.');
        diagnosticState.youtubeApiAvailable = false;
      } else {
        logger.warn('[YouTube Service] Error transitorio. Cambiando a scrapeo directo.');
        diagnosticState.youtubeApiAvailable = null;
      }
    }
  } else {
    logger.info('[YouTube Service] Sin API key. Usando scrapeo directo de YouTube.');
    diagnosticState.youtubeApiAvailable = false;
    diagnosticState.lastYoutubeError = 'YOUTUBE_API_KEY no configurada';
  }

  diagnosticState.searchesByStrategy.scrape++;
  return await searchYouTubeScrape(query, limit);
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

  let activeStrategy = 'none';
  if (activeKey && diagnosticState.youtubeApiAvailable !== false) {
    activeStrategy = 'youtube_api';
  } else if (diagnosticState.scrapeAvailable) {
    activeStrategy = 'scrape';
  } else if (diagnosticState.invidiousAvailable) {
    activeStrategy = 'invidious';
  }

  return {
    youtubeApiConfigured: activeKey,
    youtubeApiAvailable: diagnosticState.youtubeApiAvailable,
    scrapeAvailable: diagnosticState.scrapeAvailable,
    invidiousAvailable: diagnosticState.invidiousAvailable,
    lastYoutubeError: diagnosticState.lastYoutubeError,
    lastScrapeError: diagnosticState.lastScrapeError,
    lastInvidiousError: diagnosticState.lastInvidiousError,
    totalSearches: diagnosticState.totalSearches,
    searchesByStrategy: { ...diagnosticState.searchesByStrategy },
    activeStrategy,
    recommendedAction: !activeKey
      ? 'Configura YOUTUBE_API_KEY en .env para mejor rendimiento (opcional, el scrapeo funciona sin ella con fallback a Invidious)'
      : diagnosticState.youtubeApiAvailable === false
        ? 'La API Key configurada falló. Verifica que sea válida y que la cuota no esté agotada.'
        : null,
  };
}
