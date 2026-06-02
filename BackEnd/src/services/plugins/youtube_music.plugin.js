import { searchYouTubeMusic } from '../youtube.services.js';

export default {
  name: 'youtube_music',
  requiredEnv: ['YOUTUBE_API_KEY'],
  search(query, { limit = 10 } = {}) {
    return searchYouTubeMusic(query, limit);
  },
};
