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
import authRoutes from "./routes/auth.routes.js";
import favoritesRoutes from "./routes/favorites.routes.js";
import { initializeDatabase, closeDatabase } from "./db/database.js";

// Cargar variables de entorno desde .env
// IMPORTANTE: El archivo .env debe existir con credenciales válidas
dotenv.config();

/**
 * VALIDACIÓN DE VARIABLES DE ENTORNO
 *
 * Spotify es opcional para arrancar el servidor. Si no hay credenciales,
 * el backend sigue disponible y la búsqueda degrada a MusicBrainz.
 *
 * JWT_SECRET es CRÍTICO para asegurar tokens. Sin él, no funciona autenticación.
 *
 * BD es CRÍTICO para persistencia. Sin conexión, no funciona el sistema.
 */
if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
  console.warn("⚠️ Spotify no está configurado: SPOTIFY_CLIENT_ID/SPOTIFY_CLIENT_SECRET faltan en .env");
  console.warn("🎵 El servidor iniciará usando MusicBrainz como fuente disponible");
}

if (!process.env.JWT_SECRET) {
  console.warn("⚠️ JWT_SECRET no está configurado en .env");
  console.warn("🔐 La autenticación no funcionará correctamente sin JWT_SECRET");
}

if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
  console.error("❌ Variables de base de datos no configuradas en .env");
  console.error("🔍 Requeridas: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME");
  process.exit(1);
}

// Inicializar aplicación Express
const app = express();

// Middlewares básicos
app.use(cors()); // Habilitar CORS para requests del frontend
app.use(express.json()); // Parsear JSON en requests

// Rutas de la API
// Rutas de autenticación (public)
app.use("/api/auth", authRoutes);

// Rutas de búsqueda musical
app.use("/api/search", searchRoutes);

// Rutas de favoritos (protegidas con JWT)
app.use("/api/favorites", favoritesRoutes);

// Puerto configurable via .env, default 4000
const PORT = process.env.PORT || 4000;

// Iniciar servidor
async function startServer() {
  try {
    // Inicializar base de datos
    console.log('\n🔄 Conectando a base de datos...');
    await initializeDatabase();

    // Iniciar servidor Express
    const server = app.listen(PORT, () => {
      console.log(`\n🚀 Servidor corriendo en puerto ${PORT}`);
      console.log(`📡 API disponible en http://localhost:${PORT}/api`);
      console.log(`🔐 Autenticación: /api/auth/register, /api/auth/login, /api/auth/verify`);
      console.log(`🎵 Búsqueda: /api/search`);
      console.log(`❤️ Favoritos: /api/favorites (requiere JWT)`);
      console.log(`🎵 Listo para buscar música!\n`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('\n📢 SIGTERM recibido, apagando servidor...');
      server.close(async () => {
        console.log('✅ Servidor HTTP cerrado');
        await closeDatabase();
        console.log('✅ Base de datos cerrada');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      console.log('\n📢 SIGINT recibido (Ctrl+C), apagando servidor...');
      server.close(async () => {
        console.log('✅ Servidor HTTP cerrado');
        await closeDatabase();
        console.log('✅ Base de datos cerrada');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('\n❌ Error al iniciar servidor:');
    console.error(error.message);
    process.exit(1);
  }
}

// Iniciar
startServer();
