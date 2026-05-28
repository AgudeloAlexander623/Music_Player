import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

export default function Sidebar() {
  const { user, isGuest, logout } = useAuth();
  const location = useLocation();

  const menuItems = [
    { to: '/', icon: '🎵', label: 'Dashboard' },
    { to: '/favorites-albums', icon: '💿', label: 'Favorite albums' },
    { to: '/favorites-tracks', icon: '🎶', label: 'Favorite tracks' },
    { to: '/favorites-artists', icon: '👤', label: 'Favorite artists' },
    { to: '/playlists', icon: '📋', label: 'Playlists' },
    { to: '/sources', icon: '⚙️', label: 'Sources' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Link to="/" className="sidebar-logo">
          <span className="logo-icon">🎵</span>
        </Link>
      </div>

      <nav className="sidebar-menu">
        {menuItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`sidebar-menu-item ${location.pathname === item.to ? 'active' : ''}`}
          >
            <span className="menu-icon">{item.icon}</span>
            <span className="menu-label">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-settings">⚙️</button>
        {user && (
          <button className="sidebar-profile" title={user.email || 'Invitado'}>
            {isGuest ? '👤' : user.email?.charAt(0).toUpperCase()}
          </button>
        )}
      </div>
    </aside>
  );
}
