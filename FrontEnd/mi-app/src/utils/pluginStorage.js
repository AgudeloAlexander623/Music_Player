const PLUGINS_STORAGE_KEY = 'reproductor_plugins_enabled';

const DEFAULT_EXCLUDED = ['musicbrainz'];

const ALWAYS_ENABLED = ['fma'];

export function getEnabledPlugins(availablePlugins) {
  try {
    const stored = localStorage.getItem(PLUGINS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        const merged = [...new Set([...parsed, ...ALWAYS_ENABLED])];
        return merged;
      }
    }
  } catch {
    /* ignore */
  }

  const defaults = availablePlugins
    .filter((p) => p.configured && !DEFAULT_EXCLUDED.includes(p.name))
    .map((p) => p.name);

  return [...new Set([...defaults, ...ALWAYS_ENABLED])];
}

export function saveEnabledPlugins(names) {
  const merged = [...new Set([...names, ...ALWAYS_ENABLED])];
  localStorage.setItem(PLUGINS_STORAGE_KEY, JSON.stringify(merged));
}

export function getAllEnabled() {
  try {
    const stored = localStorage.getItem(PLUGINS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        const merged = [...new Set([...parsed, ...ALWAYS_ENABLED])];
        return merged;
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}
