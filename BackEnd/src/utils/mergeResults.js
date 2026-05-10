export function mergeResults(spotify, musicbrainz) {
  const results = [];

  // Primero, agregar resultados de Spotify con matches de MusicBrainz
  spotify.forEach((sp) => {
    const match = musicbrainz.find(
      (mb) =>
        mb.name.toLowerCase() === sp.name.toLowerCase() &&
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
        name: mb.name,
        artist: mb.artist,
        album: '',
        albumImage: '',
        previewUrl: null,
        source: 'musicbrainz',
        musicbrainzId: mb.id,
      });
    }
  });

  return results;
}