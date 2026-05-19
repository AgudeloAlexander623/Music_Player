/**
 * Fusiona resultados de múltiples fuentes musicales (Spotify, MusicBrainz, FMA).
 *
 * Evita duplicados comparando nombre y artista entre fuentes.
 * Cada resultado recibe un identificador único por fuente para tracking.
 *
 * @param {Array<Object>} spotify - Resultados de Spotify
 * @param {Array<Object>} musicbrainz - Resultados de MusicBrainz
 * @param {Array<Object>} fma - Resultados de Free Music Archive (opcional)
 * @returns {Array<Object>} Lista combinada sin duplicados
 */
export function mergeResults(spotify, musicbrainz, fma = []) {
  const results = [];
  const seenIds = new Set();

  /**
   * Normaliza un string para comparación segura.
   * Convierte a minúsculas y elimina espacios extra.
   *
   * @param {string|undefined} value - Valor a normalizar
   * @returns {string} String normalizado o vacío
   */
  const normalize = (value) => (value ?? "").trim().toLowerCase();

  spotify.forEach((sp) => {
    const match = musicbrainz.find(
      (mb) =>
        normalize(mb.name) === normalize(sp.name) &&
        normalize(mb.artist) === normalize(sp.artist)
    );
    const key = `spotify-${sp.id}`;
    if (!seenIds.has(key)) {
      seenIds.add(key);
      results.push({
        ...sp,
        musicbrainzId: match ? match.id : null,
      });
    }
  });

  musicbrainz.forEach((mb) => {
    const alreadyIncluded = results.some(
      (r) => r.musicbrainzId === mb.id
    );
    if (!alreadyIncluded) {
      const key = `musicbrainz-${mb.id}`;
      if (!seenIds.has(key)) {
        seenIds.add(key);
        results.push({
          id: mb.id,
          name: mb.name,
          artist: mb.artist,
          album: "",
          albumImage: "",
          previewUrl: null,
          source: "musicbrainz",
          musicbrainzId: mb.id,
        });
      }
    }
  });

  fma.forEach((track) => {
    const key = `fma-${track.id}`;
    if (!seenIds.has(key)) {
      seenIds.add(key);
      results.push(track);
    }
  });

  return results;
}
