import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

export default function SpotifyCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { completeSocialLogin } = useAuth();
  const [status, setStatus] = useState('Procesando inicio de sesión...');

  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      setStatus('No se pudo completar el inicio de sesión con Spotify.');
      const timer = setTimeout(() => navigate('/login', { replace: true }), 2000);
      return () => clearTimeout(timer);
    }

    const token = searchParams.get('token');
    const refreshToken = searchParams.get('refresh_token');
    const rawUser = searchParams.get('user');

    if (!token || !rawUser) {
      setStatus('Respuesta incompleta del servidor.');
      const timer = setTimeout(() => navigate('/login', { replace: true }), 2000);
      return () => clearTimeout(timer);
    }

    try {
      const user = JSON.parse(rawUser);
      completeSocialLogin({ token, refreshToken, user });
      setStatus('Sesión iniciada con Spotify. Redirigiendo...');
      navigate('/', { replace: true });
    } catch {
      setStatus('Error al procesar la sesión.');
      const timer = setTimeout(() => navigate('/login', { replace: true }), 2000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, completeSocialLogin, navigate]);

  return (
    <div className="auth-container">
      <h2 className="auth-title">Spotify</h2>
      <p className="auth-status">{status}</p>
    </div>
  );
}