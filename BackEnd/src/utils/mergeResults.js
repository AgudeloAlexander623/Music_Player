export function mergeResults(spotify,musicbrainz){
    const results = [];

    spotify.forEach(sp => {
        const match = musicbrainz.find(
            mb => mb.title.toLowerCase() === sp.title.toLowerCase() &&
            mb.artist.toLowerCase() === sp.artist.toLowerCase()
        );
        results.push({
            ...sp,
            musicbrainzId: match ? match.id : null,
        });
    });
    return results;
}