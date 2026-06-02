import logger from "../utils/logger.js";
import axios from "axios";
import { findMany } from "../db/database.js";

const FALLBACK_RECOMMENDATIONS = [
  { id: "fallback_01", name: "Bohemian Rhapsody", artist: "Queen", album: "A Night at the Opera", albumImage: "https://via.placeholder.com/300x300/1e1e2e/ffffff?text=QB", previewUrl: null, duration: null, source: "recommendation", reason: "All-time classic" },
  { id: "fallback_02", name: "Blinding Lights", artist: "The Weeknd", album: "After Hours", albumImage: "https://via.placeholder.com/300x300/1e1e2e/ffffff?text=TB", previewUrl: null, duration: null, source: "recommendation", reason: "Trending worldwide" },
  { id: "fallback_03", name: "Dákiti", artist: "Bad Bunny", album: "El Último Tour Del Mundo", albumImage: "https://via.placeholder.com/300x300/1e1e2e/ffffff?text=BD", previewUrl: null, duration: null, source: "recommendation", reason: "Latin hit" },
  { id: "fallback_04", name: "Get Lucky", artist: "Daft Punk", album: "Random Access Memories", albumImage: "https://via.placeholder.com/300x300/1e1e2e/ffffff?text=DG", previewUrl: null, duration: null, source: "recommendation", reason: "Feel-good vibes" },
  { id: "fallback_05", name: "Smells Like Teen Spirit", artist: "Nirvana", album: "Nevermind", albumImage: "https://via.placeholder.com/300x300/1e1e2e/ffffff?text=NS", previewUrl: null, duration: null, source: "recommendation", reason: "Grunge anthem" },
  { id: "fallback_06", name: "Billie Jean", artist: "Michael Jackson", album: "Thriller", albumImage: "https://via.placeholder.com/300x300/1e1e2e/ffffff?text=MB", previewUrl: null, duration: null, source: "recommendation", reason: "Legendary" },
  { id: "fallback_07", name: "Tití Me Preguntó", artist: "Bad Bunny", album: "Un Verano Sin Ti", albumImage: "https://via.placeholder.com/300x300/1e1e2e/ffffff?text=BT", previewUrl: null, duration: null, source: "recommendation", reason: "Party starter" },
  { id: "fallback_08", name: "Strobe", artist: "Deadmau5", album: "For Lack of a Better Name", albumImage: "https://via.placeholder.com/300x300/1e1e2e/ffffff?text=DS", previewUrl: null, duration: null, source: "recommendation", reason: "Electronic masterpiece" },
  { id: "fallback_09", name: "Take Five", artist: "Dave Brubeck", album: "Time Out", albumImage: "https://via.placeholder.com/300x300/1e1e2e/ffffff?text=DT", previewUrl: null, duration: null, source: "recommendation", reason: "Jazz essential" },
  { id: "fallback_10", name: "Shape of You", artist: "Ed Sheeran", album: "Divide", albumImage: "https://via.placeholder.com/300x300/1e1e2e/ffffff?text=ES", previewUrl: null, duration: null, source: "recommendation", reason: "Pop hit" },
];

class PythonServiceError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "PythonServiceError";
    this.statusCode = statusCode;
  }
}

function getPythonServiceUrl() {
  return process.env.PYTHON_SERVICE_URL || "http://localhost:8000";
}

async function fetchUserTracks(userId) {
  try {
    const favorites = await findMany("favorite_tracks", { user_id: userId }, 20);
    if (favorites.length > 0) {
      return favorites.map((f) => ({
        name: f.track_title || "",
        artist: f.artist || "",
        album: f.album || "",
      }));
    }

    const history = await findMany("search_history", { user_id: userId }, 10);
    if (history.length > 0) {
      return history.map((h) => ({
        name: h.query || "",
        artist: "",
        album: "",
      }));
    }

    return [];
  } catch {
    return [];
  }
}

export async function getRecommendations(userId, limit = 10) {
  const tracks = await fetchUserTracks(userId);

  try {
    const res = await axios.post(
      `${getPythonServiceUrl()}/recommend`,
      { tracks, count: limit },
      { timeout: 15000 }
    );

    const data = res.data;
    return {
      recommendations: data.recommendations || [],
      metadata: data.metadata || {},
    };
  } catch (error) {
    if (error instanceof PythonServiceError) throw error;

    const sliced = FALLBACK_RECOMMENDATIONS.slice(0, Math.min(limit, 10));

    if (error.code === "ECONNREFUSED" || error.code === "ECONNABORTED") {
      logger.warn("Python service no disponible, usando fallback");
      return {
        recommendations: sliced,
        metadata: { strategy: "fallback", reason: "Python service unavailable" },
      };
    }

    logger.warn("Error en Python service, usando fallback", { error: error.message });
    return {
      recommendations: sliced,
      metadata: { strategy: "fallback", reason: `Python service error: ${error.message}` },
    };
  }
}

export async function checkPythonServiceHealth() {
  try {
    const res = await axios.get(`${getPythonServiceUrl()}/health`, { timeout: 3000 });
    return res.data.status === "ok";
  } catch {
    return false;
  }
}

export async function getPopularRecommendations(limit = 10) {
  try {
    const res = await axios.get(`${getPythonServiceUrl()}/recommend/popular`, {
      params: { count: limit },
      timeout: 10000,
    });
    return {
      recommendations: res.data.recommendations || [],
      metadata: res.data.metadata || {},
    };
  } catch {
    const sliced = FALLBACK_RECOMMENDATIONS.slice(0, Math.min(limit, 10));
    return {
      recommendations: sliced,
      metadata: { strategy: "fallback-popular" },
    };
  }
}
