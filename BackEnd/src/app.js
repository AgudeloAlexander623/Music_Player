/**
 * SERVIDOR PRINCIPAL - REPRODUCTOR DE MÚSICA
 *
 * Este archivo configura y inicia el servidor Express.js que maneja:
 * - Rutas de búsqueda musical (/api/search)
 * - Autenticación CORS para el frontend
 * - Validación de variables de entorno críticas
 * - Puerto configurable via .env
 *
 * Arquitectura: MVC (Model-View-Controller) simplificada
 * - Controllers: Manejan lógica de negocio
 * - Routes: Definen endpoints REST
 * - Services: Integran APIs externas (Spotify, MusicBrainz)
 */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import searchRoutes from "./routes/search.routes.js";

// Cargar variables de entorno desde .env
// IMPORTANTE: El archivo .env debe existir con credenciales válidas
dotenv.config();

/**
 * VALIDACIÓN CRÍTICA DE VARIABLES DE ENTORNO
 *
 * El servidor NO puede funcionar sin credenciales de Spotify
 * porque toda la funcionalidad depende de la API de Spotify
 */
if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
  console.error("❌ ERROR CRÍTICO: SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are required in .env");
  console.error("🔧 SOLUCIÓN: Copia .env.example como .env y configura tus credenciales de Spotify");
  console.error("📖 VER: https://developer.spotify.com/dashboard para obtener credenciales");
  process.exit(1);
}

// Inicializar aplicación Express
const app = express();

// Middlewares básicos
app.use(cors()); // Habilitar CORS para requests del frontend
app.use(express.json()); // Parsear JSON en requests

// Rutas de la API
// Todas las rutas de búsqueda están en /api/search
app.use("/api/search", searchRoutes);

// Puerto configurable via .env, default 4000
const PORT = process.env.PORT || 4000;

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📡 API disponible en http://localhost:${PORT}/api/search`);
  console.log(`🎵 Listo para buscar música!`);
});