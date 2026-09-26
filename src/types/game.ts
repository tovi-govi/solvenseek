// ---------------------------------------------------------------------------
// Core enums / unions
// ---------------------------------------------------------------------------

export type UserRole = 'HIDER' | 'SEEKER' | 'SURVEILLANCE' | 'hider' | 'seeker' | 'surveillance';
export type UserStatus = 'ACTIVE' | 'ELIMINATED';

/**
 * Validates whether an operative has the required hider role.
 * Role check is case-insensitive ('hider' or 'HIDER').
 */
export function isHiderRole(role?: string | null): boolean {
  if (!role) return false;
  return role.trim().toLowerCase() === 'hider';
}

// ---------------------------------------------------------------------------
// Profile — Authoritative operator user record from Firebase
// ---------------------------------------------------------------------------

export interface Profile {
  id: string;
  username: string;
  playerId: string; // display code e.g. HDR-E12F
  role: UserRole;
  status: UserStatus;
  eliminationTokens: number;
  createdAt?: string;
}

// ---------------------------------------------------------------------------
// Surveillance & Real-Time Seeker Tracking
// ---------------------------------------------------------------------------

export interface SeekerTelemetry {
  id: string;               // Document ID (seeker UID)
  uid: string;
  playerId: string;         // e.g. "p_abc123"
  name: string;             // Seeker callsign
  teamId: string;           // "alpha" | "bravo"
  active: boolean;          // true when tracking is active
  status: 'ACTIVE' | 'IN_TRANSIT' | 'offline';
  lat?: number;             // Real-world GPS Latitude
  lon?: number;             // Real-world GPS Longitude
  x: number;                // Normalized campus X (0 - 1000)
  y: number;                // Normalized campus Y (0 - 750)
  zoneId: string;           // e.g. "academic_1", "dining", "oat"
  zoneName: string;         // e.g. "Academic Block 1"
  battery: number;          // 0 - 100
  signal: 'STRONG' | 'GOOD' | 'WEAK';
  speedKmh: number;         // Travel speed
  headingDeg?: number | null;
  accuracyM?: number;
  qrScannedCount: number;   // Number of artifacts scanned (0 - 15)
  lastPing: number;         // Epoch timestamp in milliseconds (Date.now())
}

export interface SeekerBroadcast {
  id: string;
  timestamp: number;
  seekerPositions: {
    playerId: string;
    name: string;
    zoneName: string;
    x: number;
    y: number;
  }[];
  totalActiveSeekers: number;
  operator: string;
}

// ---------------------------------------------------------------------------
// Hider Challenges (Competitive Shared Pool with First-Solve Lockout)
// ---------------------------------------------------------------------------

export type ChallengeCategory = 'CRYPTOGRAPHY' | 'NETWORK' | 'LOGIC' | 'LINUX' | 'OSINT' | 'CAMPUS';
export type ChallengeDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface ChallengeClaimant {
  uid: string;
  playerId: string;
  username: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  category: ChallengeCategory;
  difficulty: ChallengeDifficulty;
  points: number;
  tokensAwarded: number;
  answer?: string;
  hints: string[];
  isSolved: boolean;
  solvedBy: ChallengeClaimant | null;
  solvedAt: number | null;
  order: number;
}

export interface ChallengeSolveResult {
  success: boolean;
  tokensGranted: number;
  error?: string;
  alreadySolvedBy?: string;
}
