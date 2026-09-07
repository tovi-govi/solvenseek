/**
 * gameService.ts — Service layer for all game operations.
 *
 * In MOCK MODE (no Supabase configured):
 *   - Auth stored in sessionStorage
 *   - Game state stored in localStorage
 *   - Cross-tab realtime via BroadcastChannel
 *
 * In SUPABASE MODE:
 *   - Auth via supabase.auth
 *   - Game state in Postgres (via RLS + RPC functions)
 *   - Realtime via Supabase Realtime channels
 */

import { supabase, isMockMode } from './supabase';
import {
  MOCK_USERS,
  MOCK_HIDER_CHALLENGES,
  MOCK_SEEKER_CHALLENGES,
  MOCK_ZONES,
  MOCK_GAME_CONFIG
} from './mockData';
import type {
  Profile,
  HiderChallenge,
  SeekerChallenge,
  Zone,
  ActiveHider,
  GameConfig,
} from '../types/game';

// ---------------------------------------------------------------------------
// Storage Keys
// ---------------------------------------------------------------------------
const SESSION_VERSION = 'v2';                            // bump to force re-login
const SK_SESSION      = `ov_session_${SESSION_VERSION}`; // stores profile id
const SK_USERNAME     = `ov_username_${SESSION_VERSION}`;// stores username for unambiguous lookup
const SK_ELIMINATED   = 'ov_eliminated';                 // JSON array of eliminated profile ids
const SK_SOLVED_H     = (id: string) => `ov_h_solved_${id}`;
const SK_SOLVED_S     = (id: string) => `ov_s_solved_${id}`;
const SK_TOKENS       = (id: string) => `ov_tokens_${id}`;

// ---------------------------------------------------------------------------
// BroadcastChannel for cross-tab realtime (mock mode only)
// ---------------------------------------------------------------------------
let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel {
  if (!channel) channel = new BroadcastChannel('ov_realtime');
  return channel;
}

type RealtimeEvent =
  | { type: 'PLAYER_ELIMINATED'; targetId: string }
  | { type: 'TOKENS_UPDATED';   profileId: string; tokens: number }
  | { type: 'CHALLENGE_SOLVED'; challengeId: string; profileId: string };

function broadcast(event: RealtimeEvent) {
  getChannel().postMessage(event);
}

// ---------------------------------------------------------------------------
// AUTH
// ---------------------------------------------------------------------------

export async function login(
  username: string,
  password: string
): Promise<{ profile: Profile } | { error: string }> {
  if (isMockMode) {
    const user = MOCK_USERS[username.toLowerCase()];
    if (!user || user.password !== password) {
      return { error: 'INVALID CREDENTIALS' };
    }
    // Check if this player has been eliminated
    const eliminated = getEliminatedIds();
    const profile: Profile = {
      ...user.profile,
      status: eliminated.includes(user.profile.id) ? 'ELIMINATED' : 'ACTIVE',
      eliminationTokens: getTokenCount(user.profile.id),
    };
    sessionStorage.setItem(SK_SESSION, user.profile.id);
    sessionStorage.setItem(SK_USERNAME, username.toLowerCase());
    return { profile };
  }

  // --- Supabase mode ---
  const { data, error } = await supabase!.auth.signInWithPassword({
    email: `${username}@openverse.local`,
    password,
  });
  if (error || !data.user) return { error: error?.message ?? 'Login failed' };

  const { data: profileData, error: profErr } = await supabase!
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (profErr || !profileData) return { error: 'Profile not found' };

  return {
    profile: {
      id:               profileData.id,
      username:         profileData.username,
      playerId:         profileData.player_id,
      role:             profileData.role,
      status:           profileData.status,
      eliminationTokens: profileData.elimination_tokens ?? 0,
    },
  };
}

export async function logout(): Promise<void> {
  if (isMockMode) {
    sessionStorage.removeItem(SK_SESSION);
    sessionStorage.removeItem(SK_USERNAME);
    return;
  }
  await supabase!.auth.signOut();
}

