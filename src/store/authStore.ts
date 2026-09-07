import { create } from 'zustand';
import { login as svcLogin, logout as svcLogout, getCurrentProfile } from '../lib/gameService';
import type { Profile } from '../types/game';

interface AuthStore {
  profile: Profile | null;
  isLoading: boolean;
  isInitialized: boolean;

  initialize: () => Promise<void>;
  login: (username: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  setProfile: (p: Profile | null) => void;
  updateTokens: (tokens: number) => void;
  updateStatus: (status: Profile['status']) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  profile: null,
  isLoading: true,
  isInitialized: false,

  initialize: async () => {
    set({ isLoading: true });
    try {
      const profile = await getCurrentProfile();
      set({ profile, isLoading: false, isInitialized: true });
    } catch {
      set({ profile: null, isLoading: false, isInitialized: true });
    }
  },

  login: async (username, password) => {
    set({ isLoading: true });
    const result = await svcLogin(username, password);
    if ('error' in result) {
      set({ isLoading: false });
      return { error: result.error };
    }
    set({ profile: result.profile, isLoading: false });
    return {};
  },

  logout: async () => {
    await svcLogout();
    set({ profile: null });
  },

  setProfile: (profile) => set({ profile }),

  updateTokens: (tokens) =>
    set((state) => (state.profile ? { profile: { ...state.profile, eliminationTokens: tokens } } : {})),

  updateStatus: (status) =>
    set((state) => (state.profile ? { profile: { ...state.profile, status } } : {})),
}));
