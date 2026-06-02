import logger from '../utils/logger.js';
import pluginRegistry from '../services/plugins/index.js';
import { mergeResults } from '../utils/mergeResults.js';
import { insert } from '../db/database.js';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

export const searchController = async (req, res) => {
  try {
    const query = req.query.q;

    if (!query) {
      return res.status(400).json({
        error: "Query required",
        details: "The 'q' parameter is mandatory",
      });
    }

    if (query.trim().length < 2) {
      return res.status(400).json({
        error: "Query too short",
        details: "Query must be at least 2 characters long",
      });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(req.query.limit) || DEFAULT_LIMIT)
    );

    const { results, errors } = await pluginRegistry.searchAll(query, { limit, page });

    const availablePlugins = pluginRegistry.getAvailable();

    if (availablePlugins.length === 0) {
      return res.status(500).json({
        error: "No search plugins are available",
        details: "All search services are disabled due to missing configuration",
      });
    }

    if (errors.length === availablePlugins.length) {
      return res.status(500).json({
        error: "All search services failed",
        details: Object.fromEntries(
          errors.map((e) => [e.service.toLowerCase(), e.message])
        ),
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
      } catch (error) {
        logger.warn('No se pudo guardar historial de búsqueda', { error: error.message });
      }
    }

    const warnings = errors.map((e) => `${e.service} unavailable: ${e.message}`);

    const response = {
      tracks: finalResults,
      count: finalResults.length,
      pagination: {
        page,
        limit,
      },
      sources: Object.fromEntries(
        availablePlugins.map((p) => [p.name, results[p.name]?.length ?? 0])
      ),
    };

    if (warnings.length > 0) {
      response.warnings = warnings;
    }

    const statusCode = warnings.length > 0 ? 206 : 200;
    return res.status(statusCode).json(response);
  } catch (error) {
    logger.error('Error inesperado en búsqueda', { error: error.message });
    return res.status(500).json({
      error: "Unexpected error during search",
      details: error.message,
    });
  }
};
