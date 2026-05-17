import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import api from './services/api';
import Login from './pages/Login';
import Register from './pages/Register';
import Favorites from './pages/Favorites';
import Playlists from './pages/Playlists';
import SearchResults from './components/SearchResults';
import Player from './components/Player';
import './pages/Home.css';
import './App.css';

function Home() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const { user, logout } = useAuth();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await api.get(`/search?q=${encodeURIComponent(query)}`);
      setResults(res.data.tracks || []);
    } catch (err) {
      console.error('Error en búsqueda:', err);
    } finally {
      setLoading(false);
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
      alert('Agregado a favoritos');
    } catch (err) {
      console.error('Error al agregar favorito:', err);
    }
  };

  return (
    <div className="home-container">
      <div className="home-header">
        <h1>🎵 Reproductor</h1>
        <div className="home-header-actions">
          <Link to="/favorites" className="nav-link">⭐ Favoritos</Link>
          <Link to="/playlists" className="nav-link">📋 Playlists</Link>
          <span style={{ fontSize: 14, color: '#666' }}>{user?.email}</span>
          <button className="logout-btn" onClick={logout}>Cerrar Sesión</button>
        </div>
      </div>

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
        onPlay={setCurrentTrack}
        onAddFavorite={handleAddFavorite}
      />

      {currentTrack && (
        <Player
          track={currentTrack}
          onClose={() => setCurrentTrack(null)}
        />
      )}
    </div>
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
      </Routes>
    </BrowserRouter>
  );
}
