/**
 * MERGE RESULTS — Fusiona resultados de múltiples fuentes
 *
 * Este módulo centraliza la lógica de deduplicación y fusión
 * de resultados de búsqueda provenientes de diferentes plugins.
 *
 * ESTRATEGIA DE DEDUPLICACIÓN:
 * - Todos los resultados se deduplican por clave compuesta source-id
 * - YouTube y YouTube Music comparten videoId, por lo que se usa
 *   el videoId como clave de deduplicación entre ellos (el que
 *   tenga el mismo videoId pero distinto source se considera el mismo)
 * - Spotify y MusicBrainz se cruzan por nombre+artista normalizados
 * - FMA, Deezer se deduplican solo por source-id
 *
 * FLUJO:
 * 1. Se reciben los resultados de cada plugin como un objeto
 *    con propiedades nombradas (spotify, musicbrainz, etc.)
 * 2. Se procesan en orden de prioridad: Spotify → MusicBrainz → FMA
 *    → YouTube/YouTube Music (fusionados) → Deezer
 * 3. Se retorna un array plano sin duplicados
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
    spotify = [],
    musicbrainz = [],
    fma = [],
    youtube = [],
    deezer = [],
    youtubeMusic = [],
  } = sources;

  spotify.forEach((sp) => {
    const match = musicbrainz.find(
      (mb) =>
        normalize(mb.name) === normalize(sp.name) &&
        normalize(mb.artist) === normalize(sp.artist)
    );
    addIfNotDuplicate({ ...sp, musicbrainzId: match ? match.id : null });
  });

  musicbrainz.forEach((mb) => {
    const alreadyIncluded = results.some((r) => r.musicbrainzId === mb.id);
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

  deezer.forEach(addIfNotDuplicate);

  return results;
}
