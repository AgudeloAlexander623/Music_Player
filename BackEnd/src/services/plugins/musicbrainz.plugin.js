import { searchMusicBrainz } from '../musicbrainz.service.js';

export default {
  name: 'musicbrainz',
  requiredEnv: [],
  search(query, { limit = 10 } = {}) {
    return searchMusicBrainz(query, limit);
  },
};
