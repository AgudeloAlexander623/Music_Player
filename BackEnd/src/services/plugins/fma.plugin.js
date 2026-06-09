import { searchFMA } from '../fma.services.js';

export default {
  name: 'fma',
  description:
    'Free Music Archive — Música libre de derechos con licencias CC (respaldado por Audius).',
  requiredEnv: [],
  search(query, { limit = 10, page = 1 } = {}) {
    return searchFMA(query, page, limit);
  },
};
