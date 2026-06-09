/**
 * PLUGINS ROUTE
 *
 * Expone el estado de todos los plugins registrados para que
 * el frontend pueda mostrar checkboxes de activación/desactivación
 * basados en qué servicios están realmente configurados.
 */

import express from 'express';
import pluginRegistry from '../services/plugins/index.js';

const router = express.Router();

router.get('/', (_req, res) => {
  const plugins = pluginRegistry.getAll();
  res.json({ plugins });
});

export default router;
