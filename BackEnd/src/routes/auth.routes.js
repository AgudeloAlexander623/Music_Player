import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  register,
  login,
  guestLogin,
  verifyTokenEndpoint,
  refreshToken,
  logout,
} from '../controllers/auth.controller.js';
import { verifyTokenMiddleware } from '../middleware/verifyToken.js';

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(authLimiter);

router.post('/register', register);
router.post('/login', login);
router.post('/guest', guestLogin);
router.post('/verify', verifyTokenEndpoint);
router.post('/refresh', refreshToken);
router.post('/logout', verifyTokenMiddleware, logout);

export default router;
