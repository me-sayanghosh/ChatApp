import { createContext, useContext, useEffect, useState } from 'react';
import { connectSocket, disconnectSocket } from '../socket.js';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    if (!token) {
      setBootstrapped(true);
      return;
    }
    fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:4000/api'}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setUser(data.user);
        connectSocket(token);
      })
      .catch(() => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      })
      .finally(() => setBootstrapped(true));
  }, [token]);

  function login({ token: t, user: u }) {
    localStorage.setItem('token', t);
    setToken(t);
    setUser(u);
    connectSocket(t);
  }

  function logout() {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    disconnectSocket();
  }

  if (!bootstrapped) return null;
  return <AuthCtx.Provider value={{ user, token, login, logout }}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}
