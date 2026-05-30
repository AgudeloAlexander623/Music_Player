import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './Profile.css';

export default function Profile() {
  const { user, isGuest } = useAuth();
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

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString()
    : null;
  const initial = isGuest ? '?' : (user?.email?.charAt(0).toUpperCase() || '?');

  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-avatar">{initial}</div>
        <div className="profile-email">
          {isGuest ? '👤 Modo Invitado' : user?.email}
        </div>
        <div className="profile-id">
          {isGuest ? 'Sesión temporal' : `ID: ${user?.userId || 'N/A'}`}
        </div>

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
          {isGuest ? (
            <p className="auth-link">
              <Link to="/register">Regístrate</Link> o <Link to="/login">inicia sesión</Link> para guardar tus canciones favoritas y crear playlists.
            </p>
          ) : (
            <>
              <p><strong>Email:</strong> {user?.email}</p>
              <p><strong>Miembro desde:</strong> {memberSince || '—'}</p>
              <p><strong>Sesión:</strong> Activa (JWT 24h)</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
