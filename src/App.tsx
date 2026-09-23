import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { Surveillance } from './pages/Surveillance';
import { Hider } from './pages/Hider';
import { Login } from './pages/Login';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { profile, isInitialized } = useAuthStore();

  // If session is still verifying with Firebase and no cached profile is available
  if (!isInitialized && !profile) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center font-mono text-cyber-accent">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cyber-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-xs tracking-widest uppercase animate-pulse">
            INITIALIZING SURVEILLANCE SESSION...
          </span>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { profile, isInitialized } = useAuthStore();

  if (!isInitialized && !profile) {
    return null;
  }

  if (profile) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Login Portal */}
      <Route
        path="/login"
        element={
          <RedirectIfAuthed>
            <Login />
          </RedirectIfAuthed>
        }
      />

      {/* Protected Surveillance Command Center */}
      <Route
        path="/"
        element={
          <RequireAuth>
            <Surveillance />
          </RequireAuth>
        }
      />
      <Route
        path="/team"
        element={
          <RequireAuth>
            <Surveillance />
          </RequireAuth>
        }
      />
      <Route
        path="/surveillance"
        element={
          <RequireAuth>
            <Surveillance />
          </RequireAuth>
        }
      />
      <Route
        path="/hider"
        element={
          <RequireAuth>
            <Hider />
          </RequireAuth>
        }
      />

      {/* Catch-all: redirect to root command dashboard (protected) */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
