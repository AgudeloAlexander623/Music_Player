import express from 'express';
import rateLimit from 'express-rate-limit';
import { searchController } from '../controllers/search.controller.js';

const router = express.Router();

const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    error: 'Demasiadas solicitudes',
    details: 'Máximo 30 búsquedas por minuto',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/', searchLimiter, searchController);

export default router;
