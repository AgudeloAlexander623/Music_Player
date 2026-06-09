import logger from '../../utils/logger.js';

export default class PluginRegistry {
  constructor() {
    this._plugins = new Map();
  }

  /**
   * Registra un plugin en el sistema.
   *
   * La disponibilidad se determina así:
   * 1. Si el plugin define un método isAvailable(), se usa ese.
   * 2. Si no, se verifica que todas las variables en requiredEnv
   *    estén definidas y no sean valores placeholder (your_*).
   */
  register(plugin) {
    let available;

    if (typeof plugin.isAvailable === 'function') {
      available = plugin.isAvailable();
    } else if (plugin.requiredEnv && plugin.requiredEnv.length > 0) {
      available = plugin.requiredEnv.every(
        (k) => process.env[k] && !process.env[k].startsWith('your_')
      );
    } else {
      available = true;
    }

    this._plugins.set(plugin.name, available ? plugin : null);

    if (available) {
      logger.info(`Plugin registrado: ${plugin.name}`);
    } else {
      logger.warn(`Plugin deshabilitado: ${plugin.name} (faltan env vars o configuración inválida)`);
    }
  }

  /**
   * Retorna todos los plugins (disponibles y no disponibles)
   * con su estado de disponibilidad.
   */
  getAll() {
    return [...this._plugins.entries()].map(([name, plugin]) => ({
      name,
      configured: plugin != null,
      description: plugin?.description ?? '',
    }));
  }

  getAvailable() {
    return [...this._plugins.values()].filter(Boolean);
  }

  isAvailable(name) {
    return this._plugins.get(name) != null;
  }

  /**
   * Ejecuta la búsqueda en todos los plugins disponibles (o los indicados en
   * options.plugins) de forma concurrente para evitar que servicios lentos
   * (p. ej. MusicBrainz con su rate-limit de 1.1s) bloqueen al resto.
   */
  async searchAll(query, options = {}) {
    const results = {};
    const errors = [];

    let plugins = this.getAvailable();

    if (Array.isArray(options.plugins) && options.plugins.length > 0) {
      plugins = plugins.filter((p) => options.plugins.includes(p.name));
    }

    if (plugins.length === 0) {
      return { results, errors };
    }

    const tasks = plugins.map(async (plugin) => {
      try {
        const data = await plugin.search(query, options);
        return { name: plugin.name, data, error: null };
      } catch (err) {
        logger.error(`Error en plugin ${plugin.name}`, { error: err.message });
        return { name: plugin.name, data: [], error: { service: plugin.name, message: err.message } };
      }
    });

    const settled = await Promise.all(tasks);

    for (const { name, data, error } of settled) {
      results[name] = data;
      if (error) errors.push(error);
    }

    return { results, errors };
  }
}
