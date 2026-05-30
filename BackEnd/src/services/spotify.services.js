import axios from "axios";

const TOKEN_URL = "https://accounts.spotify.com/api/token";
const SEARCH_URL = "https://api.spotify.com/v1/search";
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 1000;
const TOKEN_TIMEOUT_MS = 5000;
const SEARCH_TIMEOUT_MS = 8000;

let accessToken = null;
let expiresAt = 0;
let tokenPromise = null;

class SpotifyServiceError extends Error {
  constructor(message, statusCode, retryable = false) {
    super(message);
    this.name = "SpotifyServiceError";
    this.statusCode = statusCode;
    this.retryable = retryable;
  }
}

async function getToken() {
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    throw new SpotifyServiceError(
      "Spotify credentials (SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET) are missing from .env",
      400,
      false
    );
  }

  if (tokenPromise) return tokenPromise;

  tokenPromise = (async () => {
    try {
      const res = await axios.post(
        TOKEN_URL,
        new URLSearchParams({ grant_type: "client_credentials" }),
        {
          headers: {
            Authorization:
              "Basic " +
              Buffer.from(
                `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
              ).toString("base64"),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          timeout: TOKEN_TIMEOUT_MS,
        }
      );

      accessToken = res.data.access_token;
      expiresAt = Date.now() + res.data.expires_in * 1000;
    } catch (error) {
      if (error instanceof SpotifyServiceError) throw error;
      if (error.response) {
        throw new SpotifyServiceError(
          `Spotify authentication failed: ${error.response.status} ${error.response.statusText}`,
          error.response.status,
          error.response.status >= 500 || error.response.status === 429
        );
      }
      if (error.code === "ECONNABORTED") {
        throw new SpotifyServiceError(
          "Spotify token request timeout. Service may be unavailable.",
          408,
          true
        );
      }
      throw new SpotifyServiceError(
        `Failed to obtain Spotify token: ${error.message}`,
        500,
        false
      );
    } finally {
      tokenPromise = null;
    }
  })();

  return tokenPromise;
}

function isTokenExpired() {
  return !accessToken || Date.now() >= expiresAt;
}

async function ensureToken() {
  if (isTokenExpired()) {
    await getToken();
  }
}

export function _resetForTest() {
  accessToken = null;
  expiresAt = 0;
  tokenPromise = null;
}

function normalizeTrack(track) {
  return {
    id: track.id,
    name: track.name,
    artist: track.artists?.[0]?.name ?? "",
    album: track.album?.name ?? "",
    albumImage: track.album?.images?.[0]?.url ?? "",
    previewUrl: track.preview_url ?? null,
    duration: track.duration_ms != null ? Math.round(track.duration_ms / 1000) : null,
    source: "spotify",
  };
}

export async function searchSpotify(query, limit = 10, page = 1) {
  let lastError;

  await ensureToken();

  const searchLimit = Math.min(limit, 50);
  const offset = (Math.max(1, page) - 1) * searchLimit;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await axios.get(SEARCH_URL, {
        params: {
          q: query,
          type: "track",
          limit: searchLimit,
          offset,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        timeout: SEARCH_TIMEOUT_MS,
      });

      if (!res.data.tracks?.items) return [];

      return res.data.tracks.items.map(normalizeTrack);
    } catch (error) {
      lastError = error;
      if (error instanceof SpotifyServiceError && !error.retryable) throw error;
      if (error.response?.status && error.response.status < 500 && error.response.status !== 429) {
        throw new SpotifyServiceError(
          `Spotify search failed: ${error.response.status} ${error.response.statusText}`,
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
    throw new SpotifyServiceError(
      `Spotify search failed: ${lastError.response.status} ${lastError.response.statusText}`,
      lastError.response.status,
      lastError.response.status >= 500 || lastError.response.status === 429
    );
  }
  if (lastError.code === "ECONNABORTED") {
    throw new SpotifyServiceError(
      "Spotify search request timeout. Service may be slow.",
      408,
      true
    );
  }
  throw new SpotifyServiceError(
    `Failed to search Spotify: ${lastError?.message ?? "Unknown error"}`,
    500,
    false
  );
}
