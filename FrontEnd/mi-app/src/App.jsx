import { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { setNavigate } from './services/navigate.js';
import Topbar from './components/Topbar';
import Sidebar from './components/Sidebar';
import PlaylistPanel from './components/PlaylistPanel';
import Player from './components/Player';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import Favorites from './pages/Favorites';
import Playlists from './pages/Playlists';
import Profile from './pages/Profile';
import './App.css';

const PlayerContext = createContext();

export function usePlayer() {
  return useContext(PlayerContext);
}

function NavigateSetter() {
  const navigate = useNavigate();
  useEffect(() => {
    setNavigate(navigate);
  }, [navigate]);
  return null;
}

function ProtectedLayout() {
  const { user, loading } = useAuth();
  const [currentTrack, setCurrentTrack] = useState(null);
  const [queue, setQueue] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const playTrack = (track, q) => {
    setQueue(q || [track]);
    setCurrentTrack(track);
  };

  const handlePlayNext = (index) => {
    if (index !== undefined && queue[index]) {
      setCurrentTrack(queue[index]);
      return;
    }
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

  if (loading) {
    return <div className="auth-container"><p>Verificando sesión...</p></div>;
  }

  if (!user) return <Navigate to="/login" />;

  return (
    <PlayerContext.Provider value={{ currentTrack, queue, playTrack, searchQuery, setSearchQuery }}>
      <Topbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      <main className="container">
        <Sidebar />
        <section className="content">
          <Outlet />
        </section>
        <PlaylistPanel currentTrack={currentTrack} />
      </main>

      {currentTrack && (
        <Player
          track={currentTrack}
          queue={queue}
          onPlayNext={handlePlayNext}
          onPlayPrevious={handlePlayPrevious}
          onClose={() => { setCurrentTrack(null); setQueue([]); }}
        />
      )}
    </PlayerContext.Provider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <NavigateSetter />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<ProtectedLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="favorites" element={<Favorites />} />
          <Route path="playlists" element={<Playlists />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
