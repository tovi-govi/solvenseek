import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { GlitchText } from '../ui/GlitchText';
import type { UserRole } from '../../types/game';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole: UserRole;
}

/**
 * ProtectedRoute validates the session on every render.
 * It checks:
 *  1. User is authenticated (profile exists)
 *  2. User has the required role
 *  3. User's status is ACTIVE (not ELIMINATED)
 *
 * This is enforced by re-fetching from the backend on initialization,
 * so modifying frontend state or localStorage cannot bypass it.
 */
export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { profile, isLoading, isInitialized, initialize } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (!isInitialized) initialize();
  }, [isInitialized, initialize]);

  if (isLoading || !isInitialized) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center font-mono text-cyber-accent tracking-widest animate-pulse">
        AUTHENTICATING...
      </div>
    );
  }

  // Not logged in
  if (!profile) return <Navigate to="/" state={{ from: location }} replace />;

  // Eliminated players cannot access any game route
  if (profile.status === 'ELIMINATED') return <Navigate to="/eliminated" replace />;

  // Wrong role (e.g. hider trying to access /seeker)
  if (profile.role !== requiredRole) {
    return (
      <div className="w-screen h-screen bg-black flex flex-col items-center justify-center font-mono">
        <GlitchText text="ACCESS DENIED" active className="text-4xl text-cyber-warning font-display font-bold mb-4 tracking-widest" />
        <p className="text-cyber-muted tracking-widest uppercase mb-8">Role Mismatch — Unauthorized Territory</p>
        <button 
          onClick={() => window.location.href = profile.role === 'HIDER' ? '/hider' : '/seeker'}
          className="px-6 py-3 border border-cyber-accent text-cyber-accent hover:bg-cyber-accent hover:text-black transition-colors uppercase tracking-widest text-sm font-bold"
        >
          Return to {profile.role} Network
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
