import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

const menuItems = [
  { to: '/', icon: '🎵', label: 'Dashboard' },
  { to: '/favorites?tab=albums', icon: '💿', label: 'Favorite Albums' },
  { to: '/favorites?tab=tracks', icon: '🎶', label: 'Favorite Tracks' },
  { to: '/favorites?tab=artists', icon: '👤', label: 'Favorite Artists' },
  { to: '/playlists', icon: '📋', label: 'Playlists' },
  { to: '/profile', icon: '⚙️', label: 'Preferences' },
];

export default function Sidebar() {
  const location = useLocation();

  const isActive = (to) => {
    const path = to.split('?')[0];
    return location.pathname === path;
  };

  return (
    <aside className="sidebar">
      <nav>
        <ul>
          {menuItems.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                className={`sidebar-link ${isActive(item.to) ? 'active' : ''}`}
              >
                <span className="sidebar-icon">{item.icon}</span>
                <span className="sidebar-label">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
