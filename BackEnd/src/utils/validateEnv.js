import logger from './logger.js';

const REQUIRED_VARS = {
  JWT_SECRET: 'JWT secret para firmar tokens (genera con: openssl rand -base64 32)',
};

const CONDITIONAL_VARS = {
  SPOTIFY_CLIENT_ID: 'Client ID de Spotify (necesario para buscar en Spotify)',
  SPOTIFY_CLIENT_SECRET: 'Client Secret de Spotify (necesario para buscar en Spotify)',
  YOUTUBE_API_KEY: 'API Key de YouTube Data API v3 (necesario para buscar en YouTube)',
  FMA_API_KEY: 'API Key de Free Music Archive (necesario para buscar en FMA)',
};

const DB_VARS = {
  DB_HOST: 'Host de la base de datos',
  DB_USER: 'Usuario de la base de datos',
  DB_PASSWORD: 'Contraseña de la base de datos',
  DB_NAME: 'Nombre de la base de datos',
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

  for (const [key, desc] of Object.entries(CONDITIONAL_VARS)) {
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
    logger.warn('Algunos servicios no estarán disponibles. Revisa .env para más información.');
  }

  logger.info('Variables de entorno validadas correctamente');
}