export async function getCurrentProfile(): Promise<Profile | null> {
  if (isMockMode) {
    const id       = sessionStorage.getItem(SK_SESSION);
    const username = sessionStorage.getItem(SK_USERNAME);
    if (!id) return null;

    // Primary lookup: by stored username (unambiguous)
    // Fallback: by profile id
    const user =
      (username ? MOCK_USERS[username] : undefined) ??
      Object.values(MOCK_USERS).find((u) => u.profile.id === id);

    if (!user) {
      // Stale session — clear it
      sessionStorage.removeItem(SK_SESSION);
      sessionStorage.removeItem(SK_USERNAME);
      return null;
    }
    const eliminated = getEliminatedIds();
    return {
      ...user.profile,
      status: eliminated.includes(id) ? 'ELIMINATED' : 'ACTIVE',
      eliminationTokens: getTokenCount(id),
    };
  }

  const { data } = await supabase!.auth.getUser();
  if (!data.user) return null;
  const { data: p } = await supabase!
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();
  if (!p) return null;
  return {
    id: p.id, username: p.username, playerId: p.player_id,
    role: p.role, status: p.status, eliminationTokens: p.elimination_tokens ?? 0,
  };
}

// ---------------------------------------------------------------------------
// GAME CONFIG
// ---------------------------------------------------------------------------

export async function getGameConfig(): Promise<GameConfig> {
  if (isMockMode) return MOCK_GAME_CONFIG;

  const { data } = await supabase!.from('game_state').select('*').eq('id', 1).single();
  if (!data) return { status: 'ACTIVE', startTime: null, endTime: null };
  return { status: data.status, startTime: data.start_time ? new Date(data.start_time).getTime() : null, endTime: data.end_time ? new Date(data.end_time).getTime() : null };
}

// ---------------------------------------------------------------------------
// HIDER — Challenges & Zones
// ---------------------------------------------------------------------------

export async function getHiderChallenges(profileId: string): Promise<HiderChallenge[]> {
  if (isMockMode) {
    const caller = Object.values(MOCK_USERS).find((u) => u.profile.id === profileId);
    const eliminated = getEliminatedIds();
    if (!caller || caller.profile.role !== 'HIDER' || eliminated.includes(profileId)) {
      return [];
    }

    const solved = getSolvedHider(profileId);
    return MOCK_HIDER_CHALLENGES.map(({ answer: _a, ...rest }) => ({
      ...rest,
      solved: solved.includes(rest.id),
    }));
  }

  const { data } = await supabase!
    .from('hider_challenges')
    .select('id,title,description,difficulty,category,hints,points')
    .eq('active', true);

  const solved = getSolvedHider(profileId);
  return (data ?? []).map((c: Record<string, any>) => ({
    id: c.id, title: c.title, description: c.description,
    difficulty: c.difficulty as HiderChallenge['difficulty'],
    category: c.category as HiderChallenge['category'],
    hints: (c.hints ?? []) as string[], points: c.points as number,
    solved: solved.includes(c.id),
  }));
}

// Zones belong to SEEKER logic
export async function getZones(profileId: string): Promise<Zone[]> {
  if (isMockMode) {
    const caller = Object.values(MOCK_USERS).find((u) => u.profile.id === profileId);
    const eliminated = getEliminatedIds();
    if (!caller || caller.profile.role !== 'SEEKER' || eliminated.includes(profileId)) {
      return [];
    }

    const solved = getSolvedSeeker(profileId);
    const solvedLocations = MOCK_SEEKER_CHALLENGES.filter((c) => solved.includes(c.id)).map((c) => c.locationId);

    return MOCK_ZONES.map((z) => ({
      ...z,
      isAccessible: solvedLocations.includes(z.id),
      isRestricted: !solvedLocations.includes(z.id),
    }));
  }

  const solved = getSolvedSeeker(profileId);
  const solvedLocations = solved;

  return MOCK_ZONES.map((z) => ({
    ...z,
    isAccessible: solvedLocations.includes(z.id),
    isRestricted: !solvedLocations.includes(z.id),
  }));
}

