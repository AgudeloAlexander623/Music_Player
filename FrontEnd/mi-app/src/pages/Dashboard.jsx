import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import ContentSection from '../components/ContentSection';
import Sidebar from '../components/Sidebar';
import Player from '../components/Player';
import api from '../services/api';
import './Dashboard.css';

export default function Dashboard() {
  const [topPlaylists, setTopPlaylists] = useState([]);
  const [topArtists, setTopArtists] = useState([]);
  const [topAlbums, setTopAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [queue, setQueue] = useState([]);
  const [playlistFilter, setPlaylistFilter] = useState('');
  const [artistFilter, setArtistFilter] = useState('');
  const [albumFilter, setAlbumFilter] = useState('');
  const toast = useToast();
  const { isGuest } = useAuth();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch top playlists
      const playlistRes = await api.get('/playlists');
      setTopPlaylists(playlistRes.data.slice(0, 10) || []);

      // Fetch featured tracks for artists
      const tracksRes = await api.get('/search?q=popular&limit=20');
      const uniqueArtists = [];
      const seenArtists = new Set();

      if (tracksRes.data.tracks) {
        tracksRes.data.tracks.forEach((track) => {
          if (track.artist && !seenArtists.has(track.artist)) {
            seenArtists.add(track.artist);
            uniqueArtists.push({
              id: track.artist,
              name: track.artist,
              image: track.artistImage || 'https://via.placeholder.com/180',
            });
          }
        });
      }
      setTopArtists(uniqueArtists.slice(0, 10));

      // Fetch albums
      const albumRes = await api.get('/search?q=album&limit=20');
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

  const handlePlayItem = (item, type) => {
    const newTrack = {
      id: item.id,
      name: item.name,
      artist: item.subtitle || 'Artista desconocido',
      album: type === 'album' ? item.name : 'Álbum desconocido',
      albumImage: item.image,
      previewUrl: null,
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

  const handleAddFavorite = async (item) => {
    if (isGuest) {
      toast.info('Regístrate para guardar favoritos');
      return;
    }
    toast.success('Agregado a favoritos');
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
      <>
        <Sidebar />
        <div className="dashboard-loading">
          <p>Cargando dashboard...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Sidebar />
      <main className="dashboard">
        <div className="dashboard-header">
          <h1>Dashboard</h1>
        </div>

        <div className="dashboard-content">
          <ContentSection
            title="Top Playlists"
            items={filteredPlaylists}
            badge="Descer"
            onFilter={setPlaylistFilter}
            filterValue={playlistFilter}
          />

          <ContentSection
            title="Top Artists"
            items={filteredArtists}
            badge="Descer"
            onFilter={setArtistFilter}
            filterValue={artistFilter}
          />

          <ContentSection
            title="Top Albums"
            items={filteredAlbums}
            badge="Descer"
            onFilter={setAlbumFilter}
            filterValue={albumFilter}
          />
        </div>

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
    </>
  );
}
