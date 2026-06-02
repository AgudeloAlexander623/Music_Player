import { searchYouTube } from '../youtube.services.js';

export default {
  name: 'youtube',
  requiredEnv: ['YOUTUBE_API_KEY'],
  search(query, { limit = 10 } = {}) {
    return searchYouTube(query, limit);
  },
};