/**
 * Validates a hider's answer server-side.
 * Mock: compare against answer stored in mockData.
 * Supabase: calls `solve_hider_challenge` RPC (SECURITY DEFINER).
 */
export async function solveHiderChallenge(
  profileId: string,
  challengeId: string,
  answer: string
): Promise<{ success: boolean; tokensGranted: number; error?: string }> {
  if (isMockMode) {
    const config = await getGameConfig();
    if (config.status !== 'ACTIVE') {
      return { success: false, tokensGranted: 0, error: 'Game is not active' };
    }

    const eliminated = getEliminatedIds();
    if (eliminated.includes(profileId)) {
      return { success: false, tokensGranted: 0, error: 'Player is eliminated' };
    }

    const caller = Object.values(MOCK_USERS).find((u) => u.profile.id === profileId);
    if (!caller || caller.profile.role !== 'HIDER') {
      return { success: false, tokensGranted: 0, error: 'Unauthorized role' };
    }

    const challenge = MOCK_HIDER_CHALLENGES.find((c) => c.id === challengeId);
    if (!challenge) return { success: false, tokensGranted: 0, error: 'Challenge not found' };
    const already = getSolvedHider(profileId);
    if (already.includes(challengeId)) return { success: false, tokensGranted: 0, error: 'Already solved' };

    const correct = challenge.answer.trim().toLowerCase() === answer.trim().toLowerCase();
    if (!correct) return { success: false, tokensGranted: 0, error: 'Wrong answer' };

    addSolvedHider(profileId, challengeId);
    const newTokens = incrementTokens(profileId);
    broadcast({ type: 'TOKENS_UPDATED', profileId, tokens: newTokens });
    broadcast({ type: 'CHALLENGE_SOLVED', challengeId, profileId });
    return { success: true, tokensGranted: 1 };
  }

  const { data, error } = await supabase!.rpc('solve_hider_challenge', {
    p_challenge_id: challengeId,
    p_answer: answer,
  });
  if (error) return { success: false, tokensGranted: 0, error: error.message };
  return { success: !!data?.success, tokensGranted: data?.tokens_granted ?? 0 };
}

// ---------------------------------------------------------------------------
// SEEKER — Challenges
// ---------------------------------------------------------------------------

// Secure cache for remote GitHub challenges: answers never returned to browser
const remoteSeekerAnswers = new Map<string, string>();

