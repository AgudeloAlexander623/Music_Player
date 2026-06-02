import logger from '../utils/logger.js';
import { getRecommendations, checkPythonServiceHealth, getPopularRecommendations } from '../services/python.service.js';

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

export const getRecommendationsController = async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));

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

    if (error.name === 'PythonServiceError' && error.statusCode === 503) {
      return res.status(503).json({
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

export const getServiceStatusController = async (_req, res) => {
  const healthy = await checkPythonServiceHealth();
  res.json({
    pythonService: healthy ? 'running' : 'unavailable',
  });
};

export const getPopularRecommendationsController = async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const result = await getPopularRecommendations(limit);

    const recommendations = (result.recommendations || []).map(formatForFrontend);

    res.json({
      success: true,
      recommendations,
      count: recommendations.length,
      metadata: result.metadata || {},
    });
  } catch (error) {
    logger.error('Error obteniendo recomendaciones populares', { error: error.message });
    res.status(500).json({ error: 'Failed to get popular recommendations', details: error.message });
  }
};
