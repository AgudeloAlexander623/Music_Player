import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Topbar.css';

export default function Topbar({ searchQuery, onSearchChange, onSearchSubmit }) {
  const { user, isGuest, logout } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSearchSubmit) onSearchSubmit(e);
  };

  return (
    <header className="topbar">
      <div className="logo" onClick={() => navigate('/')}>
        Reproductor
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
          value={searchQuery}
          onChange={(e) => onSearchChange?.(e.target.value)}
        />
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
