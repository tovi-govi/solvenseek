import { create } from 'zustand';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { auth, getOrCreateUserProfile } from '../lib/firebase';
import { type Profile, isHiderRole } from '../types/game';

interface AuthStore {
  profile: Profile | null;
  firebaseUser: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  authError: string | null;

  initialize: () => void;
  signInWithEmail: (email: string, password: string) => Promise<{ error?: string }>;
  signUpWithEmail: (email: string, password: string, callsign?: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  setProfile: (p: Profile | null) => void;
  updateTokens: (tokens: number) => void;
  updateStatus: (status: Profile['status']) => void;
  clearAuthError: () => void;
}

function parseFirebaseError(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const code = (err as { code: string }).code;
    switch (code) {
      case 'auth/invalid-email':
        return 'Invalid email address format.';
      case 'auth/user-not-found':
        return 'No hider account found with this email.';
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Invalid email or password.';
      case 'auth/email-already-in-use':
        return 'An account already exists with this email address.';
      case 'auth/weak-password':
        return 'Password is too weak. Must be at least 6 characters.';
      case 'auth/popup-closed-by-user':
        return 'Google sign-in popup was closed before completing.';
      case 'auth/unauthorized-domain':
        return 'Domain not authorized in Firebase Console (add localhost to Authorized Domains).';
      case 'auth/operation-not-allowed':
        return 'Provider disabled. Enable Email/Password or Google in Firebase Console.';
      default:
        return (err as { message?: string }).message ?? 'Authentication failed.';
    }
  }
  return 'An unexpected error occurred during authentication.';
}

const CACHE_PROFILE_KEY = 'cmiyc_cached_profile';

function getCachedProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(CACHE_PROFILE_KEY);
    if (!raw) return null;
    const profile = JSON.parse(raw) as Profile;
    if (!isHiderRole(profile.role)) {
      localStorage.removeItem(CACHE_PROFILE_KEY);
      return null;
    }
    return profile;
  } catch {
    return null;
  }
}

function setCachedProfile(p: Profile | null) {
  try {
    if (p) {
      localStorage.setItem(CACHE_PROFILE_KEY, JSON.stringify(p));
    } else {
      localStorage.removeItem(CACHE_PROFILE_KEY);
    }
  } catch {
    // Ignore storage quota errors
  }
}

let authListenerAttached = false;

