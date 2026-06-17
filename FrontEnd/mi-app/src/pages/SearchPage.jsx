import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { usePlayer } from '../App';
import SearchResults from '../components/SearchResults';
import api from '../services/api';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { getAllEnabled } from '../utils/pluginStorage';
import './SearchPage.css';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const { playTrack } = usePlayer();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [input, setInput] = useState(query);
  const toast = useToast();
  const { isGuest } = useAuth();

  const { sourcesParam } = useMemo(() => {
    const stored = getAllEnabled();
    return {
      sourcesParam: stored && stored.length > 0 ? stored.join(',') : null,
    };
  }, []);

  const buildSearchUrl = (q, limit = 20) => {
    let url = `/search?q=${encodeURIComponent(q.trim())}&limit=${limit}`;
    if (sourcesParam) url += `&sources=${sourcesParam}`;
    return url;
  };

  const doSearch = async (q) => {
    const trimmed = q.trim();
    if (!trimmed || trimmed.length < 2) return;
    setLoading(true);
    setDone(false);
    try {
      const res = await api.get(buildSearchUrl(trimmed), { timeout: 10000 });
      setResults(res.data.tracks || []);
      setDone(true);
    } catch (err) {
      console.error('Error en búsqueda:', err?.response?.status, err?.message);
      setDone(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (query.length >= 2) {
      setInput(query);
      doSearch(query);
    }
  }, [query]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (trimmed.length >= 2) {
      setSearchParams({ q: trimmed });
    }
  };

  const handlePlay = (track) => {
    playTrack(track, results);
  };

  const handleAddFavorite = async (track) => {
    if (isGuest) {
      toast.info('Regístrate para guardar favoritos');
      return;
    }
    try {
      await api.post('/favorites', {
        external_track_id: track.id,
        source: track.source || 'spotify',
        track_title: track.name || track.title,
        artist: track.artist,
        album: track.album,
        album_image: track.albumImage || track.thumbnail,
        preview_url: track.previewUrl,
      });
      toast.success('Agregado a favoritos');
    } catch {
      console.warn('No se pudo agregar a favoritos');
    }
  };

  return (
    <div className="search-page">
      <form className="search-page-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="search-page-input"
          placeholder="Buscar canciones, artistas, álbumes..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoFocus
        />
        <button type="submit" className="search-page-btn">Buscar</button>
      </form>

      {loading && <p className="search-page-status">Buscando...</p>}

      {done && results.length === 0 && !loading && (
        <p className="search-page-status">No se encontraron resultados para &ldquo;{query}&rdquo;.</p>
      )}

      {results.length > 0 && (
        <>
          <div className="search-page-header">
            <h2>Resultados para &ldquo;{query}&rdquo;</h2>
            <Link to="/" className="search-page-back">Volver al inicio</Link>
          </div>
          <SearchResults
            results={results}
            onPlay={handlePlay}
            onAddFavorite={handleAddFavorite}
          />
        </>
      )}
    </div>
  );
}
