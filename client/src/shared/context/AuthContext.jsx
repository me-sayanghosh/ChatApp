import { createContext, useContext, useEffect, useState } from 'react';
import { connectSocket, disconnectSocket } from '../utils/socket.js';
import { api, getAccessToken, setTokens, clearTokens } from '../utils/api.js';
import { clearAllCryptoKeys } from '../utils/crypto.js';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(() => getAccessToken());
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    api.get('/auth/me')
      .then((r) => r.data)
      .then((data) => {
        setUser(data.user);
        const token = getAccessToken();
        setAccessToken(token);
        connectSocket(token);
      })
      .catch(() => {
        clearTokens();
        clearAllCryptoKeys();
        setAccessToken(null);
        setUser(null);
      })
      .finally(() => setBootstrapped(true));
  }, []);

  function login({ accessToken: at, refreshToken: rt, user: u }) {
    setTokens(at, rt);
    setAccessToken(at);
    setUser(u);
    connectSocket(at);
  }

  function logout() {
    clearTokens();
    clearAllCryptoKeys();
    setAccessToken(null);
    setUser(null);
    disconnectSocket();
  }

  if (!bootstrapped) return null;
  return <AuthCtx.Provider value={{ user, token: accessToken, login, logout, setUser }}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}
