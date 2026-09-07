// ---------------------------------------------------------------------------
// Core enums / unions
// ---------------------------------------------------------------------------

export type UserRole = 'HIDER' | 'SEEKER';
export type UserStatus = 'ACTIVE' | 'ELIMINATED';
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
