export function mergeResults(spotify, musicbrainz) {
  const results = [];

  // Primero, agregar resultados de Spotify con matches de MusicBrainz
  spotify.forEach((sp) => {
    const match = musicbrainz.find(
      (mb) =>
        mb.title.toLowerCase() === sp.title.toLowerCase() &&
        mb.artist.toLowerCase() === sp.artist.toLowerCase()
    );
    results.push({
      ...sp,
      musicbrainzId: match ? match.id : null,
    });
  });

  // Opcional: agregar resultados únicos de MusicBrainz que no coincidan
  musicbrainz.forEach((mb) => {
    const alreadyIncluded = results.some(
      (r) => r.musicbrainzId === mb.id
    );
    if (!alreadyIncluded) {
      results.push({
        id: mb.id,
        title: mb.title,
        artist: mb.artist,
        album: '',
        image: '',
        preview: null,
        source: 'musicbrainz',
        musicbrainzId: mb.id,
      });
    }
  });

  return results;
}