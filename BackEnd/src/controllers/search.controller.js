/**
 * CONTROLADOR DE BÚSQUEDA
 *
 * Orquesta la búsqueda en múltiples fuentes mediante PluginRegistry.
 * - Valida query y paginación
 * - Ejecuta búsqueda concurrente en todos los plugins disponibles
 * - Fusiona y deduplica resultados con mergeResults
 * - Guarda historial de búsqueda para usuarios autenticados
 */

import logger from '../utils/logger.js';
import pluginRegistry from '../services/plugins/index.js';
import { mergeResults } from '../utils/mergeResults.js';
import { insert } from '../db/database.js';
import { sendErrorResponse } from '../utils/errors.js';
import { validate, searchQuerySchema } from '../utils/validation.js';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

/**
 * Parsea y valida los parámetros de paginación.
 * @param {{ page?: string, limit?: string }} query
 * @returns {{ page: number, limit: number }}
 */
function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit) || DEFAULT_LIMIT));
  return { page, limit };
}

/**
 * ENDPOINT: BÚSQUEDA MULTIFUENTE
 *
 * GET /api/search?q=<query>&page=1&limit=10&sources=deezer,youtube
 *
 * RESPUESTA EXITOSA (200): { tracks, count, pagination, sources }
 * RESPUESTA PARCIAL (206): Igual pero con warnings si alguna fuente falló
 */
export const searchController = async (req, res) => {
  try {
    const { q: query } = validate(searchQuerySchema, { q: req.query.q });

    const { page, limit } = parsePagination(req.query);

    const availablePlugins = pluginRegistry.getAvailable();

    if (availablePlugins.length === 0) {
      return res.status(503).json({
        error: 'No search plugins are available',
        details: 'All search services are disabled due to missing configuration',
      });
    }

    let sources = null;
    if (req.query.sources) {
      sources = req.query.sources
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }

    const { results, errors } = await pluginRegistry.searchAll(query, {
      limit,
      page,
      plugins: sources,
    });

    const searchedPlugins = sources
      ? availablePlugins.filter((p) => sources.includes(p.name))
      : availablePlugins;

    if (searchedPlugins.length === 0) {
      return res.status(400).json({
        error: 'No enabled plugins match the request',
        details:
          'The requested sources are not available. Check /api/plugins for available sources.',
      });
    }

    if (errors.length === searchedPlugins.length && Object.keys(results).length === 0) {
      return res.status(502).json({
        error: 'All search services failed',
        details: Object.fromEntries(errors.map((e) => [e.service.toLowerCase(), e.message])),
      });
    }

    const finalResults = mergeResults(results);

    if (req.user) {
      try {
        await insert('search_history', {
          user_id: req.user.userId,
          query: query.trim(),
          results_count: finalResults.length,
        });
      } catch (dbError) {
        logger.warn('No se pudo guardar historial de búsqueda', {
          error: dbError.message,
        });
      }
    }

    const warnings = errors.map((e) => `${e.service} unavailable: ${e.message}`);

    const response = {
      tracks: finalResults,
      count: finalResults.length,
      pagination: { page, limit },
      sources: Object.fromEntries(
        searchedPlugins.map((p) => [p.name, results[p.name]?.length ?? 0]),
      ),
    };

    if (warnings.length > 0) {
      response.warnings = warnings;
    }

    const statusCode = warnings.length > 0 ? 206 : 200;
    return res.status(statusCode).json(response);
  } catch (error) {
    logger.error('Error inesperado en búsqueda', { error: error.message });
    return sendErrorResponse(res, error);
  }
};