export async function getSeekerChallenges(profileId: string): Promise<SeekerChallenge[]> {
  if (isMockMode) {
    const caller = Object.values(MOCK_USERS).find((u) => u.profile.id === profileId);
    const eliminated = getEliminatedIds();
    if (!caller || caller.profile.role !== 'SEEKER' || eliminated.includes(profileId)) {
      return [];
    }
  }

  const solved = getSolvedSeeker(profileId);

  // Optional GitHub fetch
  const ghOwner  = import.meta.env.VITE_GITHUB_OWNER;
  const ghRepo   = import.meta.env.VITE_GITHUB_REPO;
  const ghBranch = import.meta.env.VITE_GITHUB_BRANCH ?? 'main';
  const hasGitHub = ghOwner && ghRepo && ghOwner !== 'your-org';

  if (!isMockMode) {
    const { data } = await supabase!
      .from('seeker_challenges')
      .select('id,title,description,difficulty,location_id')
      .eq('active', true);

    if (data && data.length > 0) {
      return data.map((c: Record<string, any>) => ({
        id: c.id as string, title: c.title as string, description: c.description as string,
        difficulty: c.difficulty as SeekerChallenge['difficulty'],
        locationId: c.location_id as string,
        solved: solved.includes(c.id as string),
      }));
    }
  }

  if (isMockMode && hasGitHub) {
    try {
      const base = `https://raw.githubusercontent.com/${ghOwner}/${ghRepo}/${ghBranch}/challenges/seeker`;
      const indexRes = await fetch(`${base}/index.json`);
      if (indexRes.ok) {
        const ids: string[] = await indexRes.json();
        const results = await Promise.all(
          ids.map(async (id) => {
            const res = await fetch(`${base}/${id}.json`);
            if (!res.ok) return null;
            const c = await res.json();
            // Securely store answer server/service side; never expose to client
            if (c.answer) {
              remoteSeekerAnswers.set(c.id, c.answer);
            }
            const { answer: _a, ...publicChallenge } = c;
            return { ...publicChallenge, solved: solved.includes(c.id) } as SeekerChallenge;
          })
        );
        const valid = results.filter(Boolean) as SeekerChallenge[];
        if (valid.length > 0) return valid;
      }
    } catch {
      // fall through to mock
    }
  }

  // Default: use mock challenges (answers stripped)
  return MOCK_SEEKER_CHALLENGES.map(({ answer: _a, ...rest }) => ({
    ...rest,
    solved: solved.includes(rest.id),
  }));
}

/**
 * Validates a seeker answer and grants an elimination token if correct.
 * Mock: compare against answer in mockData or remoteSeekerAnswers.
 * Supabase: calls `solve_seeker_challenge` RPC.
 */
export async function solveSeekerChallenge(
  profileId: string,
  challengeId: string,
  answer: string
): Promise<{ success: boolean; tokensGranted: number; error?: string }> {
  if (isMockMode) {
    const config = await getGameConfig();
    if (config.status !== 'ACTIVE') {
      return { success: false, tokensGranted: 0, error: 'Game is not active' };
    }

    const eliminated = getEliminatedIds();
    if (eliminated.includes(profileId)) {
      return { success: false, tokensGranted: 0, error: 'Player is eliminated' };
    }

    const caller = Object.values(MOCK_USERS).find((u) => u.profile.id === profileId);
    if (!caller || caller.profile.role !== 'SEEKER') {
      return { success: false, tokensGranted: 0, error: 'Unauthorized role' };
    }

    const challenge = MOCK_SEEKER_CHALLENGES.find((c) => c.id === challengeId);
    const remoteAnswer = remoteSeekerAnswers.get(challengeId);
    const correctAnswer = challenge?.answer ?? remoteAnswer;

    if (!correctAnswer) return { success: false, tokensGranted: 0, error: 'Challenge not found' };
    const already = getSolvedSeeker(profileId);
    if (already.includes(challengeId)) return { success: false, tokensGranted: 0, error: 'Already solved' };

    const correct = correctAnswer.trim().toLowerCase() === answer.trim().toLowerCase();
    if (!correct) return { success: false, tokensGranted: 0, error: 'Wrong answer' };

    addSolvedSeeker(profileId, challengeId);
    const newTokens = incrementTokens(profileId);
    broadcast({ type: 'TOKENS_UPDATED', profileId, tokens: newTokens });
    broadcast({ type: 'CHALLENGE_SOLVED', challengeId, profileId });
    return { success: true, tokensGranted: 1 };
  }

  const { data, error } = await supabase!.rpc('solve_seeker_challenge', {
    p_challenge_id: challengeId,
    p_answer: answer,
  });
  if (error) return { success: false, tokensGranted: 0, error: error.message };
  return { success: !!data?.success, tokensGranted: data?.tokens_granted ?? 0 };
}

// ---------------------------------------------------------------------------
// SEEKER — Target List & Elimination
// ---------------------------------------------------------------------------

