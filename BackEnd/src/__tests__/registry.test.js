import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import PluginRegistry from '../services/plugins/registry.js';

function makePlugin(name, opts = {}) {
  return {
    name,
    search: opts.search || (async () => []),
    isAvailable: opts.isAvailable,
    requiredEnv: opts.requiredEnv,
    description: opts.description || '',
  };
}

describe('PluginRegistry', () => {
  /** @type {PluginRegistry} */
  let registry;

  beforeEach(() => {
    registry = new PluginRegistry();
  });

  describe('register / get', () => {
    it('registra y recupera un plugin por nombre', () => {
      const plugin = makePlugin('test');
      registry.register(plugin);
      assert.equal(registry.get('test'), plugin);
    });

    it('retorna undefined para plugin no registrado', () => {
      assert.equal(registry.get('nonexistent'), undefined);
    });
  });

  describe('registro múltiple', () => {
    it('registra varios plugins y los lista todos', () => {
      registry.register(makePlugin('a'));
      registry.register(makePlugin('b', { description: 'Plugin B' }));

      const all = registry.getAll();
      assert.equal(all.length, 2);
      const names = all.map((p) => p.name).sort();
      assert.deepStrictEqual(names, ['a', 'b']);
    });
  });

  describe('_isAvailable', () => {
    it('usa override si existe', () => {
      const plugin = makePlugin('mode', { isAvailable: () => true });
      registry.register(plugin);
      registry.setOverride('mode', false);
      assert.equal(registry.isAvailable('mode'), false);
    });

    it('usa isAvailable si no hay override', () => {
      const plugin = makePlugin('mode', { isAvailable: () => false });
      registry.register(plugin);
      assert.equal(registry.isAvailable('mode'), false);
    });

    it('usa requiredEnv si no hay isAvailable', () => {
      const key = 'TEST_PLUGIN_KEY_A';
      process.env[key] = 'some_value';
      const plugin = makePlugin('envcheck', { requiredEnv: [key] });
      registry.register(plugin);
      assert.equal(registry.isAvailable('envcheck'), true);
      delete process.env[key];
    });

    it('retorna false si requiredEnv no está configurado', () => {
      const plugin = makePlugin('envfail', { requiredEnv: ['MISSING_VAR_XYZ'] });
      registry.register(plugin);
      assert.equal(registry.isAvailable('envfail'), false);
    });

    it('retorna true por defecto', () => {
      const plugin = makePlugin('default');
      registry.register(plugin);
      assert.equal(registry.isAvailable('default'), true);
    });

    it('retorna false para plugin no registrado', () => {
      assert.equal(registry.isAvailable('nonexistent'), false);
    });
  });

  describe('getAvailable', () => {
    it('retorna solo plugins disponibles', () => {
      registry.register(makePlugin('a', { isAvailable: () => true }));
      registry.register(makePlugin('b', { isAvailable: () => false }));
      registry.register(makePlugin('c', { isAvailable: () => true }));

      const avail = registry.getAvailable();
      assert.equal(avail.length, 2);
      assert(avail.every((p) => p.name !== 'b'));
    });
  });

  describe('setOverride / clearOverride', () => {
    it('setOverride retorna false si el plugin no existe', () => {
      assert.equal(registry.setOverride('ghost', true), false);
    });

    it('clearOverride no lanza si no hay override', () => {
      registry.clearOverride('ghost');
    });

    it('clearOverride revierte al estado natural', () => {
      const plugin = makePlugin('toggle', { isAvailable: () => true });
      registry.register(plugin);
      registry.setOverride('toggle', false);
      assert.equal(registry.isAvailable('toggle'), false);

      registry.clearOverride('toggle');
      assert.equal(registry.isAvailable('toggle'), true);
    });
  });

  describe('searchAll', () => {
    it('retorna resultados vacios si no hay plugins disponibles', async () => {
      registry.register(makePlugin('off', { isAvailable: () => false }));
      const { results, errors } = await registry.searchAll('test');
      assert.deepStrictEqual(results, {});
      assert.deepStrictEqual(errors, []);
    });

    it('filtra por options.plugins si se especifica', async () => {
      registry.register(makePlugin('a', { isAvailable: () => true }));
      registry.register(makePlugin('b', { isAvailable: () => true }));
      const { results } = await registry.searchAll('test', { plugins: ['a'] });
      assert('a' in results);
      assert(!('b' in results));
    });

    it('recolecta errores sin colapsar', async () => {
      const fail = makePlugin('fail', {
        isAvailable: () => true,
        search: async () => { throw new Error('exploded'); },
      });
      registry.register(fail);
      registry.register(makePlugin('ok', { isAvailable: () => true }));

      const { results, errors } = await registry.searchAll('test');
      assert(errors.length >= 1);
      assert.equal(errors[0].service, 'fail');
      assert('ok' in results);
    });
  });
});
