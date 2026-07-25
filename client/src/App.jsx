import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import SetUsername from './pages/SetUsername.jsx';
import Profile from './pages/Profile.jsx';
import Chat from './pages/Chat.jsx';

function Protected({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.needsUsername) return <Navigate to="/set-username" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/set-username" element={<SetUsername />} />
      <Route path="/profile" element={<Protected><Profile /></Protected>} />
      <Route path="/chat" element={<Protected><Chat /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
