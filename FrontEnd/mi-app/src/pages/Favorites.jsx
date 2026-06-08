import { useState, useEffect, useCallback } from 'react';
import { usePlayer } from '../App';
import { useToast } from '../components/Toast';
import api from '../services/api';
import './Favorites.css';

export default function Favorites() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('tracks');
  const { playTrack } = usePlayer();
  const toast = useToast();

  const loadFavorites = useCallback(async () => {
    try {
      const res = await api.get('/favorites');
      setFavorites(res.data.favorites || []);
    } catch {
      toast.error('Error al cargar favoritos');
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
      toast.error('No se pudo eliminar el favorito');
    }
  };

  const mapFavoriteToTrack = (fav) => ({
    id: fav.external_track_id,
    name: fav.track_title,
    artist: fav.artist,
    album: fav.album,
    albumImage: fav.album_image || null,
    previewUrl: fav.preview_url,
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

  return (
    <>
      <h1>⭐ Favorites</h1>

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

      <div className="favorites-list">
        {favorites.map((fav) => (
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
              {fav.preview_url && (
                <button className="action-btn" onClick={() => handlePlay(fav)}>▶️</button>
              )}
              <button className="action-btn" onClick={() => handleRemoveFavorite(fav.id)}>🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
