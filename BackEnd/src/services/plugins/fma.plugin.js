import { searchFMA } from '../fma.services.js';

export default {
  name: 'fma',
  requiredEnv: ['FMA_API_KEY'],
  search(query, { limit = 10, page = 1 } = {}) {
    return searchFMA(query, page, limit);
  },
};
