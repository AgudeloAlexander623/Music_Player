import axios from 'axios';

class MusicBrainzServiceError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "MusicBrainzServiceError";
    this.statusCode = statusCode;
  }
}

export async function searchMusicBrainz(query) {
  try {
    const res = await axios.get(
      `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(query)}&fmt=json&limit=10`,
      {
        headers: {
          'User-Agent': 'Reproductor-App/1.0',
        },
        timeout: 8000,
      }
    );

    if (!res.data.recordings) {
      return [];
    }

    return res.data.recordings.map((track) => ({
      id: track.id,
      name: track.title,
      artist: track['artist-credit']?.[0]?.name ?? 'Unknown',
      source: 'musicbrainz',
    }));
  } catch (error) {
    if (error instanceof MusicBrainzServiceError) {
      throw error;
    }
    if (error.response) {
      throw new MusicBrainzServiceError(
        `MusicBrainz search failed: ${error.response.status} ${error.response.statusText}`,
        error.response.status
      );
    }
    if (error.code === "ECONNABORTED") {
      throw new MusicBrainzServiceError(
        "MusicBrainz request timeout (8s). Service may be unavailable.",
        408
      );
    }
    throw new MusicBrainzServiceError(
      `Failed to search MusicBrainz: ${error.message}`,
      500
    );
  }
}