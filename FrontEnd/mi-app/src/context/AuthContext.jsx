import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const isGuest = user && user.guest === true;
  const isAuthenticated = !!user;

  const verifySession = useCallback(async () => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser.guest) {
          setUser(parsedUser);
        } else {
          const res = await api.post('/auth/verify');
          setUser(res.data.user);
        }
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    verifySession();
  }, [verifySession]);

  useEffect(() => {
    const handleAuthLogout = () => {
      setUser(null);
    };
    window.addEventListener('auth:logout', handleAuthLogout);
    return () => window.removeEventListener('auth:logout', handleAuthLogout);
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data;
  }, []);

  const register = useCallback(async (email, password, username) => {
    const res = await api.post('/auth/register', { email, password, username });
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data;
  }, []);

  const guestLogin = useCallback(async () => {
    try {
      const res = await api.post('/auth/guest');
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setUser(res.data.user);
      return res.data;
    } catch (err) {
      console.warn('Guest API falló, usando modo invitado local:', err?.message);
      const guestUser = { guest: true };
      localStorage.removeItem('token');
      localStorage.setItem('user', JSON.stringify(guestUser));
      setUser(guestUser);
      return { user: guestUser };
    }
  }, []);

  const logout = useCallback(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    let isLocalGuest = false;
    try {
      isLocalGuest = storedUser && JSON.parse(storedUser).guest === true;
    } catch {
      isLocalGuest = false;
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
    if (token && !isLocalGuest) {
      api.post('/auth/logout').catch(() => {});
    }
  }, []);

  const completeSocialLogin = useCallback(({ token, refreshToken, user }) => {
    localStorage.setItem('token', token);
    if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
  }, []);

  const value = useMemo(() => ({
    user, login, register, guestLogin, logout, completeSocialLogin, loading,
    isGuest, isAuthenticated,
  }), [user, login, register, guestLogin, logout, completeSocialLogin, loading, isGuest, isAuthenticated]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
