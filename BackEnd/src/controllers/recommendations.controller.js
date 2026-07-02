/**
 * CONTROLADOR DE RECOMENDACIONES
 *
 * Puente entre el frontend y el servicio Python de recomendaciones.
 * - getRecommendations: Recomendaciones personalizadas por usuario
 * - getPopularRecommendations: Recomendaciones globales populares
 * - getServiceStatus: Health check del servicio Python
 *
 * Fallback: si el servicio Python no está disponible, usa una lista
 * interna de recomendaciones predefinidas (ver python.service.js).
 */

import logger from '../utils/logger.js';
import {
  getRecommendations,
  checkPythonServiceHealth,
  getPopularRecommendations,
} from '../services/python.service.js';
import { PythonServiceError } from '../services/python.service.js';

/**
 * Normaliza un item de recomendación al formato del frontend.
 * @param {object} item
 * @returns {object}
 */
function formatForFrontend(item) {
  return {
    id: item.id,
    name: item.name,
    artist: item.artist,
    album: item.album || '',
    albumImage: item.albumImage || '',
    previewUrl: item.previewUrl ?? null,
    duration: item.duration ?? null,
    source: item.source || 'recommendation',
    reason: item.reason || '',
  };
}

/**
 * Parsea el límite de resultados con validación.
 * @param {string|undefined} limitStr
 * @param {number} max
 * @param {number} defaultVal
 * @returns {number}
 */
function parseLimit(limitStr, max = 50, defaultVal = 10) {
  return Math.min(max, Math.max(1, parseInt(limitStr) || defaultVal));
}

/**
 * ENDPOINT: RECOMENDACIONES PERSONALIZADAS
 *
 * GET /api/recommendations
 * Headers: Authorization: Bearer <token>
 * Query: ?limit=10
 *
 * RESPUESTA EXITOSA (200): { success, recommendations, count, metadata }
 */
export const getRecommendationsController = async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = parseLimit(req.query.limit);

    const result = await getRecommendations(userId, limit);

    const recommendations = (result.recommendations || []).map(formatForFrontend);

    res.json({
      success: true,
      recommendations,
      count: recommendations.length,
      metadata: result.metadata || {},
    });
  } catch (error) {
    logger.error('Error obteniendo recomendaciones', { error: error.message });

    if (error instanceof PythonServiceError) {
      return res.status(error.statusCode || 503).json({
        error: 'Recommendation service unavailable',
        details: error.message,
        hint: 'Start the Python service: cd python-services && uvicorn main:app --reload',
      });
    }

    res.status(500).json({
      error: 'Failed to get recommendations',
      details: error.message,
    });
  }
};

/**
 * ENDPOINT: ESTADO DEL SERVICIO PYTHON
 *
 * GET /api/recommendations/status
 *
 * RESPUESTA (200): { pythonService: 'running' | 'unavailable' }
 */
export const getServiceStatusController = async (_req, res) => {
  const healthy = await checkPythonServiceHealth();
  res.json({
    pythonService: healthy ? 'running' : 'unavailable',
  });
};

/**
 * ENDPOINT: RECOMENDACIONES POPULARES
 *
 * GET /api/recommendations/popular
 * Query: ?limit=10
 *
 * RESPUESTA EXITOSA (200): { success, recommendations, count, metadata }
 */
export const getPopularRecommendationsController = async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit);
    const result = await getPopularRecommendations(limit);

    const recommendations = (result.recommendations || []).map(formatForFrontend);

    res.json({
      success: true,
      recommendations,
      count: recommendations.length,
      metadata: result.metadata || {},
    });
  } catch (error) {
    logger.error('Error obteniendo recomendaciones populares', {
      error: error.message,
    });

    res.status(500).json({
      error: 'Failed to get popular recommendations',
      details: error.message,
    });
  }
};
