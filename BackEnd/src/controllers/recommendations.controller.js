import { getRecommendations, checkPythonServiceHealth } from '../services/python.service.js';

export const getRecommendationsController = async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));

    const recommendations = await getRecommendations(userId, limit);

    res.json({
      success: true,
      recommendations,
      count: recommendations.length,
    });
  } catch (error) {
    console.error('[Recommendations Error]', error.message);

    if (error.statusCode === 503) {
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
