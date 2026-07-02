/**
 * RUTAS DE PLUGINS
 *
 * Endpoints para consultar y gestionar los plugins de búsqueda:
 * - GET  /api/plugins       - Listar todos los plugins con su estado
 * - POST /api/plugins/activate   - Forzar activación de un plugin
 * - POST /api/plugins/deactivate - Forzar desactivación de un plugin
 */

import express from 'express';
import pluginRegistry from '../services/plugins/index.js';

const router = express.Router();

/**
 * LISTAR PLUGINS
 * GET /api/plugins
 *
 * Retorna todos los plugins registrados con su estado de disponibilidad.
 */
router.get('/', (_req, res) => {
  const plugins = pluginRegistry.getAll();
  res.json({ plugins });
});

/**
 * ACTIVAR PLUGIN
 * POST /api/plugins/activate
 * Body: { pluginName }
 *
 * Fuerza la activación de un plugin, incluso si no cumple
 * los requisitos de entorno.
 */
router.post('/activate', (req, res) => {
  const { pluginName } = req.body;

  if (!pluginName) {
    return res.status(400).json({
      success: false,
      message: 'pluginName is required',
    });
  }

  const exists = pluginRegistry.setOverride(pluginName, true);
  if (exists) {
    res.json({ success: true, message: `Plugin ${pluginName} activado` });
  } else {
    res.status(404).json({
      success: false,
      message: `Plugin ${pluginName} no encontrado`,
    });
  }
});

/**
 * DESACTIVAR PLUGIN
 * POST /api/plugins/deactivate
 * Body: { pluginName }
 *
 * Fuerza la desactivación de un plugin.
 */
router.post('/deactivate', (req, res) => {
  const { pluginName } = req.body;

  if (!pluginName) {
    return res.status(400).json({
      success: false,
      message: 'pluginName is required',
    });
  }

  const exists = pluginRegistry.setOverride(pluginName, false);
  if (exists) {
    res.json({ success: true, message: `Plugin ${pluginName} desactivado` });
  } else {
    res.status(404).json({
      success: false,
      message: `Plugin ${pluginName} no encontrado`,
    });
  }
});

export default router;
