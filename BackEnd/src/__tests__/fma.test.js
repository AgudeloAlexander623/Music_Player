import { describe, it, after, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import { searchFMA } from "../services/fma.services.js";

const ORIGINAL_ENV = { ...process.env };

describe("FMA Service (vía Audius)", () => {
  after(() => {
    Object.assign(process.env, ORIGINAL_ENV);
  });

  beforeEach(() => {
    mock.restoreAll();
  });

  function mockTrack(overrides = {}) {
    return {
      id: "abc123",
      title: "Test Song",
      user: { name: "Test Artist", handle: "testartist", id: "u1" },
      genre: "Rock",
      artwork: {
        "150x150": "https://example.com/art/150.jpg",
        "480x480": "https://example.com/art/480.jpg",
      },
      stream: { url: "https://example.com/stream/abc123" },
      duration: 240,
      license: "CC BY-NC 4.0",
      ...overrides,
    };
  }

  describe("searchFMA", () => {
    it("retorna resultados normalizados", async () => {
      mock.method(axios, "get", () =>
        Promise.resolve({
          data: { data: [mockTrack()] },
        })
      );

      const result = await searchFMA("test", 1, 10);
      assert.equal(result.length, 1);
      assert.equal(result[0].id, "abc123");
      assert.equal(result[0].name, "Test Song");
      assert.equal(result[0].artist, "Test Artist");
      assert.equal(result[0].album, "Rock");
      assert.equal(result[0].previewUrl, "https://example.com/stream/abc123");
      assert.equal(result[0].duration, 240);
      assert.equal(result[0].source, "fma");
      assert.equal(result[0].license, "CC BY-NC 4.0");
      assert.equal(result[0].albumImage, "https://example.com/art/480.jpg");
    });

    it("retorna array vacio si no hay data", async () => {
      mock.method(axios, "get", () =>
        Promise.resolve({ data: { data: [] } })
      );

      const result = await searchFMA("asdfghjkl", 1, 10);
      assert.deepEqual(result, []);
    });

    it("retorna array vacio si data es undefined", async () => {
      mock.method(axios, "get", () =>
        Promise.resolve({ data: {} })
      );

      const result = await searchFMA("empty", 1, 10);
      assert.deepEqual(result, []);
    });

    it("retorna array vacio si data no es array", async () => {
      mock.method(axios, "get", () =>
        Promise.resolve({ data: { data: null } })
      );

      const result = await searchFMA("null", 1, 10);
      assert.deepEqual(result, []);
    });

    it("usa 'Unknown' para campos faltantes", async () => {
      mock.method(axios, "get", () =>
        Promise.resolve({
          data: {
            data: [mockTrack({ title: undefined, user: undefined })],
          },
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
            data: [
              mockTrack({
                genre: undefined,
                stream: undefined,
                duration: undefined,
                license: undefined,
                artwork: undefined,
              }),
            ],
          },
        })
      );

      const result = await searchFMA("partial", 1, 10);
      assert.equal(result[0].album, "");
      assert.equal(result[0].previewUrl, null);
      assert.equal(result[0].duration, null);
      assert.equal(result[0].license, null);
      assert.equal(result[0].albumImage, null);
    });

    it("convierte duration a entero", async () => {
      mock.method(axios, "get", () =>
        Promise.resolve({
          data: {
            data: [
              mockTrack({ duration: "180" }),
              mockTrack({ id: "t2", duration: "0" }),
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
        Promise.resolve({ data: { data: [] } })
      );

      await searchFMA("pagination", 3, 10);
      const params = axios.get.mock.calls[0].arguments[1].params;
      assert.equal(params.offset, 20);
    });

    it("respeta limite de resultados", async () => {
      mock.method(axios, "get", () =>
        Promise.resolve({ data: { data: [] } })
      );

      await searchFMA("limited", 1, 5);
      const params = axios.get.mock.calls[0].arguments[1].params;
      assert.equal(params.limit, 5);
    });
  });
});
