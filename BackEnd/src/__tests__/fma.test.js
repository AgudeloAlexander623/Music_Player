/**
 * PRUEBAS DEL SERVICIO DE FREE MUSIC ARCHIVE (FMA)
 *
 * FMA es un plugin opcional que requiere FMA_API_KEY.
 * Proporciona canciones completas libres de derechos.
 *
 * ESCENARIOS CUBIERTOS:
 * - Búsqueda exitosa con resultados normalizados
 * - Error cuando falta FMA_API_KEY
 * - Array vacío cuando no hay resultados
 * - Array vacío cuando dataset es undefined
 * - Error 4xx no recuperable
 * - Timeout en la petición
 * - Limite de resultados y paginacion
 * - Manejo de campos faltantes en cada track
 */

import { describe, it, after, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import { searchFMA } from "../services/fma.services.js";

const ORIGINAL_ENV = { ...process.env };

describe("FMA Service", () => {
  after(() => {
    Object.assign(process.env, ORIGINAL_ENV);
  });

  beforeEach(() => {
    mock.restoreAll();
    process.env.FMA_API_KEY = "test-fma-key";
  });

  function mockTrack(overrides = {}) {
    return {
      track_id: "12345",
      track_title: "Test Song",
      artist_name: "Test Artist",
      album_title: "Test Album",
      track_file: "https://example.com/audio.mp3",
      track_duration: "240",
      license_title: "CC BY-NC 4.0",
      ...overrides,
    };
  }

  describe("searchFMA", () => {
    it("retorna resultados normalizados", async () => {
      mock.method(axios, "get", () =>
        Promise.resolve({
          data: { dataset: [mockTrack()] },
        })
      );

      const result = await searchFMA("test", 1, 10);
      assert.equal(result.length, 1);
      assert.equal(result[0].id, "12345");
      assert.equal(result[0].name, "Test Song");
      assert.equal(result[0].artist, "Test Artist");
      assert.equal(result[0].album, "Test Album");
      assert.equal(result[0].previewUrl, "https://example.com/audio.mp3");
      assert.equal(result[0].duration, 240);
      assert.equal(result[0].source, "fma");
      assert.equal(result[0].license, "CC BY-NC 4.0");
    });

    it("lanza error si falta FMA_API_KEY", async () => {
      delete process.env.FMA_API_KEY;

      await assert.rejects(
        () => searchFMA("test", 1, 10),
        (err) => {
          assert.equal(err.name, "FMAServiceError");
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /FMA_API_KEY/);
          return true;
        }
      );
    });

    it("retorna array vacio si no hay dataset", async () => {
      mock.method(axios, "get", () =>
        Promise.resolve({ data: { dataset: [] } })
      );

      const result = await searchFMA("asdfghjkl", 1, 10);
      assert.deepEqual(result, []);
    });

    it("retorna array vacio si dataset es undefined", async () => {
      mock.method(axios, "get", () =>
        Promise.resolve({ data: {} })
      );

      const result = await searchFMA("empty", 1, 10);
      assert.deepEqual(result, []);
    });

    it("retorna array vacio si dataset no es array", async () => {
      mock.method(axios, "get", () =>
        Promise.resolve({ data: { dataset: null } })
      );

      const result = await searchFMA("null", 1, 10);
      assert.deepEqual(result, []);
    });

    it("usa 'Unknown' para campos faltantes", async () => {
      mock.method(axios, "get", () =>
        Promise.resolve({
          data: { dataset: [mockTrack({ track_title: undefined, artist_name: undefined })] },
        })
      );

      const result = await searchFMA("unknown", 1, 10);
      assert.equal(result[0].name, "Unknown");
      assert.equal(result[0].artist, "Unknown");
    });

    it("usa valores opcionales como null o string vacio cuando faltan", async () => {
      mock.method(axios, "get", () =>
        Promise.resolve({
          data: {
            dataset: [mockTrack({
              album_title: undefined,
              track_file: undefined,
              track_duration: undefined,
              license_title: undefined,
            })],
          },
        })
      );

      const result = await searchFMA("partial", 1, 10);
      assert.equal(result[0].album, "");
      assert.equal(result[0].previewUrl, null);
      assert.equal(result[0].duration, null);
      assert.equal(result[0].license, null);
    });

    it("convierte track_duration a entero", async () => {
      mock.method(axios, "get", () =>
        Promise.resolve({
          data: {
            dataset: [
              mockTrack({ track_duration: "180" }),
              mockTrack({ track_id: "t2", track_duration: "0" }),
            ],
          },
        })
      );

      const result = await searchFMA("duration", 1, 10);
      assert.equal(result[0].duration, 180);
      assert.equal(result[1].duration, 0);
    });

    it("lanza error en 4xx no recuperable", async () => {
      mock.method(axios, "get", () =>
        Promise.reject({
          response: { status: 401, statusText: "Unauthorized" },
        })
      );

      await assert.rejects(
        () => searchFMA("unauthorized", 1, 10),
        (err) => {
          assert.equal(err.name, "FMAServiceError");
          assert.equal(err.statusCode, 401);
          return true;
        }
      );
    });

    it("lanza timeout si la API no responde", async () => {
      mock.method(axios, "get", () =>
        Promise.reject({ code: "ECONNABORTED" })
      );

      await assert.rejects(
        () => searchFMA("timeout", 1, 10),
        (err) => {
          assert.equal(err.statusCode, 408);
          return true;
        }
      );
    });

    it("lanza error en 5xx", async () => {
      mock.method(axios, "get", () =>
        Promise.reject({
          response: { status: 500, statusText: "Internal Server Error" },
        })
      );

      await assert.rejects(
        () => searchFMA("server-error", 1, 10),
        (err) => {
          assert.equal(err.statusCode, 500);
          return true;
        }
      );
    });

    it("calcula offset correcto segun page", async () => {
      mock.method(axios, "get", () =>
        Promise.resolve({ data: { dataset: [] } })
      );

      await searchFMA("pagination", 3, 10);
      const params = axios.get.mock.calls[0].arguments[1].params;
      assert.equal(params.offset, 20);
    });

    it("respeta limite de resultados", async () => {
      mock.method(axios, "get", () =>
        Promise.resolve({ data: { dataset: [] } })
      );

      await searchFMA("limited", 1, 5);
      const params = axios.get.mock.calls[0].arguments[1].params;
      assert.equal(params.limit, 5);
    });
  });
});
