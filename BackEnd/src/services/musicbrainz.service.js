import axios from 'axios';
 
export async function searchMusicBrainz(query) {
    const res = await axios.get(
        `https://musicbrainz.org/ws/2/recording/?query=${query}&fmt=json&limit=10`
    );
    return res.data.recordings.map(track => ({
        id: track.id,
        title: track.title,
        artist: track["artist-credit"]?.[0]?.name || "Unknown",
        source: "musicbrainz",
    }));
}