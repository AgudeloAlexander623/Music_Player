export function mergeResults(spotify, musicbrainz, fma = []) {
  const results = [];
  const seenIds = new Set();

  spotify.forEach((sp) => {
    const match = musicbrainz.find(
      (mb) =>
        mb.name.toLowerCase() === sp.name.toLowerCase() &&
        mb.artist.toLowerCase() === sp.artist.toLowerCase()
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
