import { searchSpotify } from '../spotify.services.js';

export default {
  name: 'spotify',
  description: 'Spotify — Búsqueda musical con previews de 30 segundos.',
  requiredEnv: ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET'],
  isAvailable() {
    return (
      process.env.SPOTIFY_CLIENT_ID &&
      !process.env.SPOTIFY_CLIENT_ID.startsWith('your_') &&
      process.env.SPOTIFY_CLIENT_SECRET &&
      !process.env.SPOTIFY_CLIENT_SECRET.startsWith('your_')
    );
  },
  search(query, { limit = 10, page = 1 } = {}) {
    return searchSpotify(query, limit, page);
  },
};
