import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

export default function Sidebar() {
  const { user, isGuest } = useAuth();
  const location = useLocation();

  const menuItems = [
    { to: '/', icon: '🎵', label: 'Inicio' },
    { to: '/favorites', icon: '⭐', label: 'Favoritos' },
    { to: '/playlists', icon: '📋', label: 'Playlists' },
    { to: '/profile', icon: '👤', label: 'Perfil' },
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
        <Link to="/profile" className="sidebar-profile" title={user?.email || 'Invitado'}>
          {isGuest ? '👤' : user?.email?.charAt(0).toUpperCase()}
        </Link>
      </div>
    </aside>
  );
}
