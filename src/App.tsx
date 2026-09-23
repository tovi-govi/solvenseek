import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { Surveillance } from './pages/Surveillance';
import { Login } from './pages/Login';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { profile } = useAuthStore();

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { profile } = useAuthStore();

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

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
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
