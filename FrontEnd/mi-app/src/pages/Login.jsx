import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import './Auth.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const { login, guestLogin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Sesión iniciada');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setGuestLoading(true);
    try {
      await guestLogin();
      toast.info('Explorando como invitado');
      navigate('/');
    } catch {
      toast.error('No se pudo iniciar sesión como invitado');
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2 className="auth-title">Iniciar Sesión</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="auth-input"
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="auth-input"
        />
        <button type="submit" disabled={loading} className="auth-button">
          {loading ? 'Cargando...' : 'Iniciar Sesión'}
        </button>
      </form>

      <div className="auth-divider">
        <span className="auth-divider-line" />
        <span className="auth-divider-text">o</span>
        <span className="auth-divider-line" />
      </div>

      <button
        onClick={handleGuestLogin}
        disabled={guestLoading}
        className="auth-button auth-button-guest"
      >
        {guestLoading ? 'Cargando...' : 'Explorar como invitado'}
      </button>

      <p className="auth-link">
        ¿No tienes cuenta? <Link to="/register">Regístrate</Link>
      </p>
    </div>
  );
}
