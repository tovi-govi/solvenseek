import { create } from 'zustand';
import type { Challenge, ChallengeCategory, ChallengeSolveResult, Profile } from '../types/game';
import {
  seedDefaultChallengesIfEmpty,
  subscribeToRealChallenges,
  submitChallengeAnswerAtomic,
} from '../lib/gameService';
import { useAuthStore } from './authStore';

export type StatusFilter = 'ALL' | 'OPEN' | 'CLAIMED' | 'SOLVED_BY_ME';

interface HiderStore {
  challenges: Challenge[];
  selectedChallenge: Challenge | null;
  filterCategory: ChallengeCategory | 'ALL';
  filterStatus: StatusFilter;
  isLoaded: boolean;
  isSubmitting: boolean;
  submissionError: string | null;
  submissionSuccess: boolean;
  claimedByOperative: string | null;
  unsub: (() => void) | null;

  init: () => () => void;
  setSelectedChallenge: (challenge: Challenge | null) => void;
  setFilterCategory: (category: ChallengeCategory | 'ALL') => void;
  setFilterStatus: (status: StatusFilter) => void;
  submitAnswer: (profile: Profile, challengeId: string, answer: string) => Promise<ChallengeSolveResult>;
  resetSubmissionState: () => void;
}

export const useHiderStore = create<HiderStore>((set, get) => ({
  challenges: [],
  selectedChallenge: null,
  filterCategory: 'ALL',
  filterStatus: 'ALL',
  isLoaded: false,
  isSubmitting: false,
  submissionError: null,
  submissionSuccess: false,
  claimedByOperative: null,
  unsub: null,

  init: () => {
    // Clean up existing listener if any
    const prevUnsub = get().unsub;
    if (prevUnsub) {
      prevUnsub();
    }

    // Seed defaults in background if Firestore is empty
    seedDefaultChallengesIfEmpty().catch((err) => {
      console.warn('Hider challenge auto-seed check:', err);
    });

    // Real-time listener for challenges
    const unsub = subscribeToRealChallenges((updatedList) => {
      const currentSelected = get().selectedChallenge;
      let newSelected = currentSelected;

      // Keep open modal in sync with realtime modifications
      if (currentSelected) {
        const found = updatedList.find((c) => c.id === currentSelected.id);
        if (found) {
          newSelected = found;
          // If another player just claimed it while the user had it open
          if (found.isSolved && !currentSelected.isSolved) {
            set({
              claimedByOperative: found.solvedBy?.playerId ?? found.solvedBy?.username ?? 'ANOTHER OPERATIVE',
            });
          }
        }
      }

      set({
        challenges: updatedList,
        selectedChallenge: newSelected,
        isLoaded: true,
      });
    });

    set({ unsub });
    return unsub;
  },

  setSelectedChallenge: (challenge) => {
    set({
      selectedChallenge: challenge,
      submissionError: null,
      submissionSuccess: false,
      claimedByOperative: null,
    });
  },

  setFilterCategory: (filterCategory) => set({ filterCategory }),
  setFilterStatus: (filterStatus) => set({ filterStatus }),

  resetSubmissionState: () => {
    set({
      submissionError: null,
      submissionSuccess: false,
      claimedByOperative: null,
      isSubmitting: false,
    });
  },

  submitAnswer: async (profile, challengeId, answer) => {
    set({
      isSubmitting: true,
      submissionError: null,
      submissionSuccess: false,
      claimedByOperative: null,
    });

    const result = await submitChallengeAnswerAtomic(profile, challengeId, answer);

    if (result.success) {
      set({
        submissionSuccess: true,
        isSubmitting: false,
      });
      // Synchronize player's local authStore tokens
      const currentProfile = useAuthStore.getState().profile;
      if (currentProfile) {
        useAuthStore.getState().updateTokens(currentProfile.eliminationTokens + result.tokensGranted);
      }
    } else {
      set({
        isSubmitting: false,
        submissionError: result.error ?? 'SUBMISSION_FAILED',
        claimedByOperative: result.alreadySolvedBy ?? null,
      });
    }

    return result;
  },
}));
