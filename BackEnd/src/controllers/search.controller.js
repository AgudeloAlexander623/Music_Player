import { searchSpotify } from '../services/spotify.services.js';
import { searchMusicBrainz } from '../services/musicbrainz.service.js';
import { mergeResults } from '../utils/mergeResults.js';
import { insert } from '../db/database.js';

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

    let finalResults = [];
    let statusCode = 200;

    // Si solo una falla, continuar con la otra
    if (spotifyError) {
      console.warn(`[Warning] Spotify failed, using only MusicBrainz results`);
      finalResults = musicBrainzResults;
      statusCode = 206;
    } else if (musicBrainzError) {
      console.warn(`[Warning] MusicBrainz failed, using only Spotify results`);
      finalResults = spotifyResults;
      statusCode = 206;
    } else {
      // Ambas búsquedas fueron exitosas
      finalResults = mergeResults(spotifyResults, musicBrainzResults);
    }

    // Guardar búsqueda en historial si usuario está autenticado
    if (req.user) {
      try {
        await insert('search_history', {
          user_id: req.user.userId,
          query: query.trim(),
          results_count: finalResults.length,
        });
      } catch (error) {
        console.warn(`[History Error] Could not save search history: ${error.message}`);
        // No bloqueamos la respuesta, solo logueamos el error
      }
    }

    // Construir respuesta
    const response = {
      tracks: finalResults,
      count: finalResults.length,
      sources: {
        spotify: spotifyResults.length,
        musicbrainz: musicBrainzResults.filter(
          (mb) => !finalResults.some((m) => m.musicbrainzId === mb.id)
        ).length,
      },
    };

    // Agregar mensajes de advertencia
    if (spotifyError && !musicBrainzError) {
      response.warning = `Spotify unavailable: ${spotifyError.message}`;
    } else if (musicBrainzError && !spotifyError) {
      response.warning = `MusicBrainz unavailable: ${musicBrainzError.message}`;
    }

    return res.status(statusCode).json(response);
  } catch (error) {
    console.error(`[Unexpected Error] ${error.message}`, error);
    return res.status(500).json({
      error: "Unexpected error during search",
      details: error.message,
    });
  }
};