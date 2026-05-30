import express from "express";
import axios from "axios";
import ytmusic from "node-ytmusic-api";

const router = express.Router();

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const SPOTIFY_TOKEN = process.env.SPOTIFY_TOKEN;

/*
 FORMATO ÚNICO:
 {
   id,
   title,
   artist,
   album,
   thumbnail,
   duration,
   source
 }
*/

router.get("/search", async (req, res) => {
  try {
    const query = req.query.q;

    if (!query) {
      return res.status(400).json({
        error: "query requerida"
      });
    }

    const [
      spotifyResults,
      youtubeResults,
      youtubeMusicResults,
      deezerResults
    ] = await Promise.allSettled([

      // SPOTIFY
      axios.get(
        "https://api.spotify.com/v1/search",
        {
          headers: {
            Authorization: `Bearer ${SPOTIFY_TOKEN}`
          },
          params: {
            q: query,
            type: "track",
            limit: 10
          }
        }
      ),

      // YOUTUBE
      axios.get(
        "https://www.googleapis.com/youtube/v3/search",
        {
          params: {
            part: "snippet",
            q: query,
            maxResults: 10,
            type: "video",
            key: YOUTUBE_API_KEY
          }
        }
      ),

      // YOUTUBE MUSIC
      ytmusic.search(query),

      // DEEZER
      axios.get(
        `https://api.deezer.com/search?q=${encodeURIComponent(query)}`
      )
    ]);

    const spotify =
      spotifyResults.status === "fulfilled"
        ? spotifyResults.value.data.tracks.items.map(track => ({
            id: track.id,
            title: track.name,
            artist: track.artists[0]?.name,
            album: track.album.name,
            thumbnail: track.album.images?.[0]?.url,
            duration: track.duration_ms,
            source: "spotify"
          }))
        : [];

    const youtube =
      youtubeResults.status === "fulfilled"
        ? youtubeResults.value.data.items.map(video => ({
            id: video.id.videoId,
            title: video.snippet.title,
            artist: video.snippet.channelTitle,
            album: "",
            thumbnail: video.snippet.thumbnails.high.url,
            duration: null,
            source: "youtube"
          }))
        : [];

    const youtubeMusic =
      youtubeMusicResults.status === "fulfilled"
        ? youtubeMusicResults.value.map(track => ({
            id: track.videoId,
            title: track.name,
            artist: track.artist?.name || "",
            album: track.album?.name || "",
            thumbnail: track.thumbnails?.[0]?.url,
            duration: track.duration || null,
            source: "youtube_music"
          }))
        : [];

    const deezer =
      deezerResults.status === "fulfilled"
        ? deezerResults.value.data.data.map(track => ({
            id: track.id,
            title: track.title,
            artist: track.artist.name,
            album: track.album.title,
            thumbnail: track.album.cover_medium,
            duration: track.duration,
            preview: track.preview,
            source: "deezer"
          }))
        : [];

    const merged = [
      ...spotify,
      ...youtube,
      ...youtubeMusic,
      ...deezer
    ];

    const unique = merged.filter(
      (track, index, self) =>
        index ===
        self.findIndex(
          t =>
            t.title?.toLowerCase() === track.title?.toLowerCase() &&
            t.artist?.toLowerCase() === track.artist?.toLowerCase()
        )
    );

    res.json({
      total: unique.length,
      results: unique
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "error buscando canciones"
    });
  }
});

export default router;