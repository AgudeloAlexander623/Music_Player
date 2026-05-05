import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import api from './services/api';
import Login from './pages/Login';
import Register from './pages/Register';
import SearchResults from './components/SearchResults';
import Player from './components/Player';
import './App.css';

function Home() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const { logout } = useAuth();

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
        trackId: track.id,
        name: track.name,
        artist: track.artist,
        album: track.album,
        previewUrl: track.previewUrl,
        albumImage: track.albumImage,
      });
      alert('Agregado a favoritos');
    } catch (err) {
      console.error('Error al agregar favorito:', err);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 20, paddingBottom: 80 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1>🎵 Reproductor</h1>
        <button onClick={logout}>Cerrar Sesión</button>
      </div>

      <form onSubmit={handleSearch} style={{ marginBottom: 20 }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar canciones, artistas..."
          style={{ width: '70%', padding: 10, fontSize: 16 }}
        />
        <button type="submit" disabled={loading} style={{ padding: '10px 20px', marginLeft: 10 }}>
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
      </Routes>
    </BrowserRouter>
  );
}
