import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Topbar.css';

export default function Topbar() {
  const { user, isGuest, logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length >= 2) {
      navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  };

  return (
    <header className="topbar">
      <div className="logo" onClick={() => navigate('/')}>
        <span className="logo-brand">SoundWave</span>
        <span className="logo-suffix">Music</span>
      </div>

      <div className="navigation">
        <button onClick={() => navigate(-1)}>◀</button>
        <button onClick={() => navigate(1)}>▶</button>
      </div>

      <form className="search-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Search music..."
          className="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" className="search-btn" title="Buscar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
      </form>

      <div className="topbar-right">
        {user && (
          <span className="topbar-user">
            {isGuest ? 'Invitado' : user.email}
          </span>
        )}
        <button className="profile" onClick={() => navigate('/profile')}>
          {isGuest ? '👤' : user?.email?.charAt(0).toUpperCase() || 'U'}
        </button>
        {user && (
          <button className="topbar-logout" onClick={logout}>
            Salir
          </button>
        )}
      </div>
    </header>
  );
}
