import { searchSpotify } from '../spotify.services.js';

export default {
  name: 'spotify',
  requiredEnv: ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET'],
  search(query, { limit = 10, page = 1 } = {}) {
    return searchSpotify(query, limit, page);
  },
};
