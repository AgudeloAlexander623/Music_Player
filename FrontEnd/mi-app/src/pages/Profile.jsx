import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './Profile.css';

export default function Profile() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ favorites: 0, playlists: 0, searches: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [favRes, plRes] = await Promise.all([
          api.get('/favorites'),
          api.get('/playlists'),
        ]);
        setStats({
          favorites: (favRes.data.favorites || []).length,
          playlists: (plRes.data.playlists || []).length,
          searches: null,
        });
      } catch (err) {
        console.error('Error al cargar estadísticas:', err);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  const initial = user?.email?.charAt(0).toUpperCase() || '?';

  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-avatar">{initial}</div>
        <div className="profile-email">{user?.email}</div>
        <div className="profile-id">ID: {user?.userId || 'N/A'}</div>

        <div className="profile-stats">
          <div className="profile-stat">
            <div className="profile-stat-value">
              {loading ? '...' : stats.favorites}
            </div>
            <div className="profile-stat-label">Favoritos</div>
          </div>
          <div className="profile-stat">
            <div className="profile-stat-value">
              {loading ? '...' : stats.playlists}
            </div>
            <div className="profile-stat-label">Playlists</div>
          </div>
          <div className="profile-stat">
            <div className="profile-stat-value">{stats.searches !== null ? stats.searches : '—'}</div>
            <div className="profile-stat-label">Búsquedas</div>
          </div>
        </div>
      </div>

      <div className="profile-section">
        <div className="profile-section-title">Información de la cuenta</div>
        <div className="profile-section-content">
          <p><strong>Email:</strong> {user?.email}</p>
          <p><strong>Miembro desde:</strong> {new Date().toLocaleDateString()}</p>
          <p><strong>Sesión:</strong> Activa (JWT 24h)</p>
        </div>
      </div>
    </div>
  );
}
