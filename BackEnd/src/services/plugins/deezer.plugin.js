import { searchDeezer } from '../deezer.services.js';

export default {
  name: 'deezer',
  description: 'Deezer — Catálogo musical con previews de 30 segundos (sin autenticación).',
  requiredEnv: [],
  search(query, { limit = 10 } = {}) {
    return searchDeezer(query, limit);
  },
};
