import logger from '../../utils/logger.js';

export default class PluginRegistry {
  constructor() {
    this._plugins = new Map();
  }

  register(plugin) {
    const available =
      !plugin.requiredEnv ||
      plugin.requiredEnv.length === 0 ||
      plugin.requiredEnv.every((k) => process.env[k]);

    this._plugins.set(plugin.name, available ? plugin : null);

    if (available) {
      logger.info(`Plugin registrado: ${plugin.name}`);
    } else {
      logger.warn(`Plugin deshabilitado: ${plugin.name} (faltan env vars)`);
    }
  }

  getAvailable() {
    return [...this._plugins.values()].filter(Boolean);
  }

  isAvailable(name) {
    return this._plugins.get(name) != null;
  }

  async searchAll(query, options = {}) {
    const results = {};
    const errors = [];

    for (const plugin of this.getAvailable()) {
      try {
        results[plugin.name] = await plugin.search(query, options);
      } catch (err) {
        errors.push({ service: plugin.name, message: err.message });
        results[plugin.name] = [];
        logger.error(`Error en plugin ${plugin.name}`, { error: err.message });
      }
    }

    return { results, errors };
  }
}
