import { searchSpotify } from '../services/spotify.services.js';
import { searchMusicBrainz } from '../services/musicbrainz.service.js';
import { searchFMA } from '../services/fma.services.js';
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

    let spotifyResults = [];
    let spotifyError = null;
    let musicBrainzResults = [];
    let musicBrainzError = null;
    let fmaResults = [];
    let fmaError = null;

    try {
      spotifyResults = await searchSpotify(query, limit);
    } catch (error) {
      spotifyError = {
        service: 'Spotify',
        message: error.message,
        statusCode: error.statusCode || 500,
      };
      console.error(`[Spotify Error] ${error.message}`);
    }

    try {
      musicBrainzResults = await searchMusicBrainz(query, limit);
    } catch (error) {
      musicBrainzError = {
        service: 'MusicBrainz',
        message: error.message,
        statusCode: error.statusCode || 500,
      };
      console.error(`[MusicBrainz Error] ${error.message}`);
    }

    try {
      fmaResults = await searchFMA(query, page, limit);
    } catch (error) {
      fmaError = {
        service: 'FMA',
        message: error.message,
        statusCode: error.statusCode || 500,
      };
      console.error(`[FMA Error] ${error.message}`);
    }

    const activeServices = [spotifyError, musicBrainzError, fmaError].filter(Boolean).length;
    if (activeServices === 3) {
      return res.status(500).json({
        error: "All search services failed",
        details: {
          spotify: spotifyError?.message,
          musicbrainz: musicBrainzError?.message,
          fma: fmaError?.message,
        },
      });
    }

    let finalResults = [];

    if (spotifyError && musicBrainzError && fmaError) {
      return res.status(500).json({
        error: "All search services failed",
      });
    }

    finalResults = mergeResults(spotifyResults, musicBrainzResults, fmaResults);

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

    const warnings = [];
    if (spotifyError) warnings.push(`Spotify unavailable: ${spotifyError.message}`);
    if (musicBrainzError) warnings.push(`MusicBrainz unavailable: ${musicBrainzError.message}`);
    if (fmaError) warnings.push(`FMA unavailable: ${fmaError.message}`);

    const response = {
      tracks: finalResults,
      count: finalResults.length,
      pagination: {
        page,
        limit,
      },
      sources: {
        spotify: spotifyResults.length,
        musicbrainz: musicBrainzResults.length,
        fma: fmaResults.length,
      },
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
