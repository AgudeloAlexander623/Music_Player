/**
 * PRUEBAS DEL SERVICIO DE DEEZER
 *
 * Deezer es un plugin opcional que no requiere autenticación.
 * La API pública de Deezer proporciona previews de 30 segundos
 * para cada canción.
 *
 * ESCENARIOS CUBIERTOS:
 * - Búsqueda exitosa con resultados normalizados
 * - Array vacío cuando no hay resultados
 * - Array vacío cuando la respuesta no tiene data
 * - Error 4xx no recuperable
 * - Timeout en la petición
 * - Error de red inesperado
 * - Límite máximo de resultados
 */

import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import { searchDeezer } from "../services/deezer.services.js";

describe("Deezer Service", () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  function mockTrack(overrides = {}) {
    return {
      id: 12345,
      title: "Bohemian Rhapsody",
      artist: { name: "Queen" },
      album: { title: "A Night at the Opera", cover_medium: "https://example.com/cover.jpg" },
      preview: "https://cdns-preview-xxx.dzcdn.net/xxx.mp3",
      duration: 354,
      ...overrides,
    };
  }

  describe("searchDeezer", () => {
    it("retorna resultados normalizados", async () => {
      mock.method(axios, "get", () =>
        Promise.resolve({
          data: { data: [mockTrack()] },
        })
      );

      const result = await searchDeezer("queen");
      assert.equal(result.length, 1);
      assert.equal(result[0].id, "12345");
      assert.equal(result[0].name, "Bohemian Rhapsody");
      assert.equal(result[0].artist, "Queen");
      assert.equal(result[0].album, "A Night at the Opera");
      assert.equal(result[0].albumImage, "https://example.com/cover.jpg");
      assert.equal(result[0].previewUrl, "https://cdns-preview-xxx.dzcdn.net/xxx.mp3");
      assert.equal(result[0].duration, 354);
      assert.equal(result[0].source, "deezer");
    });

    it("retorna array vacio si no hay resultados", async () => {
      mock.method(axios, "get", () =>
        Promise.resolve({ data: { data: [] } })
      );

      const result = await searchDeezer("asdfghjkl");
      assert.deepEqual(result, []);
    });

    it("retorna array vacio si data es undefined", async () => {
      mock.method(axios, "get", () =>
        Promise.resolve({ data: {} })
      );

      const result = await searchDeezer("empty");
      assert.deepEqual(result, []);
    });

    it("retorna array vacio si data no es un array", async () => {
      mock.method(axios, "get", () =>
        Promise.resolve({ data: { data: null } })
      );

      const result = await searchDeezer("null");
      assert.deepEqual(result, []);
    });

    it("utiliza cover_medium como albumImage", async () => {
      mock.method(axios, "get", () =>
        Promise.resolve({
          data: {
            data: [
              mockTrack({
                album: { title: "Album", cover_medium: "https://example.com/medium.jpg" },
              }),
            ],
          },
        })
      );

      const result = await searchDeezer("cover");
      assert.equal(result[0].albumImage, "https://example.com/medium.jpg");
    });

    it("utiliza cover como fallback si no hay cover_medium", async () => {
      mock.method(axios, "get", () =>
        Promise.resolve({
          data: {
            data: [
              mockTrack({
                album: { title: "Album", cover: "https://example.com/cover.jpg" },
              }),
            ],
          },
        })
      );

      const result = await searchDeezer("cover-fallback");
      assert.equal(result[0].albumImage, "https://example.com/cover.jpg");
    });

    it("retorna string vacio si no hay albumImage", async () => {
      mock.method(axios, "get", () =>
        Promise.resolve({
          data: {
            data: [
              mockTrack({ album: { title: "Album" } }),
            ],
          },
        })
      );

      const result = await searchDeezer("no-cover");
      assert.equal(result[0].albumImage, "");
    });

    it("lanza error en 4xx no recuperable", async () => {
      mock.method(axios, "get", () =>
        Promise.reject({
          response: { status: 400, statusText: "Bad Request" },
        })
      );

      await assert.rejects(
        () => searchDeezer("invalid"),
        (err) => {
          assert.equal(err.name, "DeezerServiceError");
          assert.equal(err.statusCode, 400);
          return true;
        }
      );
    });

    it("lanza error en 4xx no recuperable (404)", async () => {
      mock.method(axios, "get", () =>
        Promise.reject({
          response: { status: 404, statusText: "Not Found" },
        })
      );

      await assert.rejects(
        () => searchDeezer("not-found"),
        (err) => {
          assert.equal(err.statusCode, 404);
          return true;
        }
      );
    });

    it("lanza timeout si no responde", async () => {
      mock.method(axios, "get", () =>
        Promise.reject({ code: "ECONNABORTED" })
      );

      await assert.rejects(
        () => searchDeezer("slow"),
        (err) => {
          assert.equal(err.statusCode, 408);
          return true;
        }
      );
    });

    it("lanza error si la API retorna 5xx", async () => {
      mock.method(axios, "get", () =>
        Promise.reject({
          response: { status: 503, statusText: "Service Unavailable" },
        })
      );

      await assert.rejects(
        () => searchDeezer("server-error"),
        (err) => {
          assert.equal(err.statusCode, 503);
          return true;
        }
      );
    });

    it("respeta el limite de resultados", async () => {
      const manyTracks = Array.from({ length: 50 }, (_, i) =>
        mockTrack({ id: i, title: `Track ${i}` })
      );

      mock.method(axios, "get", () =>
        Promise.resolve({ data: { data: manyTracks } })
      );

      const result = await searchDeezer("lots", 10);
      assert.equal(result.length, 10);
    });

    it("no excede el maximo de 50 resultados", async () => {
      mock.method(axios, "get", () =>
        Promise.resolve({ data: { data: [] } })
      );

      await searchDeezer("max", 999);

      const params = axios.get.mock.calls[0].arguments[1].params;
      assert.equal(params.limit, 50);
    });
  });
});
