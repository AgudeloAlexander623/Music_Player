import { describe, it, after, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import spotifyPlugin from "../services/plugins/spotify.plugin.js";
import { _resetForTest } from "../services/spotify.services.js";

const ORIGINAL_ENV = { ...process.env };

describe("Plugin de Spotify", () => {
  after(() => {
    Object.assign(process.env, ORIGINAL_ENV);
  });

  beforeEach(() => {
    mock.restoreAll();
    _resetForTest();
  });

  it("expone metadata del plugin", () => {
    assert.equal(spotifyPlugin.name, "spotify");
    assert.equal(typeof spotifyPlugin.description, "string");
    assert.deepEqual(spotifyPlugin.requiredEnv, [
      "SPOTIFY_CLIENT_ID",
      "SPOTIFY_CLIENT_SECRET",
    ]);
  });

  describe("isAvailable", () => {
    it("activo con credenciales validas", () => {
      process.env.SPOTIFY_CLIENT_ID = "cid";
      process.env.SPOTIFY_CLIENT_SECRET = "csec";
      assert.equal(spotifyPlugin.isAvailable(), true);
    });

    it("inactivo sin credenciales", () => {
      delete process.env.SPOTIFY_CLIENT_ID;
      delete process.env.SPOTIFY_CLIENT_SECRET;
      assert.equal(spotifyPlugin.isAvailable(), false);
    });

    it("inactivo con placeholders your_", () => {
      process.env.SPOTIFY_CLIENT_ID = "your_spotify_client_id";
      process.env.SPOTIFY_CLIENT_SECRET = "your_spotify_client_secret";
      assert.equal(spotifyPlugin.isAvailable(), false);
    });
  });

  describe("search", () => {
    function setupAxios(track) {
      mock.method(axios, "post", () =>
        Promise.resolve({ data: { access_token: "tok", expires_in: 3600 } })
      );
      mock.method(axios, "get", () =>
        Promise.resolve({ data: { tracks: { items: track ? [track] : [] } } })
      );
    }

    it("delega en searchSpotify y normaliza resultados", async () => {
      process.env.SPOTIFY_CLIENT_ID = "cid";
      process.env.SPOTIFY_CLIENT_SECRET = "csec";

      setupAxios({
        id: "t1",
        name: "Cancion",
        artists: [{ name: "Artista" }],
        album: { name: "Album", images: [{ url: "img" }] },
        preview_url: "preview",
        duration_ms: 1000,
      });

      const results = await spotifyPlugin.search("consulta");
      assert.equal(results.length, 1);
      assert.equal(results[0].source, "spotify");
      assert.equal(results[0].name, "Cancion");
      assert.equal(results[0].artist, "Artista");
    });

    it("retorna array vacio si no hay resultados", async () => {
      process.env.SPOTIFY_CLIENT_ID = "cid";
      process.env.SPOTIFY_CLIENT_SECRET = "csec";

      setupAxios(null);

      assert.deepEqual(await spotifyPlugin.search("nada"), []);
    });
  });
});