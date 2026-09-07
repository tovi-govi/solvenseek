import { create } from 'zustand';
import {
  getSeekerChallenges,
  getZones,
  solveSeekerChallenge,
  getGameConfig,
} from '../lib/gameService';
import { useAuthStore } from './authStore';
import type { SeekerChallenge, Zone, GameConfig } from '../types/game';

interface SeekerStore {
  challenges: SeekerChallenge[];
  zones: Zone[];
  gameConfig: GameConfig | null;
  isLoaded: boolean;

  load: (profileId: string) => Promise<void>;
  markChallengeSolved: (challengeId: string) => void;
  submitAnswer: (profileId: string, challengeId: string, answer: string) => Promise<{ success: boolean; tokensGranted: number; error?: string }>;
}

export const useSeekerStore = create<SeekerStore>((set, get) => ({
  challenges: [],
  zones: [],
  gameConfig: null,
  isLoaded: false,

  load: async (profileId) => {
    const [challenges, zones, gameConfig] = await Promise.all([
      getSeekerChallenges(profileId),
      getZones(profileId),
      getGameConfig(),
    ]);
    set({ challenges, zones, gameConfig, isLoaded: true });
  },

  markChallengeSolved: (challengeId) => {
    const challenge = get().challenges.find((c) => c.id === challengeId);
    set((s) => ({
      challenges: s.challenges.map((c) =>
        c.id === challengeId ? { ...c, solved: true } : c
      ),
      zones: s.zones.map((z) =>
        challenge?.locationId === z.id
          ? { ...z, isRestricted: false, isAccessible: true }
          : z
      ),
    }));
  },

  submitAnswer: async (profileId, challengeId, answer) => {
    const result = await solveSeekerChallenge(profileId, challengeId, answer);
    if (result.success) {
      get().markChallengeSolved(challengeId);
      const authProfile = useAuthStore.getState().profile;
      if (authProfile) {
        useAuthStore.getState().updateTokens(authProfile.eliminationTokens + result.tokensGranted);
      }
    }
    return result;
  },
}));
