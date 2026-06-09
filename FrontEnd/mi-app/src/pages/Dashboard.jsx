import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePlayer } from '../App';
import ContentSection from '../components/ContentSection';
import SearchResults from '../components/SearchResults';
import api from '../services/api';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { getAllEnabled } from '../utils/pluginStorage';
import './Dashboard.css';

export default function Dashboard() {
  const { searchQuery, setSearchQuery, playTrack } = usePlayer();
  const [topPlaylists, setTopPlaylists] = useState([]);
  const [topArtists, setTopArtists] = useState([]);
  const [topAlbums, setTopAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [playlistFilter, setPlaylistFilter] = useState('');
  const [artistFilter, setArtistFilter] = useState('');
  const [albumFilter, setAlbumFilter] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const toast = useToast();
  const { isGuest } = useAuth();
  const { allDisabled, sourcesParam } = useMemo(() => {
    const stored = getAllEnabled();
    return {
      allDisabled: stored !== null && stored.length === 0,
      sourcesParam: stored && stored.length > 0 ? stored.join(',') : null,
    };
  }, []);

  useEffect(() => {
    if (!allDisabled) {
      fetchDashboardData();
    } else {
      setLoading(false);
    }
  }, [allDisabled]);

  useEffect(() => {
    if (allDisabled) return;
    if (searchQuery.length >= 2) {
      handleSearch();
    } else if (searchQuery.length === 0) {
      setSearched(false);
      setSearchResults([]);
    }
  }, [searchQuery, allDisabled]);

  const buildSearchUrl = (query, limit = 20) => {
    let url = `/search?q=${encodeURIComponent(query.trim())}&limit=${limit}`;
    if (sourcesParam) url += `&sources=${sourcesParam}`;
    return url;
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [playlistRes, tracksRes, albumRes] = await Promise.all([
        api.get('/playlists'),
        api.get(buildSearchUrl('popular')),
        api.get(buildSearchUrl('album')),
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

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return;
    setSearching(true);
    setSearched(true);
    try {
      const res = await api.get(buildSearchUrl(searchQuery.trim()));
      setSearchResults(res.data.tracks || []);
    } catch {
      toast.error('Error en la búsqueda');
    } finally {
      setSearching(false);
    }
  };

  const handlePlaySearchResult = (track) => {
    playTrack(track, searchResults);
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
    playTrack(newTrack, [newTrack]);
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
    <>
      <h1>Dashboard</h1>

      {allDisabled && (
        <div className="dashboard-plugin-warning" role="alert">
          <strong>Todos los plugins están desactivados.</strong> La aplicación no funcionará de manera efectiva.{' '}
          <Link to="/profile">Activa al menos un plugin en Preferencias</Link> para poder buscar música.
        </div>
      )}

      {searched && (
        <div className="dashboard-search-results">
          <div className="search-results-header">
            <h2>Results for "{searchQuery}"</h2>
            <button className="back-btn" onClick={() => { setSearched(false); setSearchQuery(''); }}>
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
        <>
          <div className="playlist-header">
            <h2>Top Playlists</h2>
            <div className="filters">
              <button className="scroll-btn" onClick={() => document.querySelector('.items-container')?.scrollBy({ left: -400, behavior: 'smooth' })}>◀</button>
              <select value={selectedGenre} onChange={(e) => setSelectedGenre(e.target.value)}>
                <option value="All">All</option>
                <option value="Rock">Rock</option>
                <option value="Pop">Pop</option>
                <option value="Electronic">Electronic</option>
              </select>
              <button className="scroll-btn" onClick={() => document.querySelector('.items-container')?.scrollBy({ left: 400, behavior: 'smooth' })}>▶</button>
            </div>
          </div>

          <ContentSection
            title="Top Playlists"
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
        </>
      )}
    </>
  );
}
