import { searchFMA } from '../fma.services.js';

export default {
  name: 'fma',
  description: 'Free Music Archive — Música libre de derechos con licencias CC.',
  requiredEnv: ['FMA_API_KEY'],
  isAvailable() {
    return (
      process.env.FMA_API_KEY &&
      !process.env.FMA_API_KEY.startsWith('your_')
    );
  },
  search(query, { limit = 10, page = 1 } = {}) {
    return searchFMA(query, page, limit);
  },
};
