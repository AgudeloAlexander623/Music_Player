import axios from "axios";

let accessToken = null;

async function getToken(){
    const res = await axios.post(
        "https://accounts.spotify.com/api/token",
        new URLSearchParams({
            grant_type: "cliente_credentials",
        }),
        {
            headers: {
                Authorization:
                    "Basic " +
                    Buffer.from(
                        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
                    ).toString("base64"),
                "Content-Type": "application/x-www-form-urlencoded",
            }
        });
   accessToken = res.data.access_token;
}

export async function searchSoptify(query){
    if (!accessToken) await getToken();

    const res = await axios.get(
        `https://api.spotify.com/v1/search?q=${query}&type=track&limit=10`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            }
        }
    );
    return res.data.tracks.items.map(track => ({
        id: track.id,
        title: track.name,
        artist: track.artists[0].name,
        albun: track.albun.name,
        image: track.albun.images[0]?.url,
        preview: track.preview_url,
        source: "spotify",
    }));
}