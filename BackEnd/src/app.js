import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import searchRoutes from "./routes/search.routes.js";
import pluginsRoutes from "./routes/plugins.routes.js";
import authRoutes from "./routes/auth.routes.js";
import favoritesRoutes from "./routes/favorites.routes.js";
import playlistsRoutes from "./routes/playlists.routes.js";
import recommendationsRoutes from "./routes/recommendations.routes.js";
import { initializeDatabase } from "./db/database.js";
import { validateEnv } from "./utils/validateEnv.js";
import logger from "./utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

validateEnv();

const app = express();

const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
  : ['http://localhost:5173', 'http://localhost:4000'];

app.use(cors({
  origin: corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.disable('x-powered-by');

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Demasiadas solicitudes. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);

app.use(express.json({ limit: '1mb' }));

app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "backend" });
});

app.use("/api/search", searchRoutes);
app.use("/api/plugins", pluginsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/favorites", favoritesRoutes);
app.use("/api/playlists", playlistsRoutes);
app.use("/api/recommendations", recommendationsRoutes);

app.use((err, _req, res, _next) => {
  logger.error("Error no manejado", { error: err.message, stack: err.stack });
  res.status(err.statusCode || 500).json({
    error: err.name || "Internal server error",
    details: err.message || "Ocurrió un error inesperado",
  });
});

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    await initializeDatabase();
    logger.info('Base de datos conectada');
  } catch (error) {
    logger.warn('Base de datos no disponible - modo sin BD', { error: error.message });
  }

  app.listen(PORT, () => {
    logger.info(`Servidor corriendo en puerto ${PORT}`);
  });
}

start();
