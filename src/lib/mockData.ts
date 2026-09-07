import type { Profile, HiderChallenge, SeekerChallenge, Zone, ActiveHider, GameConfig } from '../types/game';

// ---------------------------------------------------------------------------
// Mock Users  (username → credentials + profile)
// ---------------------------------------------------------------------------
export interface MockUser {
  password: string;
  profile: Profile;
}

export const MOCK_USERS: Record<string, MockUser> = {
  hider1: {
    password: 'hide123',
    profile: {
      id: 'mock-hider-1',
      username: 'hider1',
      playerId: 'H-014',
      role: 'HIDER',
      status: 'ACTIVE',
      eliminationTokens: 0,
    },
  },
  hider2: {
    password: 'hide123',
    profile: {
      id: 'mock-hider-2',
      username: 'hider2',
      playerId: 'H-007',
      role: 'HIDER',
      status: 'ACTIVE',
      eliminationTokens: 0,
    },
  },
  hider3: {
    password: 'hide123',
    profile: {
      id: 'mock-hider-3',
      username: 'hider3',
      playerId: 'H-021',
      role: 'HIDER',
      status: 'ACTIVE',
      eliminationTokens: 0,
    },
  },
  seeker1: {
    password: 'seek123',
    profile: {
      id: 'mock-seeker-1',
      username: 'seeker1',
      playerId: 'S-007',
      role: 'SEEKER',
      status: 'ACTIVE',
      eliminationTokens: 0,
    },
  },
  seeker2: {
    password: 'seek123',
    profile: {
      id: 'mock-seeker-2',
      username: 'seeker2',
      playerId: 'S-013',
      role: 'SEEKER',
      status: 'ACTIVE',
      eliminationTokens: 0,
    },
  },
};

// ---------------------------------------------------------------------------
// Zones (SVG polygon coordinates mapped to the campus floor plan)
// ---------------------------------------------------------------------------
export const MOCK_ZONES: Zone[] = [
  { id: 'zone-1', name: 'AUDITORIUM',       points: '140,220 220,190 340,190 400,220 400,340 370,380 290,380 270,350 200,350 140,330', isAccessible: false, isRestricted: true },
  { id: 'zone-2', name: 'LIBRARY',           points: '380,430 520,430 520,480 580,480 580,670 470,670 470,590 380,590', isAccessible: false, isRestricted: true },
  { id: 'zone-3', name: 'EXHIBITION AREA',   points: '610,280 710,280 740,310 770,310 770,430 740,460 650,460 630,430 610,430', isAccessible: false, isRestricted: true },
  { id: 'zone-6', name: 'DIGITAL ARCH ROOM', points: '670,500 760,500 780,520 810,520 810,610 730,610 710,590 670,590', isAccessible: false, isRestricted: true },
];

// ---------------------------------------------------------------------------
// Hider Challenges  (answers stored here — in prod these live server-side only)
// ---------------------------------------------------------------------------
export interface HiderChallengeWithAnswer extends HiderChallenge {
  answer: string;
}

