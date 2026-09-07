/**
 * test_game_flows.ts — Automated Regression Test Suite
 * Tests full business logic, security rules, role separation,
 * duplicate token prevention, and elimination lockdown.
 */

// Mock browser globals needed by gameService (localStorage, sessionStorage, BroadcastChannel)
class MockStorage {
  private store = new Map<string, string>();
  getItem(k: string) { return this.store.get(k) ?? null; }
  setItem(k: string, v: string) { this.store.set(k, String(v)); }
  removeItem(k: string) { this.store.delete(k); }
  clear() { this.store.clear(); }
}

class MockBroadcastChannel {
  name: string;
  constructor(name: string) { this.name = name; }
  postMessage(_msg: any) {}
  addEventListener(_type: string, _fn: any) {}
  removeEventListener(_type: string, _fn: any) {}
}

(globalThis as any).localStorage = new MockStorage();
(globalThis as any).sessionStorage = new MockStorage();
(globalThis as any).BroadcastChannel = MockBroadcastChannel;

async function runTests() {
  console.log("=================================================");
  console.log("  OPENVERSE HIDE & SEEK — AUTOMATED TEST SUITE   ");
  console.log("=================================================\n");

  const {
    login,
    getCurrentProfile,
    getHiderChallenges,
    solveHiderChallenge,
    getSeekerChallenges,
    solveSeekerChallenge,
    getZones,
    getActiveHiders,
    getActiveSeekers,
    eliminatePlayer,
    logout
  } = await import('../../src/lib/gameService.js');

  let passed = 0;
  let failed = 0;

  function assert(cond: boolean, desc: string) {
    if (cond) {
      console.log(`  ✓ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ✕ FAIL: ${desc}`);
      failed++;
    }
  }

  // TEST 1: Login Authentication
  console.log("[1] Testing Login & Authentication...");
  const badLogin = await login('hider1', 'wrongpass');
  assert('error' in badLogin && badLogin.error === 'INVALID CREDENTIALS', 'Invalid credentials rejected');

  const goodHiderLogin = await login('hider1', 'hide123');
  assert('profile' in goodHiderLogin && goodHiderLogin.profile.role === 'HIDER', 'Hider login succeeds with correct role');
  assert('profile' in goodHiderLogin && goodHiderLogin.profile.status === 'ACTIVE', 'Hider initial status is ACTIVE');

  const profileFromSession = await getCurrentProfile();
  assert(profileFromSession !== null && profileFromSession.username === 'hider1', 'Session persists and retrieves profile');

  // TEST 2: Role Data Segregation
  console.log("\n[2] Testing Role Separation & Data Protection...");
  const hiderChallenges = await getHiderChallenges(goodHiderLogin.profile.id);
  assert(hiderChallenges.length === 6, 'Active Hider receives hider challenges');
  assert(hiderChallenges.every((c: any) => !('answer' in c) || c.answer === undefined), 'Secret challenge answers are NOT exposed to client');

  // Seeker attempting to get hider challenges
  const goodSeekerLogin = await login('seeker1', 'seek123');
  assert('profile' in goodSeekerLogin && goodSeekerLogin.profile.role === 'SEEKER', 'Seeker login succeeds');
  const seekerGettingHiderChallenges = await getHiderChallenges(goodSeekerLogin.profile.id);
  assert(seekerGettingHiderChallenges.length === 0, 'Seeker cannot access hider challenge pool');

  const hiderGettingSeekerChallenges = await getSeekerChallenges(goodHiderLogin.profile.id);
  assert(hiderGettingSeekerChallenges.length === 0, 'Hider cannot access seeker challenge pool');

  // TEST 3: Hider Challenge Submission & Token Awarding
  console.log("\n[3] Testing Hider CTF Challenge Solving & Duplicate Prevention...");
  // Wrong answer
  const wrongAns = await solveHiderChallenge(goodHiderLogin.profile.id, 'hc-01', 'wrong answer');
  assert(!wrongAns.success && wrongAns.error === 'Wrong answer', 'Wrong answer is rejected');

  // Correct answer
  const correctAns = await solveHiderChallenge(goodHiderLogin.profile.id, 'hc-01', 'openverse ctf');
  assert(correctAns.success && correctAns.tokensGranted === 1, 'Correct answer awards 1 token');

  // Verify challenge is marked solved
  const updatedHiderChallenges = await getHiderChallenges(goodHiderLogin.profile.id);
  const solvedChal = updatedHiderChallenges.find((c) => c.id === 'hc-01');
  assert(solvedChal !== undefined && solvedChal.solved === true, 'Challenge is marked solved in challenge pool');

  // Attempt duplicate submission (anti-farming check)
  const dupAns = await solveHiderChallenge(goodHiderLogin.profile.id, 'hc-01', 'openverse ctf');
  assert(!dupAns.success && dupAns.error === 'Already solved' && dupAns.tokensGranted === 0, 'Duplicate submission blocked without awarding extra tokens');

  // TEST 4: Seeker Challenge Solving & Zone Unlocking
  console.log("\n[4] Testing Seeker Challenge Solving & Area Unlocking...");
  const initialZones = await getZones(goodSeekerLogin.profile.id);
  const auditorium = initialZones.find((z) => z.id === 'zone-1');
  assert(auditorium !== undefined && auditorium.isRestricted && !auditorium.isAccessible, 'Zone 1 initially restricted for seeker');

  // Solve Seeker Challenge for zone-1 ('sc-02', answer: 'campus-guest-123')
  const seekerSolve = await solveSeekerChallenge(goodSeekerLogin.profile.id, 'sc-02', 'campus-guest-123');
  assert(seekerSolve.success && seekerSolve.tokensGranted === 1, 'Seeker challenge solved, token awarded');

  const updatedZones = await getZones(goodSeekerLogin.profile.id);
  const unlockedAuditorium = updatedZones.find((z) => z.id === 'zone-1');
  assert(unlockedAuditorium !== undefined && !unlockedAuditorium.isRestricted && unlockedAuditorium.isAccessible, 'Zone 1 is now unlocked and accessible');

  // Duplicate solve for seeker
  const dupSeeker = await solveSeekerChallenge(goodSeekerLogin.profile.id, 'sc-02', 'campus-guest-123');
  assert(!dupSeeker.success && dupSeeker.error === 'Already solved', 'Seeker duplicate solve rejected');

  // TEST 5: Elimination Flow
  console.log("\n[5] Testing Elimination System & Atomic Deductions...");
  // Seeker targets Hider 1 ('mock-hider-1')
  const activeHidersBefore = await getActiveHiders();
  assert(activeHidersBefore.some((h) => h.id === 'mock-hider-1'), 'Hider 1 is initially active in target list');

  const elimResult = await eliminatePlayer(goodSeekerLogin.profile.id, 'mock-hider-1', 'HIDER');
  assert(elimResult.success === true, 'Seeker eliminates Hider 1 successfully');

  const activeHidersAfter = await getActiveHiders();
  assert(!activeHidersAfter.some((h) => h.id === 'mock-hider-1'), 'Eliminated Hider 1 is removed from active target list');

  // Seeker attempting to eliminate with 0 tokens remaining
  const noTokenElim = await eliminatePlayer(goodSeekerLogin.profile.id, 'mock-hider-2', 'HIDER');
  assert(!noTokenElim.success && noTokenElim.error === 'No elimination tokens available', 'Cannot eliminate without available tokens');

  // TEST 6: Eliminated Player Lockdown
  console.log("\n[6] Testing Eliminated Player Lockdown & Access Revocation...");
  // Hider 1 tries to log in after being eliminated
  const eliminatedLogin = await login('hider1', 'hide123');
  assert('profile' in eliminatedLogin && eliminatedLogin.profile.status === 'ELIMINATED', 'Eliminated player profile returns status ELIMINATED');

  // Eliminated player cannot solve challenges
  const eliminatedSolve = await solveHiderChallenge('mock-hider-1', 'hc-02', '127');
  assert(!eliminatedSolve.success && eliminatedSolve.error === 'Player is eliminated', 'Eliminated player cannot submit challenges');

  // Eliminated player cannot eliminate others
  const eliminatedElim = await eliminatePlayer('mock-hider-1', 'mock-seeker-1', 'SEEKER');
  assert(!eliminatedElim.success && eliminatedElim.error === 'Attacker is eliminated', 'Eliminated player cannot eliminate opponents');

  console.log("\n=================================================");
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) process.exit(1);
}

runTests().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
