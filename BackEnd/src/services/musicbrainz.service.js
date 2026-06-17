import axios from "axios";

const BASE_URL = "https://musicbrainz.org/ws/2/recording/";
const COVER_ART_BASE = "https://coverartarchive.org/release";
const MIN_INTERVAL_MS = 1100;
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 1000;
const TIMEOUT_MS = 8000;
const MAX_LIMIT = 25;

let lastRequestTime = 0;
let rateLimitPromise = null;

class MusicBrainzServiceError extends Error {
  constructor(message, statusCode, retryable = false) {
    super(message);
    this.name = "MusicBrainzServiceError";
    this.statusCode = statusCode;
    this.retryable = retryable;
  }
}

async function rateLimit() {
  if (rateLimitPromise) return rateLimitPromise;

  rateLimitPromise = (async () => {
    try {
      const now = Date.now();
      const elapsed = now - lastRequestTime;
      if (elapsed < MIN_INTERVAL_MS) {
        await new Promise((resolve) => setTimeout(resolve, MIN_INTERVAL_MS - elapsed));
      }
      lastRequestTime = Date.now();
    } finally {
      rateLimitPromise = null;
    }
  })();

  return rateLimitPromise;
}

export function _resetForTest() {
  lastRequestTime = 0;
  rateLimitPromise = null;
}

function normalizeRecording(recording) {
  const artists = recording["artist-credit"] ?? [];
  const artist = artists.map((a) => (typeof a === "object" ? a.name : String(a))).join(", ") || "Unknown";

  const release = recording.releases?.[0] ?? null;
  const album = release?.title ?? "";
  const albumImage = release?.id
    ? `${COVER_ART_BASE}/${release.id}/front`
    : "";
  const duration = recording.length != null ? Math.round(recording.length / 1000) : null;

  return {
    id: recording.id,
    name: recording.title ?? "Unknown",
    artist,
    album,
    albumImage,
    previewUrl: null,
    duration,
    source: "musicbrainz",
  };
}

export async function searchMusicBrainz(query, limit = 10) {
  let lastError;

  const searchLimit = Math.min(limit, MAX_LIMIT);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      await rateLimit();

      const res = await axios.get(BASE_URL, {
        params: {
          query,
          fmt: "json",
          limit: searchLimit,
        },
        headers: {
          "User-Agent": "SoundWave-Music/1.0 (alexander@example.com)",
        },
        timeout: TIMEOUT_MS,
      });

      if (!res.data.recordings) return [];

      return res.data.recordings.map(normalizeRecording);
    } catch (error) {
      lastError = error;
      if (error instanceof MusicBrainzServiceError && !error.retryable) throw error;
      if (error.response?.status && error.response.status < 500 && error.response.status !== 429) {
        throw new MusicBrainzServiceError(
          `MusicBrainz search failed: ${error.response.status} ${error.response.statusText}`,
          error.response.status,
          false
        );
      }
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, BASE_DELAY_MS * Math.pow(2, attempt)));
      }
    }
  }

  if (lastError.response) {
    throw new MusicBrainzServiceError(
      `MusicBrainz search failed: ${lastError.response.status} ${lastError.response.statusText}`,
      lastError.response.status,
      lastError.response.status >= 500 || lastError.response.status === 429
    );
  }
  if (lastError.code === "ECONNABORTED") {
    throw new MusicBrainzServiceError(
      "MusicBrainz request timeout. Service may be unavailable.",
      408,
      true
    );
  }
  throw new MusicBrainzServiceError(
    `Failed to search MusicBrainz: ${lastError?.message ?? "Unknown error"}`,
    500,
    false
  );
}
