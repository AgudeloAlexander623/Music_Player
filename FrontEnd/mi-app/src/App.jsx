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
  const toast = useToast();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await api.get(`/search?q=${encodeURIComponent(query)}`);
      setResults(res.data.tracks || []);
      if (res.data.warning) toast.info(res.data.warning);
    } catch {
      toast.error('Error en la búsqueda. Intenta de nuevo.');
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
