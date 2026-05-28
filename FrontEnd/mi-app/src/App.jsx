import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { setNavigate } from './services/navigate.js';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import Favorites from './pages/Favorites';
import Playlists from './pages/Playlists';
import Profile from './pages/Profile';
import './pages/Dashboard.css';
import './App.css';

function NavigateSetter() {
  const navigate = useNavigate();
  useEffect(() => {
    setNavigate(navigate);
  }, [navigate]);
  return null;
}

function ProtectedLayout({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="auth-container"><p>Verificando sesión...</p></div>;

  if (!user) return <Navigate to="/login" />;

  return (
    <>
      <Sidebar />
      {children}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <NavigateSetter />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <ProtectedLayout>
              <Dashboard />
            </ProtectedLayout>
          }
        />
        <Route
          path="/favorites"
          element={
            <ProtectedLayout>
              <Favorites />
            </ProtectedLayout>
          }
        />
        <Route
          path="/playlists"
          element={
            <ProtectedLayout>
              <Playlists />
            </ProtectedLayout>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedLayout>
              <Profile />
            </ProtectedLayout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
