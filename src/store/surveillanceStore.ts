import { create } from 'zustand';
import type { SeekerTelemetry, SeekerBroadcast } from '../types/game';
import {
  getSeekerTelemetry,
  subscribeToSeekerTelemetry,
  broadcastSeekerPositions as svcBroadcast,
  getLastBroadcast,
  getBroadcastHistory,
  subscribeToSeekerBroadcasts,
} from '../lib/gameService';
import { saveRealSeeker, deleteRealSeeker } from '../lib/firebase';
import { getServerNow } from '../lib/serverTime';

// Cycle duration: strictly 10 minutes (600 seconds)
const BROADCAST_INTERVAL_SEC = 10 * 60;

interface SurveillanceState {
  seekers: SeekerTelemetry[];
  selectedSeekerId: string | null;
  lastBroadcast: SeekerBroadcast | null;
  broadcastHistory: SeekerBroadcast[];
  broadcastCooldownSec: number;
  isLoading: boolean;
  unsubscribers: (() => void)[];

  load: () => Promise<void>;
  cleanup: () => void;
  setSelectedSeeker: (id: string | null) => void;
  broadcastPositions: (operator?: string) => Promise<{ success: boolean; broadcast?: SeekerBroadcast; error?: string }>;
  tickCooldown: () => void;
  updateSeekerPosition: (id: string, x: number, y: number, zoneId?: SeekerTelemetry['zoneId'], zoneName?: string) => Promise<void>;
  addSeekerNode: (seeker: SeekerTelemetry) => Promise<void>;
  deleteSeekerNode: (id: string) => Promise<void>;
}

export const useSurveillanceStore = create<SurveillanceState>((set, get) => ({
  seekers: [],
  selectedSeekerId: null,
  lastBroadcast: null,
  broadcastHistory: [],
  broadcastCooldownSec: 0,
  isLoading: true,
  unsubscribers: [],

  load: async () => {
    set({ isLoading: true });

    // Cleanup previous subscriptions if re-running
    get().cleanup();

    const [seekers, lastBroadcast, history] = await Promise.all([
      getSeekerTelemetry(),
      getLastBroadcast(),
      getBroadcastHistory(),
    ]);

    // Calculate remaining cooldown using authoritative server time (NOT machine local time)
    let cooldown = 0;
    if (lastBroadcast?.timestamp) {
      const currentServerTime = getServerNow();
      const elapsed = Math.floor((currentServerTime - lastBroadcast.timestamp) / 1000);
      cooldown = Math.max(0, BROADCAST_INTERVAL_SEC - elapsed);
    }

    const unsubs: (() => void)[] = [
      subscribeToSeekerTelemetry((realSeekers) => {
        set({ seekers: realSeekers });
      }),
      subscribeToSeekerBroadcasts((bc) => {
        set((s) => ({
          lastBroadcast: bc,
          broadcastHistory: [bc, ...s.broadcastHistory.filter((x) => x.id !== bc.id)].slice(0, 20),
          broadcastCooldownSec: BROADCAST_INTERVAL_SEC,
        }));
      }),
    ];

    set({
      seekers,
      lastBroadcast,
      broadcastHistory: history,
      broadcastCooldownSec: cooldown,
      isLoading: false,
      unsubscribers: unsubs,
    });
  },

  cleanup: () => {
    get().unsubscribers.forEach((fn) => fn());
    set({ unsubscribers: [] });
  },

  setSelectedSeeker: (id) => set({ selectedSeekerId: id }),

  broadcastPositions: async (operator = 'Surveillance HQ') => {
    // Strictly prevent broadcasting if cooldown is active
    if (get().broadcastCooldownSec > 0) {
      return {
        success: false,
        error: `Transmission locked. Cooldown remaining: ${get().broadcastCooldownSec}s`,
      };
    }

    const res = await svcBroadcast(operator);
    if (res.success && res.broadcast) {
      set((s) => ({
        lastBroadcast: res.broadcast,
        broadcastHistory: [res.broadcast, ...s.broadcastHistory].slice(0, 20),
        broadcastCooldownSec: BROADCAST_INTERVAL_SEC,
      }));
      return { success: true, broadcast: res.broadcast };
    }
    return { success: false, error: res.error };
  },

  tickCooldown: () => {
    const lastBc = get().lastBroadcast;
    if (!lastBc?.timestamp) {
      set({ broadcastCooldownSec: 0 });
      return;
    }
    // Recompute strictly against authoritative server time (immune to machine clock changes)
    const currentServerTime = getServerNow();
    const elapsed = Math.floor((currentServerTime - lastBc.timestamp) / 1000);
    const remaining = Math.max(0, BROADCAST_INTERVAL_SEC - elapsed);
    set({ broadcastCooldownSec: remaining });
  },

  updateSeekerPosition: async (id, x, y, zoneId, zoneName) => {
    const existing = get().seekers.find((s) => s.id === id);
    if (!existing) return;
    const updated: SeekerTelemetry = {
      ...existing,
      x,
      y,
      zoneId: zoneId ?? existing.zoneId,
      zoneName: zoneName ?? existing.zoneName,
      lastPing: getServerNow(),
    };
    await saveRealSeeker(updated);
  },

  addSeekerNode: async (seeker: SeekerTelemetry) => {
    await saveRealSeeker(seeker);
  },

  deleteSeekerNode: async (id: string) => {
    await deleteRealSeeker(id);
    if (get().selectedSeekerId === id) {
      set({ selectedSeekerId: null });
    }
  },
}));
