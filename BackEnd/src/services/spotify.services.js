import axios from "axios";

let accessToken = null;
let expiresAt = 0;

class SpotifyServiceError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "SpotifyServiceError";
    this.statusCode = statusCode;
  }
}

async function getToken() {
  try {
    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
      throw new SpotifyServiceError(
        "Spotify credentials (SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET) are missing from .env",
        400
      );
    }

    const res = await axios.post(
      "https://accounts.spotify.com/api/token",
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
        timeout: 5000,
      }
    );

    accessToken = res.data.access_token;
    expiresAt = Date.now() + res.data.expires_in * 1000;
  } catch (error) {
    if (error instanceof SpotifyServiceError) {
      throw error;
    }
    if (error.response) {
      throw new SpotifyServiceError(
        `Spotify authentication failed: ${error.response.status} ${error.response.statusText}`,
        error.response.status
      );
    }
    if (error.code === "ECONNABORTED") {
      throw new SpotifyServiceError(
        "Spotify token request timeout (5s). Service may be unavailable.",
        408
      );
    }
    throw new SpotifyServiceError(
      `Failed to obtain Spotify token: ${error.message}`,
      500
    );
  }
}

function isTokenExpired() {
  return !accessToken || Date.now() >= expiresAt;
}

async function ensureToken() {
  if (isTokenExpired()) {
    await getToken();
  }
}

export async function searchSpotify(query) {
  try {
    await ensureToken();

    const res = await axios.get(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        timeout: 8000,
      }
    );

    if (!res.data.tracks || !res.data.tracks.items) {
      return [];
    }

    return res.data.tracks.items.map((track) => ({
      id: track.id,
      title: track.name,
      artist: track.artists[0]?.name ?? "",
      album: track.album?.name ?? "",
      image: track.album?.images[0]?.url ?? "",
      preview: track.preview_url,
      source: "spotify",
    }));
  } catch (error) {
    if (error instanceof SpotifyServiceError) {
      throw error;
    }
    if (error.response) {
      throw new SpotifyServiceError(
        `Spotify search failed: ${error.response.status} ${error.response.statusText}`,
        error.response.status
      );
    }
    if (error.code === "ECONNABORTED") {
      throw new SpotifyServiceError(
        "Spotify search request timeout (8s). Service may be slow.",
        408
      );
    }
    throw new SpotifyServiceError(
      `Failed to search Spotify: ${error.message}`,
      500
    );
  }
}