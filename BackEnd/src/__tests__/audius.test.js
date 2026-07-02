import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import { searchAudius } from '../services/audius.services.js';

const MOCK_TRACK = {
  id: 'abc123',
  title: 'Test Track',
  user: { name: 'Test Artist' },
  genre: 'Electronic',
  artwork: { '480x480': 'https://art.url/img.jpg' },
  stream: { url: 'https://stream.url/audio.mp3' },
  duration: 240,
};

describe('Audius Service', () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  describe('searchAudius', () => {
    it('retorna array vacio si no hay resultados', async () => {
      mock.method(axios, 'get', async () => ({
        data: { data: [] },
      }));

      const result = await searchAudius('nonexistent_query_xyz');
      assert.equal(result.length, 0);
    });

    it('retorna array vacio si la respuesta no tiene data', async () => {
      mock.method(axios, 'get', async () => ({
        data: {},
      }));

      const result = await searchAudius('test');
      assert.equal(result.length, 0);
    });

    it('normaliza un track correctamente', async () => {
      mock.method(axios, 'get', async () => ({
        data: { data: [MOCK_TRACK] },
      }));

      const result = await searchAudius('test');
      assert.equal(result.length, 1);

      const track = result[0];
      assert.equal(track.id, 'abc123');
      assert.equal(track.name, 'Test Track');
      assert.equal(track.artist, 'Test Artist');
      assert.equal(track.album, 'Electronic');
      assert.equal(track.albumImage, 'https://art.url/img.jpg');
      assert.equal(track.previewUrl, 'https://stream.url/audio.mp3');
      assert.equal(track.source, 'audius');
      assert.equal(track.duration, 240);
    });

    it('maneja track sin stream URL devolviendo previewUrl null', async () => {
      const noStreamTrack = {
        ...MOCK_TRACK,
        stream: {},
      };

      mock.method(axios, 'get', async () => ({
        data: { data: [noStreamTrack] },
      }));

      const result = await searchAudius('test');
      assert.equal(result[0].previewUrl, null);
    });

    it('usa mirror como fallback de stream URL', async () => {
      const mirrorTrack = {
        ...MOCK_TRACK,
        stream: { mirrors: ['https://mirror/audio.mp3'] },
      };

      mock.method(axios, 'get', async () => ({
        data: { data: [mirrorTrack] },
      }));

      const result = await searchAudius('test');
      assert.equal(result[0].previewUrl, 'https://mirror/audio.mp3');
    });

    it('maneja track sin artwork devolviendo albumImage null', async () => {
      const noArtTrack = { ...MOCK_TRACK, artwork: null };

      mock.method(axios, 'get', async () => ({
        data: { data: [noArtTrack] },
      }));

      const result = await searchAudius('test');
      assert.equal(result[0].albumImage, null);
    });

    it('normaliza duración como entero', async () => {
      const strDurationTrack = {
        ...MOCK_TRACK,
        duration: '180',
      };

      mock.method(axios, 'get', async () => ({
        data: { data: [strDurationTrack] },
      }));

      const result = await searchAudius('test');
      assert.equal(result[0].duration, 180);
    });

    it('usa valores por defecto para title/user faltantes', async () => {
      const partialTrack = { id: '1' };

      mock.method(axios, 'get', async () => ({
        data: { data: [partialTrack] },
      }));

      const result = await searchAudius('test');
      assert.equal(result[0].name, 'Unknown');
      assert.equal(result[0].artist, 'Unknown');
    });
  });
});
