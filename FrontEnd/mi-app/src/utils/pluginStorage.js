const PLUGINS_STORAGE_KEY = 'reproductor_plugins_enabled';

const DEFAULT_EXCLUDED = ['musicbrainz'];

export function getEnabledPlugins(availablePlugins) {
  try {
    const stored = localStorage.getItem(PLUGINS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    /* ignore */
  }

  return availablePlugins
    .filter((p) => p.configured && !DEFAULT_EXCLUDED.includes(p.name))
    .map((p) => p.name);
}

export function saveEnabledPlugins(names) {
  localStorage.setItem(PLUGINS_STORAGE_KEY, JSON.stringify(names));
}

export function getAllEnabled() {
  try {
    const stored = localStorage.getItem(PLUGINS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}
