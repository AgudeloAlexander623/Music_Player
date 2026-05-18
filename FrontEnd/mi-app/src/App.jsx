import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useToast } from './components/Toast';
import api from './services/api';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Favorites from './pages/Favorites';
import Playlists from './pages/Playlists';
import Profile from './pages/Profile';
import SearchResults from './components/SearchResults';
import Player from './components/Player';
import './pages/Home.css';
import './App.css';

function Home() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [queue, setQueue] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const toast = useToast();

  const handleSearch = async (e, pageNum = 1) => {
    e?.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await api.get(`/search?q=${encodeURIComponent(query)}&page=${pageNum}&limit=10`);
      const tracks = res.data.tracks || [];
      if (pageNum === 1) {
        setResults(tracks);
      } else {
        setResults((prev) => [...prev, ...tracks]);
      }
      setHasMore(tracks.length === 10);
      setPage(pageNum);
      if (res.data.warnings) {
        res.data.warnings.forEach((w) => toast.info(w));
      }
    } catch {
      toast.error('Error en la búsqueda. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    handleSearch(null, page + 1);
  };

  const handlePlay = (track) => {
    const trackQueue = results.filter((t) => t.previewUrl);
    setQueue(trackQueue);
    setCurrentTrack(track);
  };

  const handlePlayNext = () => {
    const idx = queue.findIndex((t) => t.id === currentTrack?.id && t.source === currentTrack?.source);
    if (idx >= 0 && idx < queue.length - 1) {
      setCurrentTrack(queue[idx + 1]);
    }
  };

  const handlePlayPrevious = () => {
    const idx = queue.findIndex((t) => t.id === currentTrack?.id && t.source === currentTrack?.source);
    if (idx > 0) {
      setCurrentTrack(queue[idx - 1]);
    }
  };

  const handleAddFavorite = async (track) => {
    try {
      await api.post('/favorites', {
        external_track_id: track.id,
        source: track.source || 'spotify',
        track_title: track.name,
        artist: track.artist,
        album: track.album,
        preview_url: track.previewUrl,
      });
      toast.success('Agregado a favoritos');
    } catch {
      toast.error('No se pudo agregar a favoritos');
    }
  };

  return (
    <>
      <Navbar />
      <div className="home-container">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar canciones, artistas..."
            className="search-input"
          />
          <button type="submit" disabled={loading} className="search-btn">
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </form>

        <SearchResults
          results={results}
          onPlay={handlePlay}
          onAddFavorite={handleAddFavorite}
        />

        {results.length > 0 && hasMore && (
          <div className="load-more-container">
            <button onClick={handleLoadMore} disabled={loading} className="load-more-btn">
              {loading ? 'Cargando...' : 'Cargar más resultados'}
            </button>
          </div>
        )}

        {currentTrack && (
          <Player
            track={currentTrack}
            queue={queue}
            onPlayNext={handlePlayNext}
            onPlayPrevious={handlePlayPrevious}
            onClose={() => setCurrentTrack(null)}
          />
        )}
      </div>
    </>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <div>Cargando...</div>;

  return user ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/favorites"
          element={
            <ProtectedRoute>
              <Favorites />
            </ProtectedRoute>
          }
        />
        <Route
          path="/playlists"
          element={
            <ProtectedRoute>
              <Playlists />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
