/**
 * VALIDACIÓN DE ENTORNO
 *
 * Verifica que todas las variables de entorno necesarias estén
 * configuradas correctamente antes de iniciar la aplicación.
 *
 * CATEGORÍAS:
 * - DB_VARS: Requeridas para la conexión a base de datos
 * - REQUIRED_VARS: Requeridas para el funcionamiento básico
 * - RECOMMENDED_VARS: Recomendadas para mejor experiencia
 * - OPTIONAL_VARS: Opcionales, cada usuario decide si usarlas
 *
 * YouTube es la fuente principal de música. Los plugins de
 * YouTube y YouTube Music están siempre activos y usan Invidious
 * como fallback cuando no hay API key, pero se recomienda
 * configurar YOUTUBE_API_KEY para mejor rendimiento.
 */

import logger from './logger.js';

const DB_VARS = {
  DB_HOST: 'Host de la base de datos',
  DB_USER: 'Usuario de la base de datos',
  DB_PASSWORD: 'Contraseña de la base de datos',
  DB_NAME: 'Nombre de la base de datos',
};

const REQUIRED_VARS = {
  JWT_SECRET: 'JWT secret para firmar tokens (genera con: openssl rand -base64 32)',
};

const RECOMMENDED_VARS = {
  YOUTUBE_API_KEY: 'API Key de YouTube Data API v3. Sin ella se usa Invidious como fallback.',
};

const OPTIONAL_VARS = {
  SPOTIFY_CLIENT_ID: 'Client ID de Spotify (necesario para buscar en Spotify)',
  SPOTIFY_CLIENT_SECRET: 'Client Secret de Spotify (necesario para buscar en Spotify)',
  FMA_API_KEY: 'API Key de Free Music Archive (necesario para buscar en FMA)',
};

export function validateEnv() {
  let hasErrors = false;
  let hasWarnings = false;

  for (const [key, desc] of Object.entries(DB_VARS)) {
    if (!process.env[key]) {
      logger.error(`Variable de entorno faltante: ${key} — ${desc}`);
      hasErrors = true;
    }
  }

  for (const [key, desc] of Object.entries(REQUIRED_VARS)) {
    if (!process.env[key] || process.env[key].startsWith('your_')) {
      logger.error(`Variable de entorno faltante o inválida: ${key} — ${desc}`);
      hasErrors = true;
    }
  }

  const hasYoutubeKey = process.env.YOUTUBE_API_KEY
    && !process.env.YOUTUBE_API_KEY.startsWith('your_');
  if (!hasYoutubeKey) {
    logger.warn(
      'YOUTUBE_API_KEY no configurada — Los plugins de YouTube usarán Invidious como fallback. ' +
      'Los resultados pueden ser menos precisos y más lentos. ' +
      'Configura YOUTUBE_API_KEY en .env para mejor rendimiento.'
    );
    hasWarnings = true;
  }

  for (const [key, desc] of Object.entries(OPTIONAL_VARS)) {
    if (!process.env[key] || process.env[key].startsWith('your_')) {
      logger.warn(`Variable de entorno no configurada: ${key} — ${desc}. El servicio correspondiente no funcionará.`);
      hasWarnings = true;
    }
  }

  if (hasErrors) {
    logger.error('Configuración inválida. Corrige las variables faltantes en .env y reinicia.');
    process.exit(1);
  }

  if (hasWarnings) {
    logger.warn('Algunos servicios no están completamente configurados. Revisa .env para más información.');
  }

  logger.info('Variables de entorno validadas correctamente');
}
