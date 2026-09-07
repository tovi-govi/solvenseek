import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Login } from './pages/Login';
import { Hider } from './pages/Hider';
import { Seeker } from './pages/Seeker';
import { Eliminated } from './pages/Eliminated';
import { Rules } from './pages/Rules';

function AppRoutes() {
  const { initialize, isInitialized } = useAuthStore();
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      initialize();
    }
  }, [initialize]);

  if (!isInitialized) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center font-mono text-cyber-accent tracking-widest text-sm animate-pulse">
        OPENVERSE // INITIALIZING...
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route
        path="/hider"
        element={
          <ProtectedRoute requiredRole="HIDER">
            <Hider />
          </ProtectedRoute>
        }
      />
      <Route
        path="/seeker"
        element={
          <ProtectedRoute requiredRole="SEEKER">
            <Seeker />
          </ProtectedRoute>
        }
      />
      <Route path="/eliminated" element={<Eliminated />} />
      <Route path="/rules" element={<Rules />} />
      {/* Legacy routes redirect */}
      <Route path="/game" element={<LegacyRedirect />} />
      <Route path="*" element={<Login />} />
    </Routes>
  );
}

function LegacyRedirect() {
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  useEffect(() => {
    if (profile?.role === 'HIDER') navigate('/hider', { replace: true });
    else if (profile?.role === 'SEEKER') navigate('/seeker', { replace: true });
    else navigate('/', { replace: true });
  }, [profile, navigate]);
  return null;
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
