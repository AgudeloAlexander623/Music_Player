import express from 'express';
import pluginRegistry from '../services/plugins/index.js';

const router = express.Router();

router.get('/', (_req, res) => {
  const plugins = pluginRegistry.getAll();
  res.json({ plugins });
});

router.post('/activate', (req, res) => {
  const { pluginName } = req.body;
  const plugin = pluginRegistry.get(pluginName);
  if (plugin) {
    plugin.active = () => true;
    res.json({ success: true, message: `Plugin ${pluginName} activado` });
  } else {
    res.status(404).json({ success: false, message: `Plugin ${pluginName} no encontrado` });
  }
});

router.post('/deactivate', (req, res) => {
  const { pluginName } = req.body;
  const plugin = pluginRegistry.get(pluginName);
  if (plugin) {
    plugin.active = () => false;
    res.json({ success: true, message: `Plugin ${pluginName} desactivado` });
  } else {
    res.status(404).json({ success: false, message: `Plugin ${pluginName} no encontrado` });
  }
});

export default router;

