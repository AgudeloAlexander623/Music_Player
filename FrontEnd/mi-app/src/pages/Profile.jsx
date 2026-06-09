import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { getEnabledPlugins, saveEnabledPlugins } from '../utils/pluginStorage';
import './Profile.css';

export default function Profile() {
  const { user, isGuest } = useAuth();
  const [stats, setStats] = useState({ favorites: 0, playlists: 0 });
  const [loading, setLoading] = useState(true);
  const [plugins, setPlugins] = useState([]);
  const [enabledPlugins, setEnabledPlugins] = useState([]);
  const [pluginsLoading, setPluginsLoading] = useState(true);

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
        });
      } catch (err) {
        console.error('Error al cargar estadísticas:', err);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/plugins');
        const availablePlugins = res.data.plugins || [];
        setPlugins(availablePlugins);
        setEnabledPlugins(getEnabledPlugins(availablePlugins));
      } catch (err) {
        console.error('Error al cargar plugins:', err);
      } finally {
        setPluginsLoading(false);
      }
    })();
  }, []);

  const togglePlugin = (name) => {
    setEnabledPlugins((prev) => {
      const next = prev.includes(name)
        ? prev.filter((p) => p !== name)
        : [...prev, name];
      saveEnabledPlugins(next);
      return next;
    });
  };

  const allDisabled = !pluginsLoading && plugins.length > 0 && enabledPlugins.length === 0;

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString()
    : null;
  const initial = isGuest ? '?' : (user?.email?.charAt(0).toUpperCase() || '?');

  return (
    <>
      <h1>Preferences</h1>

      <div className="profile-card">
        <div className="profile-avatar">{initial}</div>
        <div className="profile-email">
          {isGuest ? '\u{1F464} Modo Invitado' : user?.email}
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
        </div>
      </div>

      <div className="profile-section">
        <div className="profile-section-title">Plugins de búsqueda</div>
        <div className="profile-section-content">
          {pluginsLoading ? (
            <p className="profile-muted">Cargando plugins...</p>
          ) : (
            <>
              {plugins.length === 0 ? (
                <p className="profile-muted">No hay plugins disponibles.</p>
              ) : (
                <div className="plugin-toggles">
                  {plugins.map((p) => {
                    const isEnabled = enabledPlugins.includes(p.name);
                    return (
                      <label
                        key={p.name}
                        className={`plugin-toggle ${!p.configured ? 'plugin-toggle-unavailable' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          disabled={!p.configured}
                          onChange={() => togglePlugin(p.name)}
                        />
                        <span className="plugin-toggle-label">{p.description}</span>
                        {!p.configured && (
                          <span className="plugin-toggle-status">(no configurado)</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
              {allDisabled && (
                <div className="plugin-warning" role="alert">
                  Todos los plugins están desactivados. La aplicación no funcionará de manera efectiva. Activa al menos un plugin para poder buscar música.
                </div>
              )}
            </>
          )}
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
              <p><strong>Miembro desde:</strong> {memberSince || '\u2014'}</p>
              <p><strong>Sesión:</strong> Activa (JWT 24h)</p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
