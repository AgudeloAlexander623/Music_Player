import express from 'express';
import { verifyTokenMiddleware } from '../middleware/verifyToken.js';
import { getRecommendationsController, getServiceStatusController, getPopularRecommendationsController } from '../controllers/recommendations.controller.js';

const router = express.Router();

router.get('/', verifyTokenMiddleware, getRecommendationsController);
router.get('/popular', getPopularRecommendationsController);
router.get('/status', getServiceStatusController);

export default router;
