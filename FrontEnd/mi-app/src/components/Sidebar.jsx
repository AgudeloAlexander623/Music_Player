import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

const defaultIcon = (
  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M20 2.75a.75.75 0 0 0-.965-.718l-10 3a.75.75 0 0 0-.535.718v9.877a3.5 3.5 0 1 0 1.496 2.702.756.756 0 0 0 .004-.079v-7.942l8.5-2.55v5.87a3.5 3.5 0 1 0 1.496 2.702.764.764 0 0 0 .004-.08V2.75Z"
      fill="currentColor"
    />
  </svg>
);

const menuItems = [
  { to: '/', icon: defaultIcon, label: 'Dashboard' },
  { to: '/favorites?tab=albums', icon: defaultIcon, label: 'Favorite Albums' },
  { to: '/favorites?tab=tracks', icon: defaultIcon, label: 'Favorite Tracks' },
  { to: '/favorites?tab=artists', icon: defaultIcon, label: 'Favorite Artists' },
  { to: '/playlists', icon: defaultIcon, label: 'Playlists' },
  { to: '/profile', icon: defaultIcon, label: 'Preferences' },
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
