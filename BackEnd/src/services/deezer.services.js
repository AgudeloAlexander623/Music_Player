import axios from "axios";

class DeezerServiceError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "DeezerServiceError";
    this.statusCode = statusCode;
  }
}

export async function searchDeezer(query, limit = 10) {
  try {
    const searchLimit = Math.min(limit, 50);

    const res = await axios.get(
      "https://api.deezer.com/search",
      {
        params: {
          q: query,
          limit: searchLimit,
        },
        timeout: 8000,
      }
    );

    if (!res.data.data || !Array.isArray(res.data.data)) {
      return [];
    }

    const tracks = res.data.data.slice(0, searchLimit);
    return tracks.map((track) => ({
      id: String(track.id),
      name: track.title,
      artist: track.artist?.name ?? "",
      album: track.album?.title ?? "",
      albumImage: track.album?.cover_medium ?? track.album?.cover ?? "",
      previewUrl: track.preview,
      source: "deezer",
      duration: track.duration,
    }));
  } catch (error) {
    if (error instanceof DeezerServiceError) {
      throw error;
    }
    if (error.response) {
      throw new DeezerServiceError(
        `Deezer search failed: ${error.response.status} ${error.response.statusText}`,
        error.response.status
      );
    }
    if (error.code === "ECONNABORTED") {
      throw new DeezerServiceError(
        "Deezer request timeout (8s). Service may be unavailable.",
        408
      );
    }
    throw new DeezerServiceError(
      `Failed to search Deezer: ${error.message}`,
      500
    );
  }
}
