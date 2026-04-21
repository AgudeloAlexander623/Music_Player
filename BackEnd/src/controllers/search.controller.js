import { searchSpotify } from '../services/spotify.services.js';
import { searchMusicBrainz } from '../services/musicbrainz.service.js';
import { mergeResults } from '../utils/mergeResults.js';

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

    let spotifyResults = [];
    let spotifyError = null;
    let musicBrainzResults = [];
    let musicBrainzError = null;

    // Intentar búsqueda en Spotify
    try {
      spotifyResults = await searchSpotify(query);
    } catch (error) {
      spotifyError = {
        service: 'Spotify',
        message: error.message,
        statusCode: error.statusCode || 500,
      };
      console.error(`[Spotify Error] ${error.message}`);
    }

    // Intentar búsqueda en MusicBrainz (independiente de Spotify)
    try {
      musicBrainzResults = await searchMusicBrainz(query);
    } catch (error) {
      musicBrainzError = {
        service: 'MusicBrainz',
        message: error.message,
        statusCode: error.statusCode || 500,
      };
      console.error(`[MusicBrainz Error] ${error.message}`);
    }

    // Si ambas búsquedas fallaron, retornar error
    if (spotifyError && musicBrainzError) {
      return res.status(500).json({
        error: "Both search services failed",
        details: {
          spotify: spotifyError.message,
          musicbrainz: musicBrainzError.message,
        },
      });
    }

    // Si solo una falla, continuar con la otra
    if (spotifyError) {
      console.warn(`[Warning] Spotify failed, using only MusicBrainz results`);
      return res.status(206).json({
        results: musicBrainzResults,
        warning: spotifyError.message,
        partialContent: true,
      });
    }

    if (musicBrainzError) {
      console.warn(`[Warning] MusicBrainz failed, using only Spotify results`);
      return res.status(206).json({
        results: spotifyResults,
        warning: musicBrainzError.message,
        partialContent: true,
      });
    }

    // Ambas búsquedas fueron exitosas
    const merged = mergeResults(spotifyResults, musicBrainzResults);
    res.json({
      results: merged,
      count: merged.length,
      sources: {
        spotify: spotifyResults.length,
        musicbrainz: musicBrainzResults.filter(
          (mb) => !merged.some((m) => m.musicbrainzId === mb.id)
        ).length,
      },
    });
  } catch (error) {
    console.error(`[Unexpected Error] ${error.message}`, error);
    res.status(500).json({
      error: "Unexpected error during search",
      details: error.message,
    });
  }
};