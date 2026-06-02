import logger from '../utils/logger.js';
import axios from 'axios';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

function formatDuration(durationStr) {
  if (!durationStr) return null;
  const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return null;
  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  const seconds = parseInt(match[3] || 0);
  return hours * 3600 + minutes * 60 + seconds;
}

async function fetchYouTubeVideos(query, limit) {
  if (!YOUTUBE_API_KEY) return [];

  const searchResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
    params: {
      part: 'snippet',
      q: query,
      maxResults: Math.min(limit, 50),
      type: 'video',
      videoCategoryId: '10',
      key: YOUTUBE_API_KEY,
    },
    timeout: 5000,
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
          key: YOUTUBE_API_KEY,
        },
        timeout: 5000,
      });
      detailsResponse.data.items.forEach(v => {
        durationMap[v.id] = v.contentDetails?.duration;
      });
    } catch (error) {
      logger.warn('No se pudieron obtener duraciones de YouTube', { error: error.message });
    }
  }

  return searchResponse.data.items.map(video => {
    const videoId = video.id?.videoId;
    const previewUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : null;
    return {
      id: videoId || video.etag,
      title: video.snippet.title,
      artist: video.snippet.channelTitle,
      album: '',
      thumbnail: video.snippet.thumbnails?.high?.url ||
                video.snippet.thumbnails?.medium?.url ||
                video.snippet.thumbnails?.default?.url ||
                null,
      duration: formatDuration(durationMap[videoId]),
      previewUrl,
      videoId,
      source: 'youtube',
    };
  });
}

export async function searchYouTube(query, limit = 10) {
  try {
    return await fetchYouTubeVideos(query, limit);
  } catch (error) {
    logger.error('Error en búsqueda de YouTube', { error: error.message });
    return [];
  }
}

export async function searchYouTubeMusic(query, limit = 10) {
  try {
    const results = await fetchYouTubeVideos(`${query} music`, limit);
    return results.map(track => ({ ...track, source: 'youtube_music' }));
  } catch (error) {
    logger.error('Error en búsqueda de YouTube Music', { error: error.message });
    return [];
  }
}
