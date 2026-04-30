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
 * VALIDACIÓN DE VARIABLES DE ENTORNO
 *
 * Spotify es opcional para arrancar el servidor. Si no hay credenciales,
 * el backend sigue disponible y la búsqueda degrada a MusicBrainz.
 */
if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
  console.warn("⚠️ Spotify no está configurado: SPOTIFY_CLIENT_ID/SPOTIFY_CLIENT_SECRET faltan en .env");
  console.warn("🎵 El servidor iniciará usando MusicBrainz como fuente disponible");
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
