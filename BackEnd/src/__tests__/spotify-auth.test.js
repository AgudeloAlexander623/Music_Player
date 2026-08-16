import { describe, it, after, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import {
  buildSpotifyAuthUrl,
  exchangeSpotifyCode,
  getSpotifyProfile,
  getSpotifyRedirectUri,
} from "../services/spotify.services.js";
import {
  createSpotifyLoginUrl,
  consumeSpotifyState,
  upsertSpotifyUser,
} from "../services/auth.service.js";

const ORIGINAL_ENV = { ...process.env };

describe("Spotify OAuth helpers", () => {
  after(() => {
    Object.assign(process.env, ORIGINAL_ENV);
  });

  beforeEach(() => {
    mock.restoreAll();
    process.env.SPOTIFY_CLIENT_ID = "test-client-id";
    process.env.SPOTIFY_CLIENT_SECRET = "test-client-secret";
  });

  describe("buildSpotifyAuthUrl", () => {
    it("construye la URL de autorizacion con query params", () => {
      const url = buildSpotifyAuthUrl("state_abc");
      assert.ok(url.startsWith("https://accounts.spotify.com/authorize"));
      const params = new URL(url).searchParams;
      assert.equal(params.get("client_id"), "test-client-id");
      assert.equal(params.get("response_type"), "code");
      assert.equal(params.get("state"), "state_abc");
      assert.equal(params.get("scope"), "user-read-email user-read-private");
      assert.equal(params.get("redirect_uri"), getSpotifyRedirectUri());
    });

    it("usa SPOTIFY_REDIRECT_URI del entorno", () => {
      process.env.SPOTIFY_REDIRECT_URI =
        "https://mi-app.com/api/auth/spotify/callback";
      const url = buildSpotifyAuthUrl("state_x");
      assert.equal(
        new URL(url).searchParams.get("redirect_uri"),
        "https://mi-app.com/api/auth/spotify/callback"
      );
    });
  });

  describe("createSpotifyLoginUrl + consumeSpotifyState", () => {
    it("roundtrip: el estado se consume una sola vez", () => {
      const url = createSpotifyLoginUrl();
      const state = new URL(url).searchParams.get("state");
      assert.ok(state, "la URL debe incluir el state");
      assert.equal(consumeSpotifyState(state), true);
      assert.equal(consumeSpotifyState(state), false, "no debe reutilizarse");
    });

    it("rechaza estados invalidos o ausentes", () => {
      assert.equal(consumeSpotifyState(undefined), false);
      assert.equal(consumeSpotifyState("no-existe"), false);
    });
  });

  describe("exchangeSpotifyCode", () => {
    it("intercambia el code y devuelve los tokens", async () => {
      mock.method(axios, "post", () =>
        Promise.resolve({
          data: {
            access_token: "user_tok",
            refresh_token: "refresh_1",
            expires_in: 3600,
          },
        })
      );

      const tokens = await exchangeSpotifyCode("code_1");
      assert.equal(tokens.access_token, "user_tok");
      assert.equal(tokens.refresh_token, "refresh_1");

      const [url, body, config] = axios.post.mock.calls[0].arguments;
      assert.equal(url, "https://accounts.spotify.com/api/token");
      assert.equal(body.get("grant_type"), "authorization_code");
      assert.equal(body.get("code"), "code_1");
      assert.ok(config.headers.Authorization.startsWith("Basic "));
    });

    it("lanza error 400 si faltan credenciales", async () => {
      delete process.env.SPOTIFY_CLIENT_ID;
      delete process.env.SPOTIFY_CLIENT_SECRET;

      await assert.rejects(
        () => exchangeSpotifyCode("code_2"),
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.equal(err.retryable, false);
          return true;
        }
      );
    });

    it("propaga errores de la API de Spotify", async () => {
      mock.method(axios, "post", () =>
        Promise.reject({ response: { status: 400, statusText: "Bad Request" } })
      );

      await assert.rejects(
        () => exchangeSpotifyCode("bad"),
        (err) => {
          assert.equal(err.statusCode, 400);
          return true;
        }
      );
    });
  });

  describe("getSpotifyProfile", () => {
    it("obtiene el perfil del usuario desde /v1/me", async () => {
      mock.method(axios, "get", () =>
        Promise.resolve({
          data: {
            id: "spotify_user_1",
            display_name: "Ana",
            email: "ana@example.com",
            images: [{ url: "https://img/avatar.jpg" }],
          },
        })
      );

      const profile = await getSpotifyProfile("user_tok");
      assert.equal(profile.id, "spotify_user_1");
      assert.equal(profile.email, "ana@example.com");

      const [url, config] = axios.get.mock.calls[0].arguments;
      assert.equal(url, "https://api.spotify.com/v1/me");
      assert.equal(config.headers.Authorization, "Bearer user_tok");
    });
  });

  describe("upsertSpotifyUser", () => {
    it("rechaza perfiles sin id sin tocar la BD", async () => {
      await assert.rejects(
        () => upsertSpotifyUser({}),
        (err) => {
          assert.equal(err.name, "AuthServiceError");
          return true;
        }
      );
    });
  });
});