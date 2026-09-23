// ---------------------------------------------------------------------------
// Core enums / unions
// ---------------------------------------------------------------------------

export type UserRole = 'HIDER' | 'SEEKER' | 'SURVEILLANCE';
export type UserStatus = 'ACTIVE' | 'ELIMINATED';
export type ParticipantStatus = 'NOT_FOUND' | 'FOUND' | 'ELIMINATED';
export type ChallengeDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type GameStatus = 'NOT_STARTED' | 'ACTIVE' | 'ENDED';
export type ChallengeCategory =
  | 'Cryptography'
  | 'Programming'
  | 'Web'
  | 'Linux'
  | 'Logic'
  | 'Reverse Engineering'
  | 'OSINT'
  | 'General CTF';

// ---------------------------------------------------------------------------
// Profile — the authoritative user record returned from the backend
// ---------------------------------------------------------------------------

export interface Profile {
  id: string;
  username: string;
  playerId: string;   // display code e.g. H-014 or S-007
  role: UserRole;
  status: UserStatus;
  eliminationTokens: number;
  createdAt?: string;
}

// ---------------------------------------------------------------------------
// Map / Zones  (used by SEEKERS for the campus map)
// ---------------------------------------------------------------------------

export interface Zone {
  id: string;
  name: string;
  points: string;     // SVG polygon point string
  isAccessible: boolean;
  isRestricted: boolean;
}

// ---------------------------------------------------------------------------
// Hider challenges — CTF-style questions solved by HIDERS (no map)
// Answers NEVER included, validated server-side
// ---------------------------------------------------------------------------

export interface HiderChallenge {
  id: string;
  title: string;
  description: string;
  difficulty: ChallengeDifficulty;
  category: ChallengeCategory;
  hints: string[];
  points: number;
  solved: boolean;
}

// ---------------------------------------------------------------------------
// Seeker challenges — map-zone challenges solved by SEEKERS to unlock areas
// Answers NEVER included, validated server-side
// ---------------------------------------------------------------------------

export interface SeekerChallenge {
  id: string;
  title: string;
  description: string;
  difficulty: ChallengeDifficulty;
  locationId: string;
  solved: boolean;
}

// ---------------------------------------------------------------------------
// Targeting
// ---------------------------------------------------------------------------

export interface ActiveHider {
  id: string;
  username: string;
  playerId: string;
}

// ---------------------------------------------------------------------------
// Surveillance & Real-Time Seeker Tracking
// ---------------------------------------------------------------------------

export interface SeekerTelemetry {
  id: string;
  playerId: string;          // e.g. S-001
  name: string;              // e.g. "Echo Agent"
  zoneId: 'new-west' | 'admin' | 'new-east' | 'corridor';
  zoneName: string;          // e.g. "New Building (West)", "Admin Block"
  x: number;                 // Normalized map coordinate (0-1000)
  y: number;                 // Normalized map coordinate (0-800)
  battery: number;           // Battery % (e.g. 84)
  signal: 'STRONG' | 'GOOD' | 'WEAK';
  status: 'ACTIVE' | 'CLAIMING_ARTIFACT' | 'IN_TRANSIT';
  speedKmh?: number;
  qrScannedCount?: number;   // 10 valid / 5 wrong
  lastPing: number;          // timestamp ms
}

export interface Participant {
  id: string;
  playerId: string;          // e.g. H-014 or S-007
  name: string;
  role: 'HIDER' | 'SEEKER';
  status: ParticipantStatus;
  foundAt?: number | null;
  foundBy?: string | null;   // Seeker playerId who found them
  foundLocation?: string | null;
  notes?: string;
  lastUpdated: number;
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
// Game config (global state)
// ---------------------------------------------------------------------------

export interface GameConfig {
  status: GameStatus;
  startTime: number | null;
  endTime: number | null;
}

// ---------------------------------------------------------------------------
// Legacy types kept for backward compatibility with existing components
// ---------------------------------------------------------------------------

export type Team = UserRole;

export interface Player {
  id: string;
  name: string;
  team: Team;
  status: 'HIDDEN' | 'EXPOSED' | 'ELIMINATED';
  eliminationsAvailable: number;
  challengesSolved: string[];
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: ChallengeDifficulty;
  locationId: string;
  answer: string;
  solved: boolean;
}

export interface GameState {
  startTime: number;
  endTime: number;
  status: 'WAITING' | 'ACTIVE' | 'FINISHED';
  player: Player;
  challenges: Challenge[];
  zones: Zone[];
}
