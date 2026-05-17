import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const links = [
  { to: '/', label: '🎵 Inicio' },
  { to: '/favorites', label: '⭐ Favoritos' },
  { to: '/playlists', label: '📋 Playlists' },
  { to: '/profile', label: '👤 Perfil' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">Reproductor</Link>

      <div className="navbar-links">
        {links.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className={`navbar-link ${location.pathname === to ? 'active' : ''}`}
          >
            {label}
          </Link>
        ))}

        {user && (
          <>
            <span className="navbar-user">{user.email}</span>
            <button className="navbar-logout" onClick={logout}>
              Salir
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