export const MOCK_HIDER_CHALLENGES: HiderChallengeWithAnswer[] = [
  {
    id: 'hc-01',
    title: 'Packet Intercept',
    description:
      'Analyze the following Base64-encoded packet and decode it:\n\n> T3BlblZlcnNlIENURg==\n\nWhat does the message say?',
    difficulty: 'EASY',
    category: 'Cryptography',
    hints: ['Think Base64 decoding', 'Standard alphabet'],
    points: 50,
    solved: false,
    answer: 'openverse ctf',
  },
  {
    id: 'hc-02',
    title: 'XOR Gate',
    description:
      'Compute the following XOR operation:\n\n> 0b10110101 XOR 0b11001010\n\nAnswer as a decimal number.',
    difficulty: 'MEDIUM',
    category: 'Logic',
    hints: ['Work bit by bit', 'XOR: same→0, different→1'],
    points: 100,
    solved: false,
    answer: '127',
  },
  {
    id: 'hc-03',
    title: 'HTTP Status Hunt',
    description:
      'Which HTTP status code indicates that the requested resource was not found on the server?',
    difficulty: 'EASY',
    category: 'Web',
    hints: [],
    points: 50,
    solved: false,
    answer: '404',
  },
  {
    id: 'hc-04',
    title: 'Shell Ghost',
    description:
      'In Linux, what command lists ALL files including hidden ones in long format?\n\nProvide the full command (e.g. ls -a).',
    difficulty: 'EASY',
    category: 'Linux',
    hints: ['Hidden files start with a dot'],
    points: 50,
    solved: false,
    answer: 'ls -la',
  },
  {
    id: 'hc-05',
    title: 'Hash Cracker',
    description:
      'The following MD5 hash was extracted from the campus Wi-Fi config file:\n\n> 5f4dcc3b5aa765d61d8327deb882cf99\n\nWhat is the original plaintext?',
    difficulty: 'HARD',
    category: 'Cryptography',
    hints: ['Very common password', 'Check rainbow tables'],
    points: 200,
    solved: false,
    answer: 'password',
  },
  {
    id: 'hc-06',
    title: 'OSINT: The Badge',
    description:
      'OpenVerse was founded in a specific year. Find the year from publicly available information about this campus CTF event.\n\nHint: Check the club\'s GitHub profile.\n\nAnswer: The founding year.',
    difficulty: 'MEDIUM',
    category: 'OSINT',
    hints: ['Check README files', 'GitHub repositories sometimes show creation year'],
    points: 100,
    solved: false,
    answer: '2024',
  },
];

// ---------------------------------------------------------------------------
// Seeker Challenges  (answers stored here — in prod validated server-side)
// ---------------------------------------------------------------------------
export interface SeekerChallengeWithAnswer extends SeekerChallenge {
  answer: string;
}

export const MOCK_SEEKER_CHALLENGES: SeekerChallengeWithAnswer[] = [
  {
    id: 'sc-01',
    title: 'Signal Intercept',
    description:
      'Decode the intercepted transmission:\n\n> VGhlIHF1aWNrIGJyb3duIGZveA==\n\nFormat: the decoded string',
    difficulty: 'MEDIUM',
    locationId: 'zone-2',
    solved: false,
    answer: 'the quick brown fox',
  },
  {
    id: 'sc-02',
    title: 'Router Override',
    description:
      'Find the default password for the campus guest network.\nFormat: word-word-number',
    difficulty: 'EASY',
    locationId: 'zone-1',
    solved: false,
    answer: 'campus-guest-123',
  },
  {
    id: 'sc-03',
    title: 'Server Room Keys',
    description:
      'A Caesar cipher with shift 3 was applied. Decrypt:\n\n> FDPSXV',
    difficulty: 'MEDIUM',
    locationId: 'zone-3',
    solved: false,
    answer: 'campus',
  },
  {
    id: 'sc-04',
    title: 'Admin Port',
    description: 'Which well-known port is used for HTTPS?',
    difficulty: 'EASY',
    locationId: 'zone-6',
    solved: false,
    answer: '443',
  },
];

// ---------------------------------------------------------------------------
// Game Config
// ---------------------------------------------------------------------------
export const MOCK_GAME_CONFIG: GameConfig = {
  status: 'ACTIVE',
  startTime: Date.now() - 10 * 60 * 1000, // started 10 mins ago
  endTime: Date.now() + 50 * 60 * 1000,   // ends in 50 mins
};

// ---------------------------------------------------------------------------
// Helper: active players for targeting
// ---------------------------------------------------------------------------
export function getMockActiveHiders(eliminatedIds: string[]): ActiveHider[] {
  return Object.values(MOCK_USERS)
    .filter((u) => u.profile.role === 'HIDER' && !eliminatedIds.includes(u.profile.id))
    .map((u) => ({
      id: u.profile.id,
      username: u.profile.username,
      playerId: u.profile.playerId,
    }));
}

export function getMockActiveSeekers(eliminatedIds: string[]): ActiveHider[] {
  return Object.values(MOCK_USERS)
    .filter((u) => u.profile.role === 'SEEKER' && !eliminatedIds.includes(u.profile.id))
    .map((u) => ({
      id: u.profile.id,
      username: u.profile.username,
      playerId: u.profile.playerId,
    }));
}
