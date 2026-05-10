import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import searchRoutes from "./routes/search.routes.js";
import authRoutes from "./routes/auth.routes.js";
import favoritesRoutes from "./routes/favorites.routes.js";
import playlistsRoutes from "./routes/playlists.routes.js";
import { initializeDatabase } from "./db/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/search", searchRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/favorites", favoritesRoutes);
app.use("/api/playlists", playlistsRoutes);

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    await initializeDatabase();
    console.log('✅ Base de datos conectada');
  } catch (error) {
    console.warn('⚠️  Base de datos no disponible - modo sin BD');
    console.warn(`   ${error.message}`);
  }

  app.listen(PORT, () => {
    console.log(`\n🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`🎵 Búsqueda: http://localhost:${PORT}/api/search`);
    console.log(`🔐 Auth: http://localhost:${PORT}/api/auth`);
    console.log(`⭐ Favoritos: http://localhost:${PORT}/api/favorites`);
    console.log(`📋 Playlists: http://localhost:${PORT}/api/playlists\n`);
  });
}

start();
