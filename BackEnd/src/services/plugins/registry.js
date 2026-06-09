import logger from '../../utils/logger.js';

export default class PluginRegistry {
  constructor() {
    this._plugins = new Map();
  }

  /**
   * Almacena un plugin en el registro. NOTA: no evalúa disponibilidad
   * hasta que se consulta, porque al momento del registro las variables
   * de entorno pueden no haberse cargado aún (ver app.js → dotenv).
   */
  register(plugin) {
    this._plugins.set(plugin.name, plugin);
    logger.info(`Plugin registrado: ${plugin.name}`);
  }

  /**
   * Determina si un plugin está disponible según sus requerimientos.
   */
  _isAvailable(plugin) {
    if (typeof plugin.isAvailable === 'function') {
      return plugin.isAvailable();
    }
    if (plugin.requiredEnv && plugin.requiredEnv.length > 0) {
      return plugin.requiredEnv.every(
        (k) => process.env[k] && !process.env[k].startsWith('your_')
      );
    }
    return true;
  }

  /**
   * Retorna todos los plugins registrados con su estado de disponibilidad.
   */
  getAll() {
    return [...this._plugins.entries()].map(([name, plugin]) => ({
      name,
      configured: this._isAvailable(plugin),
      description: plugin?.description ?? '',
    }));
  }

  /**
   * Retorna solo los plugins que están disponibles en este momento.
   */
  getAvailable() {
    return [...this._plugins.values()].filter((p) => this._isAvailable(p));
  }

  isAvailable(name) {
    const plugin = this._plugins.get(name);
    return plugin ? this._isAvailable(plugin) : false;
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
