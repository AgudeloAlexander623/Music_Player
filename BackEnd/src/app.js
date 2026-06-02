import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import searchRoutes from "./routes/search.routes.js";
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

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "backend" });
});

app.use("/api/search", searchRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/favorites", favoritesRoutes);
app.use("/api/playlists", playlistsRoutes);
app.use("/api/recommendations", recommendationsRoutes);

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
