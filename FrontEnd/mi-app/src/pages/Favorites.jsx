import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePlayer } from '../App';
import { useToast } from '../components/Toast';
import api from '../services/api';
import '../components/ContentSection.css';
import './Favorites.css';

export default function Favorites() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'tracks';
  const { playTrack } = usePlayer();
  const toast = useToast();

  const setTab = (newTab) => setSearchParams({ tab: newTab });

  const loadFavorites = useCallback(async () => {
    try {
      const res = await api.get('/favorites');
      setFavorites(res.data.favorites || []);
    } catch {
      console.warn('Error al cargar favoritos');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const handleRemoveFavorite = async (id) => {
    try {
      await api.delete(`/favorites/${id}`);
      setFavorites((prev) => prev.filter((f) => f.id !== id));
      toast.success('Eliminado de favoritos');
    } catch {
      console.warn('No se pudo eliminar el favorito');
    }
  };

  const mapFavoriteToTrack = (fav) => ({
    id: fav.external_track_id,
    name: fav.track_title,
    artist: fav.artist,
    album: fav.album,
    albumImage: fav.album_image || null,
    previewUrl: fav.preview_url,
    videoId: fav.video_id || null,
    source: fav.source,
  });

  const handlePlay = (fav) => {
    const queue = favorites.map(mapFavoriteToTrack);
    playTrack(mapFavoriteToTrack(fav), queue);
  };

  const tabs = [
    { key: 'tracks', label: 'Tracks' },
    { key: 'albums', label: 'Albums' },
    { key: 'artists', label: 'Artists' },
  ];

  const visibleTracks =
    tab === 'tracks'
      ? favorites
      : [];

  const groupedAlbums =
    tab === 'albums'
      ? favorites.reduce((acc, fav) => {
          const key = `${fav.album || 'Sin álbum'}||${fav.artist || ''}`;
          if (!acc[key]) {
            acc[key] = { name: fav.album || 'Sin álbum', subtitle: fav.artist, image: fav.album_image, tracks: [] };
          }
          acc[key].tracks.push(fav);
          return acc;
        }, {})
      : {};

  const groupedArtists =
    tab === 'artists'
      ? favorites.reduce((acc, fav) => {
          const key = fav.artist || 'Desconocido';
          if (!acc[key]) {
            acc[key] = { name: key, subtitle: `${favorites.filter((f) => (f.artist || 'Desconocido') === key).length} tracks`, image: fav.album_image, tracks: [] };
          }
          acc[key].tracks.push(fav);
          return acc;
        }, {})
      : {};

  const albums = Object.values(groupedAlbums);
  const artists = Object.values(groupedArtists);

  const handlePlayList = (list) => {
    if (!list.length) return;
    const queue = list.map(mapFavoriteToTrack);
    playTrack(mapFavoriteToTrack(list[0]), queue);
  };

  return (
    <>
      <h1>Favorites</h1>

      <div className="tab-bar">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`tab-btn ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p className="loading-text">Cargando favoritos...</p>}

      {!loading && favorites.length === 0 && (
        <p className="empty-text">
          No tienes favoritos aún. Busca canciones y agrégalas desde la pantalla principal.
        </p>
      )}

      {!loading && favorites.length > 0 && tab === 'tracks' && (
        <div className="favorites-list">
          {visibleTracks.map((fav) => (
            <div key={fav.id} className="favorite-item">
              {fav.album_image && (
                <img src={fav.album_image} alt="" className="fav-image" />
              )}
              <div className="favorite-info">
                <div className="favorite-title">{fav.track_title}</div>
                <div className="favorite-artist">{fav.artist}</div>
                {fav.source && (
                  <span className="favorite-source">{fav.source}</span>
                )}
              </div>
              <div className="favorite-actions">
                {(fav.preview_url || fav.video_id) && (
                  <button className="action-btn" onClick={() => handlePlay(fav)}>▶</button>
                )}
                <button className="action-btn" onClick={() => handleRemoveFavorite(fav.id)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && favorites.length > 0 && tab === 'albums' && (
        <div className="playlist-grid">
          {albums.map((album) => (
            <div key={album.name} className="card" onClick={() => handlePlayList(album.tracks)}>
              <div className="card-image">
                <img src={album.image || 'https://via.placeholder.com/180'} alt={album.name} />
                <div className="card-overlay">
                  <button className="card-play-btn" onClick={(e) => { e.stopPropagation(); handlePlayList(album.tracks); }} aria-label={`Reproducir ${album.name}`}>▶</button>
                </div>
              </div>
              <div className="card-info">
                <h3 className="card-name">{album.name}</h3>
                {album.subtitle && <p className="card-subtitle">{album.subtitle}</p>}
                <p className="card-subtitle">{album.tracks.length} tracks</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && favorites.length > 0 && tab === 'artists' && (
        <div className="playlist-grid">
          {artists.map((artist) => (
            <div key={artist.name} className="card" onClick={() => handlePlayList(artist.tracks)}>
              <div className="card-image">
                <img src={artist.image || 'https://via.placeholder.com/180'} alt={artist.name} />
                <div className="card-overlay">
                  <button className="card-play-btn" onClick={(e) => { e.stopPropagation(); handlePlayList(artist.tracks); }} aria-label={`Reproducir ${artist.name}`}>▶</button>
                </div>
              </div>
              <div className="card-info">
                <h3 className="card-name">{artist.name}</h3>
                {artist.subtitle && <p className="card-subtitle">{artist.subtitle}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
