import { describe, it, after, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import { searchSpotify, _resetForTest } from "../services/spotify.services.js";

const ORIGINAL_ENV = { ...process.env };

describe("Spotify Service", () => {
  after(() => {
    Object.assign(process.env, ORIGINAL_ENV);
  });

  beforeEach(() => {
    mock.restoreAll();
    _resetForTest();
    process.env.SPOTIFY_CLIENT_ID = "test-client-id";
    process.env.SPOTIFY_CLIENT_SECRET = "test-client-secret";
  });

  describe("getToken (internal)", () => {
    it("obtiene token exitosamente y lo cachea", async () => {
      mock.method(axios, "post", () =>
        Promise.resolve({
          data: { access_token: "tok_abc123", expires_in: 3600 },
        })
      );

      mock.method(axios, "get", () =>
        Promise.resolve({ data: { tracks: { items: [] } } })
      );

      await searchSpotify("test");
      assert.equal(axios.post.mock.calls.length, 1);

      await searchSpotify("test2");
      assert.equal(axios.post.mock.calls.length, 1, "should reuse cached token");
    });

    it("renueva token cuando expira", async () => {
      let callIndex = 0;
      mock.method(axios, "post", () => {
        callIndex++;
        if (callIndex === 1) {
          return Promise.resolve({ data: { access_token: "tok_1", expires_in: 0 } });
        }
        return Promise.resolve({ data: { access_token: "tok_2", expires_in: 3600 } });
      });

      mock.method(axios, "get", () =>
        Promise.resolve({ data: { tracks: { items: [] } } })
      );

      await searchSpotify("test");
      await searchSpotify("test2");
      assert.equal(callIndex, 2);
    });

    it("lanza error si faltan credenciales", async () => {
      delete process.env.SPOTIFY_CLIENT_ID;
      delete process.env.SPOTIFY_CLIENT_SECRET;

      await assert.rejects(
        () => searchSpotify("test"),
        (err) => {
          assert.equal(err.name, "SpotifyServiceError");
          assert.equal(err.statusCode, 400);
          assert.equal(err.retryable, false);
          return true;
        }
      );
    });

    it("lanza error si la API de auth falla (401)", async () => {
      mock.method(axios, "post", () =>
        Promise.reject({
          response: { status: 401, statusText: "Unauthorized" },
        })
      );

      await assert.rejects(
        () => searchSpotify("test"),
        (err) => {
          assert.equal(err.statusCode, 401);
          return true;
        }
      );
    });

    it("lanza timeout si auth no responde", async () => {
      mock.method(axios, "post", () =>
        Promise.reject({ code: "ECONNABORTED" })
      );

      await assert.rejects(
        () => searchSpotify("test"),
        (err) => {
          assert.equal(err.statusCode, 408);
          assert.equal(err.retryable, true);
          return true;
        }
      );
    });

    it("previene race condition: llamadas concurrentes hacen 1 solo auth", async () => {
      let authCalls = 0;

      mock.method(axios, "post", () =>
        new Promise((resolve) =>
          setImmediate(() => {
            authCalls++;
            resolve({
              data: { access_token: "tok_race", expires_in: 3600 },
            });
          })
        )
      );

      mock.method(axios, "get", () =>
        Promise.resolve({ data: { tracks: { items: [] } } })
      );

      await Promise.all([searchSpotify("a"), searchSpotify("b"), searchSpotify("c")]);
      assert.equal(authCalls, 1, "should call auth only once");
    });
  });

  describe("searchSpotify", () => {
    function mockTrack(overrides = {}) {
      return {
        id: "spot_track_1",
        name: "Bohemian Rhapsody",
        artists: [{ name: "Queen" }],
        album: {
          name: "A Night at the Opera",
          images: [{ url: "https://example.com/cover.jpg" }],
        },
        preview_url: "https://p.scdn.co/mp3-preview/test",
        duration_ms: 354000,
        ...overrides,
      };
    }

    it("retorna resultados normalizados", async () => {
      mock.method(axios, "post", () =>
        Promise.resolve({
          data: { access_token: "tok_search", expires_in: 3600 },
        })
      );

      mock.method(axios, "get", () =>
        Promise.resolve({
          data: { tracks: { items: [mockTrack()] } },
        })
      );

      const result = await searchSpotify("queen");
      assert.equal(result.length, 1);
      assert.equal(result[0].id, "spot_track_1");
      assert.equal(result[0].name, "Bohemian Rhapsody");
      assert.equal(result[0].artist, "Queen");
      assert.equal(result[0].album, "A Night at the Opera");
      assert.equal(result[0].albumImage, "https://example.com/cover.jpg");
      assert.equal(result[0].previewUrl, "https://p.scdn.co/mp3-preview/test");
      assert.equal(result[0].duration, 354);
      assert.equal(result[0].source, "spotify");
    });

    it("retorna array vacio si no hay tracks", async () => {
      mock.method(axios, "post", () =>
        Promise.resolve({
          data: { access_token: "tok_empty", expires_in: 3600 },
        })
      );

      mock.method(axios, "get", () =>
        Promise.resolve({ data: { tracks: { items: [] } } })
      );

      assert.deepEqual(await searchSpotify("nonexistent"), []);
    });

    it("retorna array vacio si tracks es undefined", async () => {
      mock.method(axios, "post", () =>
        Promise.resolve({
          data: { access_token: "tok_empty2", expires_in: 3600 },
        })
      );

      mock.method(axios, "get", () => Promise.resolve({ data: {} }));

      assert.deepEqual(await searchSpotify("crash"), []);
    });

    it("maneja campos faltantes gracefulmente", async () => {
      mock.method(axios, "post", () =>
        Promise.resolve({
          data: { access_token: "tok_partial", expires_in: 3600 },
        })
      );

      mock.method(axios, "get", () =>
        Promise.resolve({
          data: {
            tracks: {
              items: [
                {
                  id: "partial_1",
                  name: "Unknown",
                  artists: undefined,
                  album: undefined,
                  preview_url: undefined,
                  duration_ms: undefined,
                },
              ],
            },
          },
        })
      );

      const result = await searchSpotify("partial");
      assert.equal(result.length, 1);
      assert.equal(result[0].artist, "");
      assert.equal(result[0].album, "");
      assert.equal(result[0].albumImage, "");
      assert.equal(result[0].previewUrl, null);
      assert.equal(result[0].duration, null);
    });

    it("incluye duracion en segundos", async () => {
      mock.method(axios, "post", () =>
        Promise.resolve({
          data: { access_token: "tok_dur", expires_in: 3600 },
        })
      );

      mock.method(axios, "get", () =>
        Promise.resolve({
          data: {
            tracks: {
              items: [
                mockTrack({ duration_ms: 200000 }),
                mockTrack({ id: "t2", duration_ms: 0 }),
                mockTrack({ id: "t3", duration_ms: undefined }),
              ],
            },
          },
        })
      );

      const result = await searchSpotify("duration");
      assert.equal(result[0].duration, 200);
      assert.equal(result[1].duration, 0);
      assert.equal(result[2].duration, null);
    });

    it("usa offset correcto segun page", async () => {
      mock.method(axios, "post", () =>
        Promise.resolve({
          data: { access_token: "tok_page", expires_in: 3600 },
        })
      );

      mock.method(axios, "get", () =>
        Promise.resolve({ data: { tracks: { items: [] } } })
      );

      await searchSpotify("paged", 10, 3);
      const params = axios.get.mock.calls[0].arguments[1].params;
      assert.equal(params.offset, 20);
    });

    it("reintenta en error 429", async () => {
      mock.method(axios, "post", () =>
        Promise.resolve({
          data: { access_token: "tok_retry", expires_in: 3600 },
        })
      );

      let callIndex = 0;
      mock.method(axios, "get", () => {
        callIndex++;
        if (callIndex === 1) {
          return Promise.reject({ response: { status: 429, statusText: "Too Many Requests" } });
        }
        return Promise.resolve({
          data: { tracks: { items: [mockTrack()] } },
        });
      });

      const result = await searchSpotify("retry");
      assert.equal(result.length, 1);
      assert.equal(callIndex, 2);
    });

    it("reintenta en error 5xx", async () => {
      mock.method(axios, "post", () =>
        Promise.resolve({
          data: { access_token: "tok_5xx", expires_in: 3600 },
        })
      );

      let callIndex = 0;
      mock.method(axios, "get", () => {
        callIndex++;
        if (callIndex === 1) {
          return Promise.reject({ response: { status: 503, statusText: "Service Unavailable" } });
        }
        return Promise.resolve({
          data: { tracks: { items: [mockTrack()] } },
        });
      });

      const result = await searchSpotify("service-down");
      assert.equal(result.length, 1);
      assert.equal(callIndex, 2);
    });

    it("lanza error en 4xx no recuperable (400)", async () => {
      mock.method(axios, "post", () =>
        Promise.resolve({
          data: { access_token: "tok_4xx", expires_in: 3600 },
        })
      );

      mock.method(axios, "get", () =>
        Promise.reject({ response: { status: 400, statusText: "Bad Request" } })
      );

      await assert.rejects(
        () => searchSpotify("bad-query"),
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.equal(err.retryable, false);
          return true;
        }
      );
    });

    it("lanza timeout si search no responde", async () => {
      mock.method(axios, "post", () =>
        Promise.resolve({
          data: { access_token: "tok_timeout", expires_in: 3600 },
        })
      );

      mock.method(axios, "get", () =>
        Promise.reject({ code: "ECONNABORTED" })
      );

      await assert.rejects(
        () => searchSpotify("timeout"),
        (err) => {
          assert.equal(err.statusCode, 408);
          assert.equal(err.retryable, true);
          return true;
        }
      );
    });
  });
});
