import logger from '../utils/logger.js';
import axios from 'axios';

const YOUTUBE_SEARCH_TIMEOUT = 5000;
const YOUTUBE_DETAILS_TIMEOUT = 5000;
const SCRAPE_TIMEOUT = 8000;

let lastApiCallTime = 0;

let diagnosticState = {
  youtubeApiAvailable: null,
  scrapeAvailable: null,
  lastYoutubeError: null,
  lastScrapeError: null,
  totalSearches: 0,
  searchesByStrategy: { youtube_api: 0, scrape: 0, none: 0 },
};

export function _resetForTest() {
  lastApiCallTime = 0;
  diagnosticState = {
    youtubeApiAvailable: null,
    scrapeAvailable: null,
    lastYoutubeError: null,
    lastScrapeError: null,
    totalSearches: 0,
    searchesByStrategy: { youtube_api: 0, scrape: 0, none: 0 },
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

async function searchYouTubeScrape(query, limit) {
  const searchLimit = Math.min(limit, 20);

  try {
    logger.info(`[YouTube Service] Scrapeando YouTube directamente: "${query}"`);

    const response = await axios.get('https://www.youtube.com/results', {
      params: { search_query: query },
      timeout: SCRAPE_TIMEOUT,
      headers: {
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    const html = response.data;

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

    const contents =
      data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
        ?.sectionListRenderer?.contents ?? [];

    const videos = [];

    for (const section of contents) {
      const items = section?.itemSectionRenderer?.contents ?? [];
      for (const item of items) {
        if (videos.length >= searchLimit) break;

        const vr = item?.videoRenderer;
        if (!vr || !vr.videoId) continue;

        const titleRuns = vr.title?.runs;
        const title = titleRuns
          ? titleRuns.map(r => r.text).join('')
          : vr.title?.simpleText || '';

        const ownerRuns = vr.ownerText?.runs;
        const channel = ownerRuns?.[0]?.text || '';

        const lengthText = vr.lengthText?.simpleText || '';

        const thumbs = vr.thumbnail?.thumbnails ?? [];
        const thumbnail = thumbs.length > 0 ? thumbs[thumbs.length - 1].url : '';

        videos.push({
          videoId: vr.videoId,
          title,
          author: channel,
          duration: lengthText,
          thumbnail,
        });
      }
      if (videos.length >= searchLimit) break;
    }

    if (videos.length === 0) {
      logger.warn('[YouTube Service] No se encontraron videos en el scrapeo');
      return [];
    }

    logger.info(`[YouTube Service] Scrapeo exitoso: ${videos.length} resultados`);
    diagnosticState.scrapeAvailable = true;
    diagnosticState.lastScrapeError = null;

    return videos.map(v => normalizeVideo(v, v.videoId, 'youtube'));
  } catch (error) {
    const errMsg = error?.response?.status
      ? `HTTP ${error.response.status} ${error.response.statusText}`
      : error.code === 'ECONNABORTED'
        ? 'Timeout'
        : error.message;

    logger.warn(`[YouTube Service] Scrapeo directo falló: ${errMsg}`);
    diagnosticState.lastScrapeError = errMsg;
    return [];
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
  return {
    youtubeApiConfigured: activeKey,
    youtubeApiAvailable: diagnosticState.youtubeApiAvailable,
    scrapeAvailable: diagnosticState.scrapeAvailable,
    lastYoutubeError: diagnosticState.lastYoutubeError,
    lastScrapeError: diagnosticState.lastScrapeError,
    totalSearches: diagnosticState.totalSearches,
    searchesByStrategy: { ...diagnosticState.searchesByStrategy },
    activeStrategy: activeKey && diagnosticState.youtubeApiAvailable !== false
      ? 'youtube_api'
      : diagnosticState.scrapeAvailable
        ? 'scrape'
        : 'none',
    recommendedAction: !activeKey
      ? 'Configura YOUTUBE_API_KEY en .env para mejor rendimiento (opcional, el scrapeo directo funciona sin ella)'
      : diagnosticState.youtubeApiAvailable === false
        ? 'La API Key configurada falló. Verifica que sea válida y que la cuota no esté agotada.'
        : null,
  };
}
