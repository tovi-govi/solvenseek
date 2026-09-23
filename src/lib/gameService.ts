/**
 * gameService.ts — Streamlined service layer for active surveillance operations.
 * Communicates with Cloud Firestore for real seekers and broadcast history.
 */

import { getServerNow } from './serverTime';
import {
  fetchRealSeekers,
  saveRealSeeker,
  subscribeToRealSeekers,
  subscribeToRealBroadcasts,
  recordRealBroadcast,
} from './firebase';
import type { SeekerTelemetry, SeekerBroadcast } from '../types/game';

// Local storage fallback keys for broadcasts
const SK_LAST_BROADCAST = 'cmiyc_last_broadcast';
const SK_BROADCAST_HIST = 'cmiyc_broadcast_history';

export async function getSeekerTelemetry(): Promise<SeekerTelemetry[]> {
  return await fetchRealSeekers();
}

export async function updateSeekerTelemetry(telemetry: SeekerTelemetry[]): Promise<void> {
  for (const s of telemetry) {
    await saveRealSeeker(s);
  }
}

export function subscribeToSeekerTelemetry(
  onUpdate: (telemetry: SeekerTelemetry[]) => void
): () => void {
  return subscribeToRealSeekers(onUpdate);
}

export async function broadcastSeekerPositions(
  operator: string = 'Surveillance HQ'
): Promise<{ success: boolean; broadcast: SeekerBroadcast; error?: string }> {
  const telemetry = await getSeekerTelemetry();
  const activeSeekers = telemetry.filter((s) => s.status !== 'IN_TRANSIT' || true);
  const serverNow = getServerNow();

  const payload: SeekerBroadcast = {
    id: `bc-${serverNow}`,
    timestamp: serverNow,
    seekerPositions: activeSeekers.map((s) => ({
      playerId: s.playerId,
      name: s.name,
      zoneName: s.zoneName,
      x: s.x,
      y: s.y,
    })),
    totalActiveSeekers: activeSeekers.length,
    operator,
  };

  await recordRealBroadcast(payload);
  return { success: true, broadcast: payload };
}

export async function getLastBroadcast(): Promise<SeekerBroadcast | null> {
  try {
    const raw = localStorage.getItem(SK_LAST_BROADCAST);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function getBroadcastHistory(): Promise<SeekerBroadcast[]> {
  try {
    return JSON.parse(localStorage.getItem(SK_BROADCAST_HIST) ?? '[]');
  } catch {
    return [];
  }
}

export function subscribeToSeekerBroadcasts(
  onBroadcast: (broadcast: SeekerBroadcast) => void
): () => void {
  return subscribeToRealBroadcasts((_history, latest) => {
    if (latest) onBroadcast(latest);
  });
}

// ---------------------------------------------------------------------------
// HIDER CHALLENGES (Competitive Pool with First-Solve Lockout)
// ---------------------------------------------------------------------------

export {
  seedDefaultChallengesIfEmpty,
  subscribeToRealChallenges,
  submitChallengeAnswerAtomic,
} from './firebase';
