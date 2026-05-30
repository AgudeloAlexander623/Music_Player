import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import ContentSection from '../components/ContentSection';
import SearchResults from '../components/SearchResults';
import Player from '../components/Player';
import api from '../services/api';
import './Dashboard.css';

export default function Dashboard() {
  const [topPlaylists, setTopPlaylists] = useState([]);
  const [topArtists, setTopArtists] = useState([]);
  const [topAlbums, setTopAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [queue, setQueue] = useState([]);
  const [playlistFilter, setPlaylistFilter] = useState('');
  const [artistFilter, setArtistFilter] = useState('');
  const [albumFilter, setAlbumFilter] = useState('');
  const toast = useToast();
  const { isGuest } = useAuth();
  const navigate = useNavigate();
  const searchInputRef = useRef(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (!searched && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searched]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [playlistRes, tracksRes, albumRes] = await Promise.all([
        api.get('/playlists'),
        api.get('/search?q=popular&limit=20'),
        api.get('/search?q=album&limit=20'),
      ]);

      setTopPlaylists(playlistRes.data.playlists?.slice(0, 10) || []);

      const uniqueArtists = [];
      const seenArtists = new Set();
      if (tracksRes.data.tracks) {
        tracksRes.data.tracks.forEach((track) => {
          if (track.artist && !seenArtists.has(track.artist)) {
            seenArtists.add(track.artist);
            uniqueArtists.push({
              id: track.artist,
              name: track.artist,
              image: track.albumImage || 'https://via.placeholder.com/180',
              previewUrl: track.previewUrl,
            });
          }
        });
      }
      setTopArtists(uniqueArtists.slice(0, 10));

      const uniqueAlbums = [];
      const seenAlbums = new Set();
      if (albumRes.data.tracks) {
        albumRes.data.tracks.forEach((track) => {
          const albumKey = track.album;
          if (albumKey && !seenAlbums.has(albumKey)) {
            seenAlbums.add(albumKey);
            uniqueAlbums.push({
              id: albumKey,
              name: track.album,
              subtitle: track.artist,
              image: track.albumImage || 'https://via.placeholder.com/180',
              previewUrl: track.previewUrl,
            });
          }
        });
      }
      setTopAlbums(uniqueAlbums.slice(0, 10));
    } catch (error) {
      toast.error('Error cargando datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      toast.info('Escribe al menos 2 caracteres');
      return;
    }
    setSearching(true);
    setSearched(true);
    try {
      const res = await api.get(`/search?q=${encodeURIComponent(searchQuery.trim())}&limit=20`);
      setSearchResults(res.data.tracks || []);
      if (!res.data.tracks?.length) {
        toast.info('Sin resultados');
      }
    } catch {
      toast.error('Error en la búsqueda');
    } finally {
      setSearching(false);
    }
  };

  const handlePlaySearchResult = (track) => {
    setQueue(searchResults);
    setCurrentTrack(track);
  };

  const handlePlayItem = (item, type) => {
    const newTrack = {
      id: item.id,
      name: item.name,
      artist: item.subtitle || item.name || 'Artista desconocido',
      album: type === 'album' ? item.name : 'Álbum desconocido',
      albumImage: item.image,
      previewUrl: item.previewUrl ?? null,
      source: 'internal',
    };
    setCurrentTrack(newTrack);
    setQueue([newTrack]);
  };

  const handlePlayNext = () => {
    const idx = queue.findIndex((t) => t.id === currentTrack?.id);
    if (idx >= 0 && idx < queue.length - 1) {
      setCurrentTrack(queue[idx + 1]);
    }
  };

  const handlePlayPrevious = () => {
    const idx = queue.findIndex((t) => t.id === currentTrack?.id);
    if (idx > 0) {
      setCurrentTrack(queue[idx - 1]);
    }
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
        track_title: track.name,
        artist: track.artist,
        album: track.album,
        album_image: track.albumImage,
        preview_url: track.previewUrl,
      });
      toast.success('Agregado a favoritos');
    } catch {
      toast.error('No se pudo agregar a favoritos');
    }
  };

  const filteredPlaylists = topPlaylists.filter((p) =>
    p.name?.toLowerCase().includes(playlistFilter.toLowerCase())
  );
  const filteredArtists = topArtists.filter((a) =>
    a.name?.toLowerCase().includes(artistFilter.toLowerCase())
  );
  const filteredAlbums = topAlbums.filter((a) =>
    a.name?.toLowerCase().includes(albumFilter.toLowerCase())
  );

  if (loading) {
    return (
      <div className="dashboard-loading">
        <p>Cargando dashboard...</p>
      </div>
    );
  }

  return (
    <main className="dashboard">
      <div className="dashboard-header">
        <h1>Inicio</h1>
        <form className="dashboard-search" onSubmit={handleSearch}>
          <input
            ref={searchInputRef}
            type="text"
            className="dashboard-search-input"
            placeholder="Busca canciones, artistas o álbumes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="dashboard-search-btn" disabled={searching}>
            {searching ? 'Buscando...' : '🔍'}
          </button>
        </form>
      </div>

      {searched && (
        <div className="dashboard-search-results">
          <div className="search-results-header">
            <h2>Resultados para "{searchQuery}"</h2>
            <button className="search-back-btn" onClick={() => setSearched(false)}>
              Volver
            </button>
          </div>
          <SearchResults
            results={searchResults}
            onPlay={handlePlaySearchResult}
            onAddFavorite={handleAddFavorite}
          />
        </div>
      )}

      {!searched && (
        <div className="dashboard-content">
          <ContentSection
            title="Mis Playlists"
            items={filteredPlaylists}
            badge="Descubrir"
            onFilter={setPlaylistFilter}
            filterValue={playlistFilter}
            onPlay={(item) => handlePlayItem(item, 'playlist')}
          />

          <ContentSection
            title="Artistas Populares"
            items={filteredArtists}
            badge="Descubrir"
            onFilter={setArtistFilter}
            filterValue={artistFilter}
            onPlay={(item) => handlePlayItem(item, 'artist')}
          />

          <ContentSection
            title="Álbumes"
            items={filteredAlbums}
            badge="Descubrir"
            onFilter={setAlbumFilter}
            filterValue={albumFilter}
            onPlay={(item) => handlePlayItem(item, 'album')}
          />
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
    </main>
  );
}
