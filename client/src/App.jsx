import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './shared/context/AuthContext.jsx';
import Home from './features/home/pages/Home.jsx';
import { ErrorBoundary } from './shared/components/ErrorBoundary.jsx';
import ToastContainer from './shared/components/ui/ToastContainer.jsx';
import { requestNotificationPermission } from './shared/utils/webNotifications.js';

// Lazy-loaded route components for optimal bundle splitting
const JoinNow = lazy(() => import('./features/auth/pages/JoinNow.jsx'));
const SetUsername = lazy(() => import('./features/auth/pages/SetUsername.jsx'));
const SettingsPage = lazy(() => import('./features/profile/pages/SettingsPage.jsx'));
const Chat = lazy(() => import('./features/chat/pages/Chat.jsx'));

function SuspenseFallback() {
  return (
    <div className="lazy-suspense-fallback">
      <div className="lazy-spinner" />
      <span>Loading DropTalk...</span>
    </div>
  );
}

function Protected({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/join" replace />;
  if (user.needsUsername) return <Navigate to="/set-username" replace />;
  return children;
}

export default function App() {
  useEffect(() => {
    requestNotificationPermission().catch(() => {});
  }, []);

  return (
    <ErrorBoundary>
      <ToastContainer />
      <Suspense fallback={<SuspenseFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/join" element={<JoinNow />} />
          <Route path="/login" element={<Navigate to="/join" replace />} />
          <Route path="/register" element={<Navigate to="/join" replace />} />
          <Route path="/set-username" element={<SetUsername />} />
          <Route path="/profile" element={<Navigate to="/settings/profile" replace />} />
          <Route path="/settings" element={<Navigate to="/settings/profile" replace />} />
          <Route path="/settings/:section" element={<Protected><SettingsPage /></Protected>} />
          <Route path="/chat" element={<Protected><Chat /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
