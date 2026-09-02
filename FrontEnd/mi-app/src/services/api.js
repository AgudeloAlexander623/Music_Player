import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : '/api',
  timeout: 10000,
});

// Interceptor para agregar token JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach((prom) => (error ? prom.reject(error) : prom.resolve()));
  failedQueue = [];
};

const clearSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  window.dispatchEvent(new CustomEvent('auth:logout'));
};

// Interceptor para manejo de errores
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const { status } = error.response || {};

    if (status === 401 && !original._retry && localStorage.getItem('refresh_token')) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(original));
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const res = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          { refresh_token: refreshToken }
        );
        localStorage.setItem('token', res.data.token);
        if (res.data.refresh_token) {
          localStorage.setItem('refresh_token', res.data.refresh_token);
        }
        processQueue(null);
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError);
        clearSession();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (status === 401) {
      console.warn('[API] 401 no autorizado. Token inválido o expirado.');
      clearSession();
    }
    return Promise.reject(error);
  }
);

export default api;
