import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { isHiderRole } from './types/game';
import { Surveillance } from './pages/Surveillance';
import { Login } from './pages/Login';
import { ShieldAlert, LogOut } from 'lucide-react';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { profile, isInitialized, logout } = useAuthStore();

  // If session is still verifying with Firebase and no cached profile is available
  if (!isInitialized && !profile) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center font-mono text-cyber-accent">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cyber-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-xs tracking-widest uppercase animate-pulse">
            INITIALIZING HIDER SESSION...
          </span>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  // Security Access Gate: Strictly enforce role = 'hider'
  if (!isHiderRole(profile.role)) {
    return (
      <div className="min-h-screen bg-[#02050e] flex items-center justify-center font-mono p-4 text-white">
        <div className="max-w-md w-full bg-[#0a060d] border border-[#ff0033]/50 rounded-sm p-6 shadow-[0_0_35px_rgba(255,0,51,0.2)] text-center backdrop-blur-md">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#ff0033]/15 border border-[#ff0033]/50 flex items-center justify-center mb-4">
            <ShieldAlert className="w-6 h-6 text-[#ff0033]" />
          </div>

          <h2 className="text-lg font-black tracking-widest text-white uppercase mb-1 font-display">
            ACCESS DENIED // 403
          </h2>
          <p className="text-xs font-bold text-[#ff0033] tracking-widest uppercase mb-4">
            RESTRICTED TO HIDER OPERATIVES ONLY
          </p>

          <div className="bg-black/70 border border-white/10 rounded p-3 text-xs text-white/80 space-y-1.5 mb-5 text-left font-mono">
            <div className="flex justify-between items-center border-b border-white/10 pb-1">
              <span className="text-white/40">USER CALLSIGN:</span>
              <span className="font-bold text-white">{profile.username}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/10 pb-1">
              <span className="text-white/40">DATABASE ROLE:</span>
              <span className="font-bold text-[#ff0033] uppercase">{profile.role || 'UNASSIGNED'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/40">REQUIRED SCHEMA ROLE:</span>
              <span className="font-bold text-cyber-accent">hider</span>
            </div>
          </div>

          <p className="text-[11px] text-white/50 mb-6 leading-relaxed">
            Your user account in Cloud Firestore is not configured with <code className="text-cyber-accent bg-white/5 px-1 py-0.5 rounded">role = "hider"</code>.
            Only verified hiders have authorization to access this application.
          </p>

          <button
            onClick={() => logout()}
            className="w-full bg-[#ff0033] hover:bg-[#ff0033]/85 text-white font-bold py-2.5 rounded text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,0,51,0.3)]"
          >
            <LogOut className="w-4 h-4" />
            <span>DISCONNECT & SWITCH ACCOUNT</span>
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { profile, isInitialized } = useAuthStore();

  if (!isInitialized && !profile) {
    return null;
  }

  if (profile && isHiderRole(profile.role)) {
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

      {/* Surveillance Radar (Primary View) */}
      <Route
        path="/"
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
        path="/team"
        element={
          <RequireAuth>
            <Surveillance />
          </RequireAuth>
        }
      />
      <Route
        path="/hider"
        element={
          <Navigate to="/" replace />
        }
      />

      {/* Catch-all: redirect to primary dashboard */}
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
