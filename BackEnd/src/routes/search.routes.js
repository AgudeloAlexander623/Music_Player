import express from 'express';
import { searchMusicBrainz } from '../services/musicbrainz.service.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({ error: 'Missing query parameter: q' });
    }

    const results = await searchMusicBrainz(query);
    res.json({ tracks: results });
  } catch (error) {
    console.error('[Search Error]', error.message);
    res.status(500).json({ error: 'Search failed', details: error.message });
  }
});

export default router;
