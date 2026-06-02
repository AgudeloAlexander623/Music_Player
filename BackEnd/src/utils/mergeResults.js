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

// agregaremos las que permitan implementar Youtube Music y Youtube, 
// que no tienen un ID común con las otras fuentes, pero sí entre ellas. 
// La idea es que si una canción aparece en ambas, 
// se considere la misma canción, aunque no tenga 
// un ID común con Spotify o MusicBrainz. Para esto, 
// usaremos el ID de YouTube como clave para evitar duplicados entre YouTube y YouTube Music, 
// pero permitiremos que estas canciones se mezclen con las de Spotify y MusicBrainz sin forzar 
// una coincidencia exacta de nombre/artista.
export function mergeYouTubeResults(youtubeResults, youtubeMusicResults) {
  const results = [];
  const seenYouTubeIds = new Set();

  youtubeResults.forEach((yt) => {
    seenYouTubeIds.add(yt.videoId);
    results.push(yt);
  });

  youtubeMusicResults.forEach((ytm) => {
    if (!seenYouTubeIds.has(ytm.videoId)) {
      results.push(ytm);
    }
    seenYouTubeIds.add(ytm.videoId);

    while (results.length > 20){
      results.pop();
    }
    // Si el resultado de YouTube Music es el mismo que el de YouTube, 
    // se considerará la misma canción, pero se mantendrá la información 
    // de ambas fuentes. Esto permite que si una canción aparece en ambas, 
    // se muestre como una sola entrada, 
    // pero con la información combinada de YouTube y YouTube Music.

  });
  return results;
}

// exportamos deezer para que pueda ser usado en el servicio de búsqueda,
// aunque no se mezcle con las otras fuentes, ya que no tiene un ID común con ellas.
export function mergeDeezerResults(deezerResults){
  const results = [];
  const seenDeezerIds = new Set();

  deezerResults.forEach((dz) =>{
    if (seenDeezerIds.has(dz.id)){
      return;
    }

    seenDeezerIds.add(dz.id);
    results.push(dz);

    while (results.length > 20){
      results.pop();
    }
    
  });
}