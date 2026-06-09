/**
 * PRUEBAS DEL SERVICIO DE YOUTUBE
 *
 * Valida el comportamiento del servicio de YouTube con su
 * estrategia de dos niveles: YouTube Data API + Invidious fallback.
 *
 * ESCENARIOS CUBIERTOS:
 * - Búsqueda exitosa con YouTube API
 * - Fallback a Invidious cuando no hay API key
 * - Fallback a Invidious cuando la API key falla
 * - Resultados vacíos de ambas fuentes
 * - Normalización de datos desde YouTube API e Invidious
 * - Formatos de duración ISO 8601
 * - YouTube Music con sufijo " music" en el query
 * - Errores de red y timeout en ambas estrategias
 * - Estado de diagnóstico del servicio
 */

import { describe, it, beforeEach, mock, after } from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import {
  searchYouTube,
  searchYouTubeMusic,
  _resetForTest,
  getYouTubeServiceStatus,
} from "../services/youtube.services.js";

const ORIGINAL_ENV = { ...process.env };

function mockYouTubeSearchResponse(items = []) {
  return {
    data: {
      items: items.map((v, i) => ({
        id: { videoId: v.videoId || `yt_video_${i}` },
        snippet: {
          title: v.title || "Test Video",
          channelTitle: v.channel || "Test Channel",
          thumbnails: {
            high: { url: v.thumbnail || `https://img.youtube.com/vi/${v.videoId || i}/hqdefault.jpg` },
            medium: { url: `https://img.youtube.com/vi/${v.videoId || i}/mqdefault.jpg` },
            default: { url: `https://img.youtube.com/vi/${v.videoId || i}/default.jpg` },
          },
        },
      })),
    },
  };
}

function mockYouTubeDetailsResponse(durations = {}) {
  return {
    data: {
      items: Object.entries(durations).map(([id, duration]) => ({
        id,
        contentDetails: { duration },
      })),
    },
  };
}

function mockInvidiousResponse(items = []) {
  return {
    data: items.map((v, i) => ({
      title: v.title || "Test Video",
      author: v.channel || "Test Channel",
      videoId: v.videoId || `inv_video_${i}`,
      lengthSeconds: v.duration != null ? String(v.duration) : undefined,
      thumbnail: v.thumbnail || `https://img.youtube.com/vi/${v.videoId || i}/hqdefault.jpg`,
    })),
  };
}