export const useAuthStore = create<AuthStore>((set, get) => {
  const attachListener = () => {
    if (authListenerAttached) return;
    authListenerAttached = true;

    // Safety timeout: never hang forever if Firebase or network is sluggish
    const timer = setTimeout(() => {
      if (!get().isInitialized) {
        set({ isInitialized: true, isLoading: false });
      }
    }, 1500);

    onAuthStateChanged(auth, async (user) => {
      clearTimeout(timer);
      if (user) {
        try {
          const profile = await getOrCreateUserProfile(user.uid, user.email, user.displayName);

          // Enforce role = 'hider' in schema
          if (!isHiderRole(profile.role)) {
            console.warn(`Access denied for ${user.uid}: role "${profile.role}" is not authorized. Hider role required.`);
            await signOut(auth);
            setCachedProfile(null);
            set({
              firebaseUser: null,
              profile: null,
              authError: `ACCESS DENIED: Role "${profile.role}" is not authorized. Only operatives with role = "hider" can access this app.`,
              isLoading: false,
              isInitialized: true,
            });
            return;
          }

          setCachedProfile(profile);
          set({
            firebaseUser: user,
            profile,
            authError: null,
            isLoading: false,
            isInitialized: true,
          });
        } catch {
          const fallbackProfile: Profile = {
            id: user.uid,
            playerId: `HDR-${user.uid.slice(0, 4).toUpperCase()}`,
            username: user.displayName ?? user.email?.split('@')[0] ?? 'HIDER',
            role: 'hider',
            status: 'ACTIVE',
            eliminationTokens: 0,
            createdAt: new Date().toISOString(),
          };
          setCachedProfile(fallbackProfile);
          set({
            firebaseUser: user,
            profile: fallbackProfile,
            authError: null,
            isLoading: false,
            isInitialized: true,
          });
        }
      } else {
        setCachedProfile(null);
        set({
          firebaseUser: null,
          profile: null,
          isLoading: false,
          isInitialized: true,
        });
      }
    });
  };

  // Attach listener immediately on store creation
  attachListener();

  const initialCached = getCachedProfile();

  return {
    profile: initialCached,
    firebaseUser: null,
    isLoading: !initialCached,
    isInitialized: false,
    authError: null,

    initialize: () => {
      attachListener();
    },

    signInWithEmail: async (email, password) => {
      set({ isLoading: true, authError: null });
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const profile = await getOrCreateUserProfile(user.uid, user.email, user.displayName);

        if (!isHiderRole(profile.role)) {
          await signOut(auth);
          setCachedProfile(null);
          const errorMsg = `ACCESS DENIED: Role "${profile.role}" is not authorized. Only operatives with role = "hider" can access this app.`;
          set({ firebaseUser: null, profile: null, authError: errorMsg, isLoading: false, isInitialized: true });
          return { error: errorMsg };
        }

        setCachedProfile(profile);
        set({ firebaseUser: user, profile, authError: null, isLoading: false, isInitialized: true });
        return {};
      } catch (err) {
        set({ isLoading: false });
        return { error: parseFirebaseError(err) };
      }
    },

    signUpWithEmail: async (email, password, callsign) => {
      set({ isLoading: true, authError: null });
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const profile = await getOrCreateUserProfile(user.uid, user.email, callsign || user.displayName);

        if (!isHiderRole(profile.role)) {
          await signOut(auth);
          setCachedProfile(null);
          const errorMsg = `ACCESS DENIED: Role "${profile.role}" is not authorized. Only operatives with role = "hider" can access this app.`;
          set({ firebaseUser: null, profile: null, authError: errorMsg, isLoading: false, isInitialized: true });
          return { error: errorMsg };
        }

        setCachedProfile(profile);
        set({ firebaseUser: user, profile, authError: null, isLoading: false, isInitialized: true });
        return {};
      } catch (err) {
        set({ isLoading: false });
        return { error: parseFirebaseError(err) };
      }
    },

    signInWithGoogle: async () => {
      set({ isLoading: true, authError: null });
      try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        const profile = await getOrCreateUserProfile(user.uid, user.email, user.displayName);

        if (!isHiderRole(profile.role)) {
          await signOut(auth);
          setCachedProfile(null);
          const errorMsg = `ACCESS DENIED: Role "${profile.role}" is not authorized. Only operatives with role = "hider" can access this app.`;
          set({ firebaseUser: null, profile: null, authError: errorMsg, isLoading: false, isInitialized: true });
          return { error: errorMsg };
        }

        setCachedProfile(profile);
        set({ firebaseUser: user, profile, authError: null, isLoading: false, isInitialized: true });
        return {};
      } catch (err) {
        set({ isLoading: false });
        return { error: parseFirebaseError(err) };
      }
    },

    logout: async () => {
      try {
        await signOut(auth);
      } catch (err) {
        console.warn('Sign out error:', err);
      }
      setCachedProfile(null);
      set({ profile: null, firebaseUser: null, authError: null, isLoading: false, isInitialized: true });
    },

    setProfile: (profile) => {
      setCachedProfile(profile);
      set({ profile });
    },

    updateTokens: (tokens) =>
      set((state) => (state.profile ? { profile: { ...state.profile, eliminationTokens: tokens } } : {})),

    updateStatus: (status) =>
      set((state) => (state.profile ? { profile: { ...state.profile, status } } : {})),

    clearAuthError: () => set({ authError: null }),
  };
});
