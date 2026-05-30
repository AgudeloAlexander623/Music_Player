import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import { searchMusicBrainz, _resetForTest } from "../services/musicbrainz.service.js";

describe("MusicBrainz Service", () => {
  beforeEach(() => {
    mock.restoreAll();
    _resetForTest();
  });

  function mockRecording(overrides = {}) {
    return {
      id: "mb_rec_001",
      title: "Bohemian Rhapsody",
      "artist-credit": [{ name: "Queen" }],
      releases: [{ id: "mb_rel_001", title: "A Night at the Opera" }],
      length: 354000,
      ...overrides,
    };
  }

  describe("searchMusicBrainz", () => {
    it("retorna resultados normalizados", async () => {
      mock.method(axios, "get", () =>
        Promise.resolve({
          data: { recordings: [mockRecording()] },
        })
      );

      const result = await searchMusicBrainz("queen");
      assert.equal(result.length, 1);
      assert.equal(result[0].id, "mb_rec_001");
      assert.equal(result[0].name, "Bohemian Rhapsody");
      assert.equal(result[0].artist, "Queen");
      assert.equal(result[0].album, "A Night at the Opera");
      assert.equal(
        result[0].albumImage,
        "https://coverartarchive.org/release/mb_rel_001/front"
      );
      assert.equal(result[0].previewUrl, null);
      assert.equal(result[0].duration, 354);
      assert.equal(result[0].source, "musicbrainz");
    });

    it("construye URL de cover art desde release ID", async () => {
      mock.method(axios, "get", () =>
        Promise.resolve({
          data: {
            recordings: [
              mockRecording({ releases: [{ id: "rel_art_001", title: "Album" }] }),
              mockRecording({ id: "mb2", releases: [] }),
              mockRecording({ id: "mb3", releases: undefined }),
            ],
          },
        })
      );

      const result = await searchMusicBrainz("covers");
      assert.equal(
        result[0].albumImage,
        "https://coverartarchive.org/release/rel_art_001/front"
      );
      assert.equal(result[1].albumImage, "");
      assert.equal(result[2].albumImage, "");
    });

    it("maneja multiples artistas en artist-credit", async () => {
      mock.method(axios, "get", () =>
        Promise.resolve({
          data: {
            recordings: [
              mockRecording({
                "artist-credit": [
                  { name: "Artist A" },
                  { name: "Artist B" },
                ],
              }),
            ],
          },
        })
      );

      const result = await searchMusicBrainz("collab");
      assert.equal(result[0].artist, "Artist A, Artist B");
    });

    it("usa 'Unknown' si no hay artist-credit", async () => {
      mock.method(axios, "get", () =>
        Promise.resolve({
          data: {
            recordings: [
              mockRecording({ "artist-credit": undefined }),
            ],
          },
        })
      );

      const result = await searchMusicBrainz("unknown");
      assert.equal(result[0].artist, "Unknown");
    });

    it("retorna duracion en segundos desde length en ms", async () => {
      mock.method(axios, "get", () =>
        Promise.resolve({
          data: {
            recordings: [
              mockRecording({ length: 200000 }),
              mockRecording({ id: "mb2", length: 0 }),
              mockRecording({ id: "mb3", length: null }),
            ],
          },
        })
      );

      const result = await searchMusicBrainz("durations");
      assert.equal(result[0].duration, 200);
      assert.equal(result[1].duration, 0);
      assert.equal(result[2].duration, null);
    });

    it("retorna array vacio si no hay recordings", async () => {
      mock.method(axios, "get", () =>
        Promise.resolve({ data: { recordings: [] } })
      );

      assert.deepEqual(await searchMusicBrainz("asdfghjkl"), []);
    });

    it("retorna array vacio si recordings es undefined", async () => {
      mock.method(axios, "get", () =>
        Promise.resolve({ data: {} })
      );

      assert.deepEqual(await searchMusicBrainz("empty"), []);
    });

    it("lanza error en 4xx no recuperable (400)", async () => {
      mock.method(axios, "get", () =>
        Promise.reject({ response: { status: 400, statusText: "Bad Request" } })
      );

      await assert.rejects(
        () => searchMusicBrainz("invalid"),
        (err) => {
          assert.equal(err.name, "MusicBrainzServiceError");
          assert.equal(err.statusCode, 400);
          assert.equal(err.retryable, false);
          return true;
        }
      );
    });

    it("lanza timeout si no responde", async () => {
      mock.method(axios, "get", () =>
        Promise.reject({ code: "ECONNABORTED" })
      );

      await assert.rejects(
        () => searchMusicBrainz("slow"),
        (err) => {
          assert.equal(err.statusCode, 408);
          assert.equal(err.retryable, true);
          return true;
        }
      );
    });

    it("reintenta en error 503", async () => {
      let callIndex = 0;
      mock.method(axios, "get", () => {
        callIndex++;
        if (callIndex === 1) {
          return Promise.reject({ response: { status: 503, statusText: "Service Unavailable" } });
        }
        return Promise.resolve({ data: { recordings: [mockRecording()] } });
      });

      const result = await searchMusicBrainz("retry");
      assert.equal(result.length, 1);
      assert.equal(callIndex, 2);
    });

    it("reintenta en error 429", async () => {
      let callIndex = 0;
      mock.method(axios, "get", () => {
        callIndex++;
        if (callIndex === 1) {
          return Promise.reject({ response: { status: 429, statusText: "Too Many Requests" } });
        }
        return Promise.resolve({ data: { recordings: [mockRecording()] } });
      });

      const result = await searchMusicBrainz("rate-limited");
      assert.equal(result.length, 1);
      assert.equal(callIndex, 2);
    });

    it("rate limiter no bloquea resultados correctos", async () => {
      mock.method(axios, "get", () =>
        Promise.resolve({
          data: { recordings: [mockRecording()] },
        })
      );

      const r1 = await searchMusicBrainz("a");
      const r2 = await searchMusicBrainz("b");

      assert.equal(r1.length, 1);
      assert.equal(r2.length, 1);
      assert.equal(axios.get.mock.calls.length, 2);
    });

    it("respeta limite maximo de 25 resultados", async () => {
      mock.method(axios, "get", () =>
        Promise.resolve({ data: { recordings: [] } })
      );

      await searchMusicBrainz("lots", 9999);

      const params = axios.get.mock.calls[0].arguments[1].params;
      assert.equal(params.limit, 25);
    });
  });
});
