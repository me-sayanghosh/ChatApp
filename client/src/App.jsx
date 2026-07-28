import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './shared/context/AuthContext.jsx';
import Home from './features/home/pages/Home.jsx';
import Login from './features/auth/pages/Login.jsx';
import Register from './features/auth/pages/Register.jsx';
import SetUsername from './features/auth/pages/SetUsername.jsx';
import Profile from './features/profile/pages/Profile.jsx';
import Chat from './features/chat/pages/Chat.jsx';

import SettingsPage from './features/profile/pages/SettingsPage.jsx';
import { ErrorBoundary } from './shared/components/ErrorBoundary.jsx';

import ToastContainer from './shared/components/ui/ToastContainer.jsx';

function Protected({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.needsUsername) return <Navigate to="/set-username" replace />;
  return children;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastContainer />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/set-username" element={<SetUsername />} />
        <Route path="/profile" element={<Navigate to="/settings/profile" replace />} />
        <Route path="/settings" element={<Navigate to="/settings/profile" replace />} />
        <Route path="/settings/:section" element={<Protected><SettingsPage /></Protected>} />
        <Route path="/chat" element={<Protected><Chat /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}
