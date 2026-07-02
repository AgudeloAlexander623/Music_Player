/**
 * PLUGIN REGISTRY
 *
 * Registro central de plugins de búsqueda.
 * Cada plugin se identifica por su nombre único y expone:
 *   - search(query, options): Promise<array>
 *   - isAvailable(): boolean (opcional)
 *   - requiredEnv: string[] (opcional)
 *
 * El registry también soporta sobre-escritura manual de estado
 * desde los endpoints /api/plugins/activate y /deactivate.
 */

import logger from '../../utils/logger.js';

export default class PluginRegistry {
  constructor() {
    /** @type {Map<string, object>} */
    this._plugins = new Map();
    /** @type {Map<string, boolean>} Sobreescritura manual de activación */
    this._overrides = new Map();
  }

  /**
   * Almacena un plugin en el registro. NOTA: no evalúa disponibilidad
   * hasta que se consulta, porque al momento del registro las variables
   * de entorno pueden no haberse cargado aún (ver app.js → dotenv).
   *
   * @param {object} plugin - { name, search, isAvailable?, requiredEnv?, description? }
   */
  register(plugin) {
    this._plugins.set(plugin.name, plugin);
    logger.info(`Plugin registrado: ${plugin.name}`);
  }

  /**
   * Obtiene un plugin por nombre.
   * @param {string} name
   * @returns {object|undefined}
   */
  get(name) {
    return this._plugins.get(name);
  }

  /**
   * Determina si un plugin está disponible.
   * Primero revisa sobreescrituras manuales, luego el plugin mismo.
   *
   * @param {object} plugin
   * @returns {boolean}
   */
  _isAvailable(plugin) {
    if (this._overrides.has(plugin.name)) {
      return this._overrides.get(plugin.name);
    }

    if (typeof plugin.isAvailable === 'function') {
      return plugin.isAvailable();
    }

    if (plugin.requiredEnv && plugin.requiredEnv.length > 0) {
      return plugin.requiredEnv.every(
        (k) => process.env[k] && !process.env[k].startsWith('your_'),
      );
    }

    return true;
  }

  /**
   * Retorna todos los plugins registrados con su estado de disponibilidad.
   * @returns {Array<{ name: string, configured: boolean, description: string }>}
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
   * @returns {object[]}
   */
  getAvailable() {
    return [...this._plugins.values()].filter((p) => this._isAvailable(p));
  }

  /**
   * Verifica si un plugin específico está disponible.
   * @param {string} name
   * @returns {boolean}
   */
  isAvailable(name) {
    const plugin = this._plugins.get(name);
    return plugin ? this._isAvailable(plugin) : false;
  }

  /**
   * Activa o desactiva un plugin manualmente.
   * @param {string} name
   * @param {boolean} active
   * @returns {boolean} true si el plugin existe
   */
  setOverride(name, active) {
    if (!this._plugins.has(name)) return false;
    this._overrides.set(name, active);
    logger.info(`Plugin ${name} ${active ? 'activado' : 'desactivado'} manualmente`);
    return true;
  }

  /**
   * Elimina la sobreescritura de un plugin, volviendo a su estado natural.
   * @param {string} name
   */
  clearOverride(name) {
    this._overrides.delete(name);
  }

  /**
   * Ejecuta la búsqueda en todos los plugins disponibles (o los indicados en
   * options.plugins) de forma concurrente para evitar que servicios lentos
   * (p. ej. MusicBrainz con su rate-limit de 1.1s) bloqueen al resto.
   *
   * @param {string} query
   * @param {{ limit?: number, page?: number, plugins?: string[] }} options
   * @returns {Promise<{ results: object, errors: Array<{ service: string, message: string }> }>}
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
        return {
          name: plugin.name,
          data: [],
          error: { service: plugin.name, message: err.message },
        };
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
