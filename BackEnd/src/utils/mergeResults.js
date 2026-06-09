/**
 * MERGE RESULTS — Fusiona resultados de múltiples fuentes
 *
 * Centraliza la deduplicación y fusión de resultados de búsqueda
 * de todos los plugins registrados.
 *
 * ESTRATEGIA:
 *   - Deduplicación por clave compuesta source-id
 *   - YouTube y YouTube Music comparten {videoId} como clave de
 *     deduplicación entre sí
 *   - Los resultados se ordenan priorizando fuentes con audio
 *     reproducible sobre fuentes de solo metadatos
 *   - Orden de fusión: Deezer → FMA → YouTube → YouTube Music
 *     → Internet Archive → MusicBrainz
 */

const normalize = (value) => (value ?? "").trim().toLowerCase();

export function mergeResults(sources = {}) {
  const results = [];
  const seenIds = new Set();

  const addIfNotDuplicate = (track) => {
    const key = `${track.source}-${track.id}`;
    if (!seenIds.has(key)) {
      seenIds.add(key);
      results.push(track);
    }
  };

  const {
    deezer = [],
    fma = [],
    youtube = [],
    youtubeMusic = [],
    internetarchive = [],
    spotify = [],
    musicbrainz = [],
  } = sources;

  /* ── Fuentes con audio reproducible ── */

  deezer.forEach(addIfNotDuplicate);

  fma.forEach(addIfNotDuplicate);

  const seenYouTubeIds = new Set();

  youtube.forEach((yt) => {
    if (yt.videoId) {
      if (seenYouTubeIds.has(yt.videoId)) return;
      seenYouTubeIds.add(yt.videoId);
    }
    addIfNotDuplicate(yt);
  });

  youtubeMusic.forEach((ytm) => {
    if (ytm.videoId) {
      if (seenYouTubeIds.has(ytm.videoId)) return;
      seenYouTubeIds.add(ytm.videoId);
    }
    addIfNotDuplicate(ytm);
  });

  internetarchive.forEach(addIfNotDuplicate);

  /* ── Spotify (deshabilitado, se deja por compatibilidad) ── */
  spotify.forEach(addIfNotDuplicate);

  /* ── Fuentes de solo metadatos ── */
  musicbrainz.forEach((mb) => {
    const alreadyIncluded = results.some(
      (r) =>
        normalize(r.name) === normalize(mb.name) &&
        normalize(r.artist) === normalize(mb.artist) &&
        r.musicbrainzId === mb.id
    );
    if (!alreadyIncluded) {
      addIfNotDuplicate({
        id: mb.id,
        name: mb.name,
        artist: mb.artist,
        album: mb.album ?? "",
        albumImage: mb.albumImage ?? "",
        previewUrl: mb.previewUrl ?? null,
        source: "musicbrainz",
        musicbrainzId: mb.id,
      });
    }
  });

  return results;
}
