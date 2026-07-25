import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

export const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let failedQueue = [];

function processQueue(error, token) {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
}

function hardLogout() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('chatapp:offlineQueue');
  localStorage.removeItem('chatapp:lastSeen');
  localStorage.removeItem('chatapp:userRsaKeys');
  localStorage.removeItem('chatapp:roomKeys');
  window.dispatchEvent(new Event('app:hard-logout'));
  window.location.href = '/login';
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      const errMsg = error.response?.data?.error || '';

      if (errMsg.includes('reuse detected')) {
        hardLogout();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        isRefreshing = false;
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });

        if (data.error && data.error.includes('reuse detected')) {
          processQueue(new Error(data.error), null);
          hardLogout();
          return Promise.reject(error);
        }

        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        processQueue(null, data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        const refreshErrMsg = refreshError.response?.data?.error || '';
        if (refreshErrMsg.includes('reuse detected')) {
          processQueue(refreshError, null);
          hardLogout();
          return Promise.reject(refreshError);
        }
        processQueue(refreshError, null);
        hardLogout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export function getAccessToken() {
  return localStorage.getItem('accessToken');
}

export function getRefreshToken() {
  return localStorage.getItem('refreshToken');
}

export function setTokens(accessToken, refreshToken) {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
}

export function clearTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}