export async function getActiveSeekers(): Promise<ActiveHider[]> {
  if (isMockMode) {
    const eliminated = getEliminatedIds();
    return Object.values(MOCK_USERS)
      .filter((u) => u.profile.role === 'SEEKER' && !eliminated.includes(u.profile.id))
      .map((u) => ({
        id: u.profile.id, username: u.profile.username, playerId: u.profile.playerId,
      }));
  }

  const { data } = await supabase!
    .from('profiles')
    .select('id,username,player_id')
    .eq('role', 'SEEKER')
    .eq('status', 'ACTIVE');

  return (data ?? []).map((p: Record<string, string>) => ({
    id: p.id, username: p.username, playerId: p.player_id,
  }));
}

export async function getActiveHiders(): Promise<ActiveHider[]> {
  if (isMockMode) {
    const eliminated = getEliminatedIds();
    return Object.values(MOCK_USERS)
      .filter((u) => u.profile.role === 'HIDER' && !eliminated.includes(u.profile.id))
      .map((u) => ({
        id: u.profile.id, username: u.profile.username, playerId: u.profile.playerId,
      }));
  }

  const { data } = await supabase!
    .from('profiles')
    .select('id,username,player_id')
    .eq('role', 'HIDER')
    .eq('status', 'ACTIVE');

  return (data ?? []).map((p: Record<string, string>) => ({
    id: p.id, username: p.username, playerId: p.player_id,
  }));
}

/**
 * Eliminates a player.
 * ATOMIC (mock): verify attacker & target validity → mark eliminated → decrement token → broadcast.
 * ATOMIC (Supabase): calls `eliminate_player` RPC.
 */
export async function eliminatePlayer(
  attackerProfileId: string,
  targetProfileId: string,
  targetRole?: string
): Promise<{ success: boolean; error?: string }> {
  if (isMockMode) {
    const config = await getGameConfig();
    if (config.status !== 'ACTIVE') {
      return { success: false, error: 'Game is not active' };
    }

    const eliminated = getEliminatedIds();
    if (eliminated.includes(attackerProfileId)) {
      return { success: false, error: 'Attacker is eliminated' };
    }

    const attacker = Object.values(MOCK_USERS).find((u) => u.profile.id === attackerProfileId);
    if (!attacker) return { success: false, error: 'Invalid attacker' };

    const tokens = getTokenCount(attackerProfileId);
    if (tokens < 1) return { success: false, error: 'No elimination tokens available' };

    if (eliminated.includes(targetProfileId)) return { success: false, error: 'Target already eliminated' };

    // Verify target exists and is an active opponent
    const expectedTargetRole = attacker.profile.role === 'SEEKER' ? 'HIDER' : 'SEEKER';
    if (targetRole && targetRole !== expectedTargetRole) {
      return { success: false, error: 'Target role mismatch' };
    }

    const target = Object.values(MOCK_USERS).find(
      (u) => u.profile.id === targetProfileId && u.profile.role === expectedTargetRole
    );
    if (!target) return { success: false, error: 'Invalid target role or opponent' };

    // Atomic operations
    addEliminated(targetProfileId);
    const newTokens = decrementTokens(attackerProfileId);
    broadcast({ type: 'PLAYER_ELIMINATED', targetId: targetProfileId });
    broadcast({ type: 'TOKENS_UPDATED', profileId: attackerProfileId, tokens: newTokens });
    return { success: true };
  }

  const { data, error } = await supabase!.rpc('eliminate_player', {
    p_target_id: targetProfileId,
  });
  if (error) return { success: false, error: error.message };
  return { success: !!data };
}

// ---------------------------------------------------------------------------
// REALTIME Subscriptions
// ---------------------------------------------------------------------------

