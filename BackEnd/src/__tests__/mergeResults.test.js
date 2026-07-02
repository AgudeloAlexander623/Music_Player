import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mergeResults } from '../utils/mergeResults.js';

describe('mergeResults', () => {
  it('retorna array vacio si no hay fuentes', () => {
    const result = mergeResults({});
    assert.deepStrictEqual(result, []);
  });

  it('retorna array vacio si sources es undefined', () => {
    const result = mergeResults();
    assert.deepStrictEqual(result, []);
  });

  it('fusiona resultados de una sola fuente', () => {
    const result = mergeResults({
      deezer: [
        { id: '1', name: 'Cancion A', artist: 'Artista A', source: 'deezer' },
      ],
    });
    assert.equal(result.length, 1);
    assert.equal(result[0].name, 'Cancion A');
  });

  it('deduplica por source-id', () => {
    const result = mergeResults({
      deezer: [
        { id: '1', name: 'A', artist: 'A', source: 'deezer' },
        { id: '1', name: 'A duplicado', artist: 'A', source: 'deezer' },
      ],
    });
    assert.equal(result.length, 1);
  });

  it('fusiona resultados de multiples fuentes', () => {
    const result = mergeResults({
      deezer: [
        { id: '1', name: 'A', artist: 'A', source: 'deezer' },
      ],
      fma: [
        { id: '2', name: 'B', artist: 'B', source: 'fma' },
      ],
      audius: [
        { id: '3', name: 'C', artist: 'C', source: 'audius' },
      ],
    });
    assert.equal(result.length, 3);
  });

  it('deduplica entre youtube y youtube_music por videoId', () => {
    const result = mergeResults({
      youtube: [
        { id: 'yt1', name: 'A', artist: 'A', source: 'youtube', videoId: 'vid1' },
      ],
      youtube_music: [
        { id: 'ytm1', name: 'A', artist: 'A', source: 'youtube_music', videoId: 'vid1' },
      ],
    });
    assert.equal(result.length, 1);
  });

  it('incluye youtube_music si no hay duplicado', () => {
    const result = mergeResults({
      youtube: [
        { id: 'yt1', name: 'A', artist: 'A', source: 'youtube', videoId: 'vid1' },
      ],
      youtube_music: [
        { id: 'ytm2', name: 'B', artist: 'B', source: 'youtube_music', videoId: 'vid2' },
      ],
    });
    assert.equal(result.length, 2);
  });

  it('procesa internetarchive y spotify', () => {
    const result = mergeResults({
      internetarchive: [
        { id: 'ia1', name: 'IA', artist: 'IA', source: 'internetarchive' },
      ],
      spotify: [
        { id: 'sp1', name: 'SP', artist: 'SP', source: 'spotify' },
      ],
    });
    assert.equal(result.length, 2);
  });

  it('procesa musicbrainz con dedup por nombre y artista y musicbrainzId', () => {
    const result = mergeResults({
      deezer: [
        { id: 'dz1', name: 'Song', artist: 'Artist', source: 'deezer', musicbrainzId: 'mb1' },
      ],
      musicbrainz: [
        { id: 'mb1', name: 'Song', artist: 'Artist', source: 'musicbrainz', musicbrainzId: 'mb1' },
      ],
    });
    assert.equal(result.length, 1);
  });

  it('incluye musicbrainz si no hay duplicado', () => {
    const result = mergeResults({
      musicbrainz: [
        {
          id: 'mb1', name: 'Unique', artist: 'Unique', album: 'Album',
          albumImage: '', previewUrl: null, source: 'musicbrainz', musicbrainzId: 'mb1',
        },
      ],
    });
    assert.equal(result.length, 1);
    assert.equal(result[0].source, 'musicbrainz');
  });

  it('usa youtubeMusic como fallback si youtube_music no tiene datos', () => {
    const result = mergeResults({
      youtubeMusic: [
        { id: 'ytm1', name: 'A', artist: 'A', source: 'youtube_music', videoId: 'v1' },
      ],
    });
    assert.equal(result.length, 1);
  });
});
