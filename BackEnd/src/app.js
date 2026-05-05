/**
 * SERVIDOR PRINCIPAL - REPRODUCTOR DE MÚSICA
 *
 * Backend sin base de datos (modo música únicamente)
 * - Búsqueda en Spotify/MusicBrainz
 * - CORS habilitado para frontend
 */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import searchRoutes from "./routes/search.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();

app.use(cors());
app.use(express.json());

// Solo ruta de búsqueda (no requiere BD)
app.use("/api/search", searchRoutes);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`\n🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`🎵 Búsqueda disponible en http://localhost:${PORT}/api/search`);
  console.log(`⚠️  Modo sin base de datos (solo búsqueda)\n`);
});
