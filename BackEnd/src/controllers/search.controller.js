import { searchSpotify } from '../services/spotify.services.js';
import { searchMusicBrainz } from '../services/musicbrainz.service.js';
import { searchFMA } from '../services/fma.services.js';
import { searchYouTube, searchYouTubeMusic } from '../services/youtube.services.js';
import { searchDeezer } from '../services/deezer.services.js';
import { mergeResults } from '../utils/mergeResults.js';
import { insert } from '../db/database.js';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

export const searchController = async (req, res) => {
  try {
    const query = req.query.q;

    if (!query) {
      return res.status(400).json({
        error: "Query required",
        details: "The 'q' parameter is mandatory",
      });
    }

    if (query.trim().length < 2) {
      return res.status(400).json({
        error: "Query too short",
        details: "Query must be at least 2 characters long",
      });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(req.query.limit) || DEFAULT_LIMIT)
    );

    const sources = [
      { name: 'Spotify', fn: () => searchSpotify(query, limit) },
      { name: 'MusicBrainz', fn: () => searchMusicBrainz(query, limit) },
      { name: 'FMA', fn: () => searchFMA(query, page, limit) },
      { name: 'YouTube', fn: () => searchYouTube(query, limit) },
      { name: 'YouTubeMusic', fn: () => searchYouTubeMusic(query, limit) },
      { name: 'Deezer', fn: () => searchDeezer(query, limit) },
    ];

    const results = {};
    const errors = [];

    for (const { name, fn } of sources) {
      try {
        results[name] = await fn();
      } catch (error) {
        errors.push({
          service: name,
          message: error.message,
          statusCode: error.statusCode || 500,
        });
        results[name] = [];
        console.error(`[${name} Error] ${error.message}`);
      }
    }

    if (errors.length === sources.length) {
      return res.status(500).json({
        error: "All search services failed",
        details: Object.fromEntries(
          errors.map((e) => [e.service.toLowerCase(), e.message])
        ),
      });
    }

    const finalResults = mergeResults(
      results.Spotify,
      results.MusicBrainz,
      results.FMA,
      results.YouTube,
      results.Deezer,
      results.YouTubeMusic
    );

    if (req.user) {
      try {
        await insert('search_history', {
          user_id: req.user.userId,
          query: query.trim(),
          results_count: finalResults.length,
        });
      } catch (error) {
        console.warn(`[History Error] Could not save search history: ${error.message}`);
      }
    }

    const warnings = errors.map((e) => `${e.service} unavailable: ${e.message}`);

    const response = {
      tracks: finalResults,
      count: finalResults.length,
      pagination: {
        page,
        limit,
      },
      sources: Object.fromEntries(
        sources.map(({ name }) => [name.toLowerCase(), results[name].length])
      ),
    };

    if (warnings.length > 0) {
      response.warnings = warnings;
    }

    const statusCode = warnings.length > 0 ? 206 : 200;
    return res.status(statusCode).json(response);
  } catch (error) {
    console.error(`[Unexpected Error] ${error.message}`, error);
    return res.status(500).json({
      error: "Unexpected error during search",
      details: error.message,
    });
  }
};
