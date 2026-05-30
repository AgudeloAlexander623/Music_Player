const normalize = (value) => (value ?? "").trim().toLowerCase();

export function mergeResults(...sources) {
  const results = [];
  const seenIds = new Set();

  const addIfNotDuplicate = (track) => {
    const key = `${track.source}-${track.id}`;
    if (!seenIds.has(key)) {
      seenIds.add(key);
      results.push(track);
    }
  };

  const [spotify = [], musicbrainz = [], fma = [], youtube = [], deezer = [], youtubeMusic = []] = sources;

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
  youtube.forEach(addIfNotDuplicate);
  deezer.forEach(addIfNotDuplicate);
  youtubeMusic.forEach(addIfNotDuplicate);

  return results;
}
