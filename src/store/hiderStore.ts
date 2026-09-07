import { create } from 'zustand';
import {
  getHiderChallenges,
  solveHiderChallenge,
  getGameConfig,
} from '../lib/gameService';
import { useAuthStore } from './authStore';
import type { HiderChallenge, GameConfig } from '../types/game';

interface HiderStore {
  challenges: HiderChallenge[];
  gameConfig: GameConfig | null;
  isLoaded: boolean;

  load: (profileId: string) => Promise<void>;
  markChallengeSolved: (challengeId: string) => void;
  submitAnswer: (profileId: string, challengeId: string, answer: string) => Promise<{ success: boolean; tokensGranted: number; error?: string }>;
}

export const useHiderStore = create<HiderStore>((set, get) => ({
  challenges: [],
  gameConfig: null,
  isLoaded: false,

  load: async (profileId) => {
    const [challenges, gameConfig] = await Promise.all([
      getHiderChallenges(profileId),
      getGameConfig(),
    ]);
    set({ challenges, gameConfig, isLoaded: true });
  },

  markChallengeSolved: (challengeId) => {
    set((s) => ({
      challenges: s.challenges.map((c) =>
        c.id === challengeId ? { ...c, solved: true } : c
      ),
    }));
  },

  submitAnswer: async (profileId, challengeId, answer) => {
    const result = await solveHiderChallenge(profileId, challengeId, answer);
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
