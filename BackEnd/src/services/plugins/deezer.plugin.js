import { searchDeezer } from '../deezer.services.js';

export default {
  name: 'deezer',
  requiredEnv: [],
  search(query, { limit = 10 } = {}) {
    return searchDeezer(query, limit);
  },
};
