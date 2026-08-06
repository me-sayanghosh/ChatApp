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
    const token = getAccessToken();
    if (!token) {
      setBootstrapped(true);
      return;
    }

    api.get('/auth/me')
      .then((r) => r.data)
      .then((data) => {
        setUser(data.user);
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

  if (!bootstrapped) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0B0F19',
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3.5px solid #1E293B',
          borderTopColor: '#0052FF',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <p style={{ marginTop: '16px', fontSize: '13px', fontWeight: 600, color: '#94A3B8' }}>
          Loading DropTalk...
        </p>
      </div>
    );
  }
  return <AuthCtx.Provider value={{ user, token: accessToken, login, logout, setUser }}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}
