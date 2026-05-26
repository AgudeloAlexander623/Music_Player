import axios from 'axios';

class MusicBrainzServiceError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "MusicBrainzServiceError";
    this.statusCode = statusCode;
  }
}

let lastRequestTime = 0;
const MIN_INTERVAL_MS = 1100;

async function rateLimit() {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

export async function searchMusicBrainz(query, limit = 10) {
  try {
    await rateLimit();

    const searchLimit = Math.min(limit, 25);
    const res = await axios.get(
      `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(query)}&fmt=json&limit=${searchLimit}`,
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

    return res.data.recordings.map((track) => {
      const album = track.releases?.[0]?.title ?? "";
      const albumImage = track.releases?.[0]?.['cover-art-archive']?.artwork
        ? `https://coverartarchive.org/release/${track.releases[0].id}/front`
        : "";

      return {
        id: track.id,
        name: track.title,
        artist: track['artist-credit']?.[0]?.name ?? 'Unknown',
        album,
        albumImage,
        previewUrl: null,
        source: 'musicbrainz',
      };
    });
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
