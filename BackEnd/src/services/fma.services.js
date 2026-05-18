import axios from "axios";

class FMAServiceError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "FMAServiceError";
    this.statusCode = statusCode;
  }
}

export async function searchFMA(query, page = 1, limit = 10) {
  try {
    const apiKey = process.env.FMA_API_KEY;
    if (!apiKey) {
      throw new FMAServiceError(
        "FMA_API_KEY is missing from .env",
        400
      );
    }

    const offset = (page - 1) * limit;

    const res = await axios.get(
      "https://freemusicarchive.org/api/v1/track/search",
      {
        params: {
          api_key: apiKey,
          "track_title": query,
          limit: limit,
          offset: offset,
        },
        timeout: 8000,
      }
    );

    if (!res.data || !res.data.dataset || !Array.isArray(res.data.dataset)) {
      return [];
    }

    return res.data.dataset.map((track) => ({
      id: track.track_id,
      name: track.track_title || "Unknown",
      artist: track.artist_name || "Unknown",
      album: track.album_title || "",
      albumImage: null,
      previewUrl: track.track_file || null,
      source: "fma",
      duration: track.track_duration ? parseInt(track.track_duration) : null,
      license: track.license_title || null,
    }));
  } catch (error) {
    if (error instanceof FMAServiceError) {
      throw error;
    }
    if (error.response) {
      throw new FMAServiceError(
        `FMA search failed: ${error.response.status} ${error.response.statusText}`,
        error.response.status
      );
    }
    if (error.code === "ECONNABORTED") {
      throw new FMAServiceError(
        "FMA request timeout (8s). Service may be unavailable.",
        408
      );
    }
    throw new FMAServiceError(
      `Failed to search FMA: ${error.message}`,
      500
    );
  }
}