describe("YouTube Service", () => {
  after(() => {
    Object.assign(process.env, ORIGINAL_ENV);
  });

  beforeEach(() => {
    mock.restoreAll();
    _resetForTest();
    process.env.YOUTUBE_API_KEY = "test-api-key";
  });

  describe("searchYouTube", () => {
    it("retorna resultados normalizados desde YouTube API", async () => {
      mock.method(axios, "get", (url) => {
        if (url.includes("youtube/v3/search")) {
          return Promise.resolve(mockYouTubeSearchResponse([
            { videoId: "vid001", title: "Bohemian Rhapsody", channel: "Queen Official" },
          ]));
        }
        if (url.includes("youtube/v3/videos")) {
          return Promise.resolve(mockYouTubeDetailsResponse({ vid001: "PT3M54S" }));
        }
        return Promise.reject(new Error("Unexpected URL"));
      });

      const results = await searchYouTube("queen");
      assert.equal(results.length, 1);
      assert.equal(results[0].videoId, "vid001");
      assert.equal(results[0].title, "Bohemian Rhapsody");
      assert.equal(results[0].artist, "Queen Official");
      assert.equal(results[0].duration, 234);
      assert.equal(results[0].source, "youtube");
      assert.equal(
        results[0].previewUrl,
        "https://www.youtube.com/watch?v=vid001"
      );
    });

    it("retorna array vacio si no hay resultados en YouTube API", async () => {
      mock.method(axios, "get", (url) => {
        if (url.includes("youtube/v3/search")) {
          return Promise.resolve({ data: { items: [] } });
        }
        return Promise.reject(new Error("Unexpected URL"));
      });

      const results = await searchYouTube("asdfghjkl");
      assert.deepEqual(results, []);
    });

    it("retorna array vacio si items es undefined", async () => {
      mock.method(axios, "get", (url) => {
        if (url.includes("youtube/v3/search")) {
          return Promise.resolve({ data: {} });
        }
        return Promise.reject(new Error("Unexpected URL"));
      });

      const results = await searchYouTube("empty");
      assert.deepEqual(results, []);
    });

    it("formatea duracion ISO 8601 correctamente", async () => {
      mock.method(axios, "get", (url) => {
        if (url.includes("youtube/v3/search")) {
          return Promise.resolve(mockYouTubeSearchResponse([
            { videoId: "d1" },
            { videoId: "d2" },
            { videoId: "d3" },
            { videoId: "d4" },
          ]));
        }
        if (url.includes("youtube/v3/videos")) {
          return Promise.resolve(mockYouTubeDetailsResponse({
            d1: "PT1H2M30S",
            d2: "PT5M",
            d3: "PT30S",
            d4: "PT0S",
          }));
        }
        return Promise.reject(new Error("Unexpected URL"));
      });

      const results = await searchYouTube("durations");
      assert.equal(results[0].duration, 3750); // 1h 2m 30s
      assert.equal(results[1].duration, 300);  // 5m
      assert.equal(results[2].duration, 30);   // 30s
      assert.equal(results[3].duration, 0);    // 0s
    });

    it("retorna null si no hay duracion", async () => {
      mock.method(axios, "get", (url) => {
        if (url.includes("youtube/v3/search")) {
          return Promise.resolve(mockYouTubeSearchResponse([
            { videoId: "no_dur" },
          ]));
        }
        if (url.includes("youtube/v3/videos")) {
          return Promise.resolve({ data: { items: [] } });
        }
        return Promise.reject(new Error("Unexpected URL"));
      });

      const results = await searchYouTube("no-duration");
      assert.equal(results[0].duration, null);
    });

    it("no se cae si detalles de video falla", async () => {
      mock.method(axios, "get", (url) => {
        if (url.includes("youtube/v3/search")) {
          return Promise.resolve(mockYouTubeSearchResponse([
            { videoId: "vid_ok" },
          ]));
        }
        if (url.includes("youtube/v3/videos")) {
          return Promise.reject({ message: "Network error" });
        }
        return Promise.reject(new Error("Unexpected URL"));
      });

      const results = await searchYouTube("partial-fail");
      assert.equal(results.length, 1);
      assert.equal(results[0].videoId, "vid_ok");
      assert.equal(results[0].duration, null);
    });

    it("usa Invidious como fallback cuando no hay API key", async () => {
      delete process.env.YOUTUBE_API_KEY;
      _resetForTest();

      mock.method(axios, "get", (url) => {
        if (url.includes("invidious") && url.includes("api/v1/search")) {
          return Promise.resolve(mockInvidiousResponse([
            { videoId: "inv_001", title: "Fallback Song", channel: "Fallback Artist", duration: 240 },
          ]));
        }
        return Promise.reject(new Error("Unexpected URL"));
      });

      const results = await searchYouTube("fallback test");
      assert.equal(results.length, 1);
      assert.equal(results[0].videoId, "inv_001");
      assert.equal(results[0].title, "Fallback Song");
      assert.equal(results[0].artist, "Fallback Artist");
      assert.equal(results[0].duration, 240);
      assert.equal(results[0].source, "youtube");
    });

    it("usa Invidious como fallback cuando API key es placeholder", async () => {
      process.env.YOUTUBE_API_KEY = "your_youtube_api_key_here";
      _resetForTest();

      mock.method(axios, "get", (url) => {
        if (url.includes("invidious") && url.includes("api/v1/search")) {
          return Promise.resolve(mockInvidiousResponse([
            { videoId: "inv_002", title: "Placeholder Fallback", channel: "Artist" },
          ]));
        }
        return Promise.reject(new Error("Unexpected URL"));
      });

      const results = await searchYouTube("test");
      assert.equal(results.length, 1);
      assert.equal(results[0].videoId, "inv_002");
    });

    it("usa Invidious como fallback cuando YouTube API falla con 403", async () => {
      let apiCalled = false;
      mock.method(axios, "get", (url) => {
        if (url.includes("youtube/v3/search")) {
          apiCalled = true;
          return Promise.reject({
            response: { status: 403, statusText: "Forbidden" },
          });
        }
        if (url.includes("invidious") && url.includes("api/v1/search")) {
          return Promise.resolve(mockInvidiousResponse([
            { videoId: "inv_003", title: "API Fallback", channel: "Artist" },
          ]));
        }
        return Promise.reject(new Error("Unexpected URL"));
      });

      const results = await searchYouTube("api-key-invalid");
      assert.equal(apiCalled, true);
      assert.equal(results.length, 1);
      assert.equal(results[0].videoId, "inv_003");
    });

    it("retorna array vacio si YouTube API e Invidious fallan", async () => {
      mock.method(axios, "get", () =>
        Promise.reject({ message: "Network error" })
      );

      const results = await searchYouTube("everything-down");
      assert.deepEqual(results, []);
    });

    it("intenta multiples instancias de Invidious", async () => {
      delete process.env.YOUTUBE_API_KEY;
      _resetForTest();

      let callCount = 0;
      mock.method(axios, "get", (url) => {
        if (url.includes("invidious")) {
          callCount++;
          if (callCount <= 2) {
            return Promise.reject({ code: "ECONNABORTED" });
          }
          return Promise.resolve(mockInvidiousResponse([
            { videoId: "inv_multi", title: "After Retry", channel: "Artist" },
          ]));
        }
        return Promise.reject(new Error("Unexpected URL"));
      });

      const results = await searchYouTube("multi-instance");
      assert.equal(results.length, 1);
      assert(callCount >= 3);
    });

    it("incluye thumbnail en resultados", async () => {
      mock.method(axios, "get", (url) => {
        if (url.includes("youtube/v3/search")) {
          return Promise.resolve(mockYouTubeSearchResponse([
            { videoId: "thumb_vid", title: "Test", channel: "Test" },
          ]));
        }
        if (url.includes("youtube/v3/videos")) {
          return Promise.resolve({ data: { items: [] } });
        }
        return Promise.reject(new Error("Unexpected URL"));
      });

      const results = await searchYouTube("thumbnails");
      assert.equal(results.length, 1);
      assert(results[0].thumbnail != null);
      assert(results[0].thumbnail.includes("hqdefault"));
    });
  });

  describe("searchYouTubeMusic", () => {
    it("agrega ' music' al query y marca source como youtube_music", async () => {
      mock.method(axios, "get", (url, options) => {
        if (url.includes("youtube/v3/search")) {
          assert.match(options.params.q, / music$/);
          return Promise.resolve(mockYouTubeSearchResponse([
            { videoId: "ytm_001", title: "Music Video", channel: "Artist" },
          ]));
        }
        if (url.includes("youtube/v3/videos")) {
          return Promise.resolve({ data: { items: [] } });
        }
        return Promise.reject(new Error("Unexpected URL"));
      });

      const results = await searchYouTubeMusic("pop");
      assert.equal(results.length, 1);
      assert.equal(results[0].source, "youtube_music");
    });

    it("retorna array vacio si no hay resultados", async () => {
      mock.method(axios, "get", (url) => {
        if (url.includes("youtube/v3/search")) {
          return Promise.resolve({ data: { items: [] } });
        }
        return Promise.reject(new Error("Unexpected URL"));
      });

      const results = await searchYouTubeMusic("nonexistent");
      assert.deepEqual(results, []);
    });

    it("no se cae en error de red", async () => {
      mock.method(axios, "get", () =>
        Promise.reject({ message: "Network error" })
      );

      const results = await searchYouTubeMusic("error");
      assert.deepEqual(results, []);
    });
  });

  describe("getYouTubeServiceStatus", () => {
    it("retorna estado con API key configurada", () => {
      process.env.YOUTUBE_API_KEY = "real-key";
      _resetForTest();
      const status = getYouTubeServiceStatus();
      assert.equal(status.youtubeApiConfigured, true);
      assert.equal(status.searchesByStrategy.youtube_api, 0);
    });

    it("retorna estado sin API key", () => {
      delete process.env.YOUTUBE_API_KEY;
      _resetForTest();
      const status = getYouTubeServiceStatus();
      assert.equal(status.youtubeApiConfigured, false);
    });

    it("recomienda configurar API key cuando no esta configurada", () => {
      delete process.env.YOUTUBE_API_KEY;
      _resetForTest();
      const status = getYouTubeServiceStatus();
      assert.match(status.recommendedAction, /YOUTUBE_API_KEY/);
    });

    it("actualiza contadores despues de busquedas", async () => {
      delete process.env.YOUTUBE_API_KEY;
      _resetForTest();

      mock.method(axios, "get", (url) => {
        if (url.includes("invidious")) {
          return Promise.resolve(mockInvidiousResponse([
            { videoId: "stat_vid", title: "Test", channel: "Test" },
          ]));
        }
        return Promise.reject(new Error("Unexpected URL"));
      });

      await searchYouTube("status test");
      const status = getYouTubeServiceStatus();
      assert.equal(status.totalSearches, 1);
      assert.equal(status.invidiousAvailable, true);
    });
  });
});