export function subscribeToElimination(
  myProfileId: string,
  onEliminated: () => void
): () => void {
  if (isMockMode) {
    const ch = getChannel();
    const handler = (event: MessageEvent<RealtimeEvent>) => {
      if (event.data.type === 'PLAYER_ELIMINATED' && event.data.targetId === myProfileId) {
        onEliminated();
      }
    };
    ch.addEventListener('message', handler);
    return () => ch.removeEventListener('message', handler);
  }

  // Supabase realtime
  const sub = supabase!
    .channel(`profile:${myProfileId}`)
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'profiles',
      filter: `id=eq.${myProfileId}`,
    }, (payload) => {
      if ((payload.new as Record<string, string>).status === 'ELIMINATED') onEliminated();
    })
    .subscribe();

  return () => { supabase!.removeChannel(sub); };
}

export function subscribeToTokenUpdates(
  profileId: string,
  onUpdate: (tokens: number) => void
): () => void {
  if (isMockMode) {
    const ch = getChannel();
    const handler = (event: MessageEvent<RealtimeEvent>) => {
      if (event.data.type === 'TOKENS_UPDATED' && event.data.profileId === profileId) {
        onUpdate(event.data.tokens);
      }
    };
    ch.addEventListener('message', handler);
    return () => ch.removeEventListener('message', handler);
  }

  const sub = supabase!
    .channel(`tokens:${profileId}`)
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'profiles',
      filter: `id=eq.${profileId}`,
    }, (payload) => {
      onUpdate((payload.new as Record<string, number>).elimination_tokens ?? 0);
    })
    .subscribe();

  return () => { supabase!.removeChannel(sub); };
}

export function subscribeToActiveTargetsChanges(onUpdate: () => void): () => void {
  if (isMockMode) {
    const ch = getChannel();
    const handler = (event: MessageEvent<RealtimeEvent>) => {
      if (event.data.type === 'PLAYER_ELIMINATED') onUpdate();
    };
    ch.addEventListener('message', handler);
    return () => ch.removeEventListener('message', handler);
  }

  const sub = supabase!
    .channel('active-hiders')
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'profiles',
    }, onUpdate)
    .subscribe();

  return () => { supabase!.removeChannel(sub); };
}

// ---------------------------------------------------------------------------
// Local storage helpers (mock only)
// ---------------------------------------------------------------------------

function getEliminatedIds(): string[] {
  try { return JSON.parse(localStorage.getItem(SK_ELIMINATED) ?? '[]'); } catch { return []; }
}
function addEliminated(id: string) {
  const arr = getEliminatedIds();
  if (!arr.includes(id)) arr.push(id);
  localStorage.setItem(SK_ELIMINATED, JSON.stringify(arr));
}

function getSolvedHider(profileId: string): string[] {
  try { return JSON.parse(localStorage.getItem(SK_SOLVED_H(profileId)) ?? '[]'); } catch { return []; }
}
function addSolvedHider(profileId: string, challengeId: string) {
  const arr = getSolvedHider(profileId);
  if (!arr.includes(challengeId)) arr.push(challengeId);
  localStorage.setItem(SK_SOLVED_H(profileId), JSON.stringify(arr));
}

function getSolvedSeeker(profileId: string): string[] {
  try { return JSON.parse(localStorage.getItem(SK_SOLVED_S(profileId)) ?? '[]'); } catch { return []; }
}
function addSolvedSeeker(profileId: string, challengeId: string) {
  const arr = getSolvedSeeker(profileId);
  if (!arr.includes(challengeId)) arr.push(challengeId);
  localStorage.setItem(SK_SOLVED_S(profileId), JSON.stringify(arr));
}

function getTokenCount(profileId: string): number {
  return parseInt(localStorage.getItem(SK_TOKENS(profileId)) ?? '0', 10);
}
function incrementTokens(profileId: string): number {
  const n = getTokenCount(profileId) + 1;
  localStorage.setItem(SK_TOKENS(profileId), String(n));
  return n;
}
function decrementTokens(profileId: string): number {
  const n = Math.max(0, getTokenCount(profileId) - 1);
  localStorage.setItem(SK_TOKENS(profileId), String(n));
  return n;
}
