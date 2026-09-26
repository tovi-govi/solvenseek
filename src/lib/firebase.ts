import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  getDocs,
  runTransaction,
} from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import type { Profile, SeekerTelemetry, SeekerBroadcast, Challenge, ChallengeSolveResult } from '../types/game';
import { getServerNow } from './serverTime';

// Firebase configuration with environment variable support & fallback
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBP2_ouW2tlw-JD2lU4xXFwmrf_Lm_s2fY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "cmiyc-d170c.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "cmiyc-d170c",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "cmiyc-d170c.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "762238097989",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:762238097989:web:56a7dad85d439ad4f5e12c",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-0FW1KQN31J"
};

// Initialize Firebase safely (prevent double initialization in HMR)
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Safe Analytics initialization
export let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {
    // Analytics not supported or blocked by client
  });
}

/**
 * Fetch or create a user profile in Cloud Firestore ('users' collection).
 * In the database schema, users are assigned role = 'hider'.
 */
export async function getOrCreateUserProfile(
  uid: string,
  email: string | null,
  displayName?: string | null
): Promise<Profile> {
  const userRef = doc(db, 'users', uid);
  
  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      const existingRole = data.role;
      const role = (existingRole ?? 'hider') as Profile['role'];

      // If document in schema was missing role, populate role = 'hider'
      if (!existingRole) {
        await setDoc(userRef, { role: 'hider' }, { merge: true }).catch((e) => {
          console.warn('Could not persist default hider role to Firestore:', e);
        });
      }

      return {
        id: uid,
        playerId: data.playerId ?? `HDR-${uid.slice(0, 4).toUpperCase()}`,
        username: data.username ?? displayName ?? email?.split('@')[0] ?? 'HIDER',
        role: role,
        status: data.status ?? 'ACTIVE',
        eliminationTokens: Number(data.eliminationTokens ?? 0),
        createdAt: data.createdAt ?? new Date().toISOString(),
      };
    }

    // New operative document in database schema: assigned role = 'hider'
    const newProfile: Profile = {
      id: uid,
      playerId: `HDR-${uid.slice(0, 4).toUpperCase()}`,
      username: displayName ?? email?.split('@')[0] ?? 'HIDER',
      role: 'hider',
      status: 'ACTIVE',
      eliminationTokens: 0,
      createdAt: new Date().toISOString(),
    };

    await setDoc(userRef, {
      ...newProfile,
      email: email ?? '',
    });

    return newProfile;
  } catch (err) {
    console.warn('Firestore user profile fetch/create fallback:', err);
    return {
      id: uid,
      playerId: `HDR-${uid.slice(0, 4).toUpperCase()}`,
      username: displayName ?? email?.split('@')[0] ?? 'HIDER',
      role: 'hider',
      status: 'ACTIVE',
      eliminationTokens: 0,
      createdAt: new Date().toISOString(),
    };
  }
}

/**
 * Real-time listener for seekers collection in Cloud Firestore ('seekers' collection)
 * Listens to active seekers and maps fields matching the mobile app schema.
 */
export function subscribeToSeekers(onUpdate: (seekers: SeekerTelemetry[]) => void): () => void {
  try {
    const seekersRef = collection(db, 'seekers');

    return onSnapshot(
      seekersRef,
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            uid: data.uid || docSnap.id,
            playerId: data.playerId || `p_${docSnap.id.slice(0, 6)}`,
            name: data.name || 'Seeker',
            teamId: data.teamId || 'alpha',
            active: Boolean(data.active),
            status: data.status || 'ACTIVE',
            lat: typeof data.lat === 'number' ? data.lat : undefined,
            lon: typeof data.lon === 'number' ? data.lon : undefined,
            x: Number(data.x ?? 500),
            y: Number(data.y ?? 375),
            zoneId: data.zoneId || 'unknown',
            zoneName: data.zoneName || 'In Transit',
            battery: Number(data.battery ?? 100),
            signal: data.signal ?? 'STRONG',
            speedKmh: Number(data.speedKmh ?? 0),
            headingDeg: data.headingDeg ?? null,
            accuracyM: data.accuracyM != null ? Number(data.accuracyM) : undefined,
            qrScannedCount: Number(data.qrScannedCount ?? 0),
            lastPing: typeof data.lastPing === 'number' ? data.lastPing : Date.now(),
          } as SeekerTelemetry;
        });

        // Client-side sort by lastPing descending (avoids composite index overrides)
        list.sort((a, b) => (b.lastPing || 0) - (a.lastPing || 0));

        onUpdate(list);
      },
      (error) => {
        console.error('Seeker telemetry subscription error:', error);
      }
    );
  } catch (err) {
    console.error('Could not subscribe to seekers collection:', err);
    return () => {};
  }
}

export const subscribeToRealSeekers = subscribeToSeekers;

/**
 * Fetch all real seekers once from Cloud Firestore
 */
export async function fetchRealSeekers(): Promise<SeekerTelemetry[]> {
  try {
    const seekersRef = collection(db, 'seekers');
    const snap = await getDocs(seekersRef);
    const list = snap.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        uid: data.uid || docSnap.id,
        playerId: data.playerId || `p_${docSnap.id.slice(0, 6)}`,
        name: data.name || 'Seeker',
        teamId: data.teamId || 'alpha',
        active: Boolean(data.active),
        status: data.status || 'ACTIVE',
        lat: typeof data.lat === 'number' ? data.lat : undefined,
        lon: typeof data.lon === 'number' ? data.lon : undefined,
        x: Number(data.x ?? 500),
        y: Number(data.y ?? 375),
        zoneId: data.zoneId || 'unknown',
        zoneName: data.zoneName || 'In Transit',
        battery: Number(data.battery ?? 100),
        signal: data.signal ?? 'STRONG',
        speedKmh: Number(data.speedKmh ?? 0),
        headingDeg: data.headingDeg ?? null,
        accuracyM: data.accuracyM != null ? Number(data.accuracyM) : undefined,
        qrScannedCount: Number(data.qrScannedCount ?? 0),
        lastPing: typeof data.lastPing === 'number' ? data.lastPing : Date.now(),
      } as SeekerTelemetry;
    });

    list.sort((a, b) => (b.lastPing || 0) - (a.lastPing || 0));
    return list;
  } catch (err) {
    console.warn('Error fetching real seekers from Firestore:', err);
    return [];
  }
}

/**
 * Save or update a real seeker document in Firestore
 */
export async function saveRealSeeker(seeker: SeekerTelemetry): Promise<void> {
  const docRef = doc(db, 'seekers', seeker.id);
  await setDoc(docRef, {
    ...seeker,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

/**
 * Delete a seeker document from Firestore
 */
export async function deleteRealSeeker(seekerId: string): Promise<void> {
  const docRef = doc(db, 'seekers', seekerId);
  await deleteDoc(docRef);
}

/**
 * Real-time listener for broadcasts in Cloud Firestore
 */
export function subscribeToRealBroadcasts(
  onBroadcastsUpdate: (history: SeekerBroadcast[], latest: SeekerBroadcast | null) => void
): () => void {
  try {
    const q = query(collection(db, 'broadcasts'), orderBy('timestamp', 'desc'), limit(25));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: SeekerBroadcast[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            timestamp: typeof data.timestamp?.toMillis === 'function' ? data.timestamp.toMillis() : (data.serverEpochMs ?? Date.now()),
            seekerPositions: data.seekerPositions ?? [],
            totalActiveSeekers: Number(data.totalActiveSeekers ?? 0),
            operator: data.operator ?? 'Surveillance HQ',
          };
        });
        onBroadcastsUpdate(list, list[0] ?? null);
      },
      (error) => {
        console.warn('Firestore broadcasts subscription error:', error);
      }
    );
    return unsub;
  } catch (err) {
    console.warn('Could not subscribe to broadcasts collection:', err);
    return () => {};
  }
}

/**
 * Record a real transmission broadcast to Cloud Firestore
 */
export async function recordRealBroadcast(broadcast: SeekerBroadcast): Promise<void> {
  const serverNow = getServerNow();
  const docRef = doc(db, 'broadcasts', broadcast.id);
  
  await setDoc(docRef, {
    id: broadcast.id,
    timestamp: serverTimestamp(),
    serverEpochMs: serverNow,
    seekerPositions: broadcast.seekerPositions,
    totalActiveSeekers: broadcast.totalActiveSeekers,
    operator: broadcast.operator,
  });

  // Also update singleton state
  const stateRef = doc(db, 'system', 'broadcast_state');
  await setDoc(stateRef, {
    id: broadcast.id,
    timestamp: serverTimestamp(),
    serverEpochMs: serverNow,
    operator: broadcast.operator,
    cycleMinutes: 10,
    totalActiveSeekers: broadcast.totalActiveSeekers,
  });
}

// ---------------------------------------------------------------------------
// Hider Challenges — Shared Pool with Atomic First-Solve Lockout
// ---------------------------------------------------------------------------

export const INITIAL_FILLER_CHALLENGES: Omit<Challenge, 'solvedBy' | 'solvedAt'>[] = [
  {
    id: 'ch-01',
    title: 'ANOMALY_01: Packet Intercept',
    description: 'Analyze the intercepted radio burst:\n\n> T3BlblZlcnNlIENURg==\n\nDecode the payload string.',
    category: 'CRYPTOGRAPHY',
    difficulty: 'EASY',
    points: 50,
    tokensAwarded: 1,
    answer: 'openverse ctf',
    hints: ['Standard Base64 encoding.', 'Case-insensitive string.'],
    isSolved: false,
    order: 1,
  },
  {
    id: 'ch-02',
    title: 'ANOMALY_02: Bitwise Logic Gate',
    description: 'Compute the bitwise XOR operation:\n\n> 0b10110101 XOR 0b11001010\n\nEnter the resulting value as an integer.',
    category: 'LOGIC',
    difficulty: 'MEDIUM',
    points: 100,
    tokensAwarded: 1,
    answer: '127',
    hints: ['Perform XOR column by column.', 'Convert binary result to base 10.'],
    isSolved: false,
    order: 2,
  },
  {
    id: 'ch-03',
    title: 'ANOMALY_03: HTTP Protocol Diagnostic',
    description: 'What standard 3-digit HTTP status code signifies that the requested endpoint is missing or not found on the server?',
    category: 'NETWORK',
    difficulty: 'EASY',
    points: 50,
    tokensAwarded: 1,
    answer: '404',
    hints: ['Client error response.', 'Classic 4XX status code.'],
    isSolved: false,
    order: 3,
  },
  {
    id: 'ch-04',
    title: 'ANOMALY_04: Terminal Shell Inspection',
    description: 'Provide the exact Linux command to list all files in the current directory including hidden files in long listing format.',
    category: 'LINUX',
    difficulty: 'EASY',
    points: 50,
    tokensAwarded: 1,
    answer: 'ls -la|ls -al',
    hints: ['Flags include listing and all.', 'Either "ls -la" or "ls -al".'],
    isSolved: false,
    order: 4,
  },
  {
    id: 'ch-05',
    title: 'ANOMALY_05: Cryptographic Hash Cracking',
    description: 'The MD5 hash of an administrator password was extracted:\n\n> 5f4dcc3b5aa765d61d8327deb882cf99\n\nWhat is the decrypted plain text password?',
    category: 'CRYPTOGRAPHY',
    difficulty: 'HARD',
    points: 200,
    tokensAwarded: 2,
    answer: 'password',
    hints: ['One of the most common passwords in history.', '8 characters lowercase.'],
    isSolved: false,
    order: 5,
  },
  {
    id: 'ch-06',
    title: 'ANOMALY_06: Network Port Authority',
    description: 'Which default port number is used for encrypted Transport Layer Security (TLS/HTTPS) web communication?',
    category: 'NETWORK',
    difficulty: 'EASY',
    points: 50,
    tokensAwarded: 1,
    answer: '443',
    hints: ['HTTP is 80; HTTPS is ?', 'Three digits.'],
    isSolved: false,
    order: 6,
  },
  {
    id: 'ch-07',
    title: 'ANOMALY_07: Shift Cipher Decryption',
    description: 'A Caesar cipher with a +3 right shift produced the ciphertext:\n\n> FDPSXV\n\nDecrypt to uncover the plain keyword.',
    category: 'CRYPTOGRAPHY',
    difficulty: 'MEDIUM',
    points: 100,
    tokensAwarded: 1,
    answer: 'campus',
    hints: ['Shift each character backwards by 3 letters in the alphabet.', 'F (-3) -> C'],
    isSolved: false,
    order: 7,
  },
  {
    id: 'ch-08',
    title: 'ANOMALY_08: OSINT Project Milestone',
    description: 'Enter the founding milestone year recorded in the OpenVerse project archives.',
    category: 'OSINT',
    difficulty: 'MEDIUM',
    points: 100,
    tokensAwarded: 1,
    answer: '2024',
    hints: ['Check the primary open-source repo creation date.'],
    isSolved: false,
    order: 8,
  },
];

/**
 * Normalizes candidate answer and tests against official answer (supports pipe-separated variants)
 */
function checkAnswerMatch(candidate: string, official: string): boolean {
  const normCandidate = candidate.trim().toLowerCase().replace(/\s+/g, ' ');
  const options = official.split('|').map((o) => o.trim().toLowerCase().replace(/\s+/g, ' '));
  return options.includes(normCandidate);
}

/**
 * Seeds default filler challenges into Firestore if the collection is currently empty
 */
export async function seedDefaultChallengesIfEmpty(): Promise<void> {
  try {
    const colRef = collection(db, 'challenges');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      return; // Already seeded
    }

    for (const ch of INITIAL_FILLER_CHALLENGES) {
      await setDoc(doc(db, 'challenges', ch.id), {
        ...ch,
        solvedBy: null,
        solvedAt: null,
        createdAt: serverTimestamp(),
      });
    }
  } catch (err) {
    console.warn('Could not seed challenges to Firestore:', err);
  }
}

/**
 * Real-time listener for the shared challenge pool
 */
export function subscribeToRealChallenges(
  onUpdate: (challenges: Challenge[]) => void
): () => void {
  try {
    const q = query(collection(db, 'challenges'), orderBy('order', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Challenge[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: data.title ?? 'CHALLENGE ANOMALY',
            description: data.description ?? '',
            category: data.category ?? 'LOGIC',
            difficulty: data.difficulty ?? 'MEDIUM',
            points: Number(data.points ?? 100),
            tokensAwarded: Number(data.tokensAwarded ?? 1),
            answer: data.answer ?? '',
            hints: Array.isArray(data.hints) ? data.hints : [],
            isSolved: Boolean(data.isSolved),
            solvedBy: data.solvedBy ?? null,
            solvedAt: data.solvedAt ?? null,
            order: Number(data.order ?? 0),
          };
        });
        onUpdate(list);
      },
      (err) => {
        console.warn('Realtime challenges subscription error:', err);
      }
    );
    return unsub;
  } catch (err) {
    console.warn('Could not subscribe to challenges:', err);
    return () => {};
  }
}

/**
 * Atomically submit an answer for a challenge using a Firestore transaction.
 * First-solve locks out all other players grid-wide.
 */
export async function submitChallengeAnswerAtomic(
  profile: Profile,
  challengeId: string,
  candidateAnswer: string
): Promise<ChallengeSolveResult> {
  const challengeDocRef = doc(db, 'challenges', challengeId);
  const userDocRef = doc(db, 'users', profile.id);

  try {
    const result = await runTransaction(db, async (transaction) => {
      const chSnap = await transaction.get(challengeDocRef);
      if (!chSnap.exists()) {
        return { success: false, tokensGranted: 0, error: 'CHALLENGE_NOT_FOUND' };
      }

      const chData = chSnap.data() as Partial<Challenge>;
      if (chData.isSolved) {
        return {
          success: false,
          tokensGranted: 0,
          error: 'CHALLENGE_ALREADY_CLAIMED',
          alreadySolvedBy: chData.solvedBy?.playerId ?? chData.solvedBy?.username ?? 'ANOTHER OPERATIVE',
        };
      }

      const officialAnswer = String(chData.answer ?? '');
      if (!checkAnswerMatch(candidateAnswer, officialAnswer)) {
        return { success: false, tokensGranted: 0, error: 'INVALID_ANSWER' };
      }

      // Correct answer! Atomically lock this challenge
      const awarded = Number(chData.tokensAwarded ?? 1);
      transaction.update(challengeDocRef, {
        isSolved: true,
        solvedBy: {
          uid: profile.id,
          playerId: profile.playerId,
          username: profile.username,
        },
        solvedAt: Date.now(),
      });

      // Atomically award tokens to the player
      const userSnap = await transaction.get(userDocRef);
      const currentTokens = Number(userSnap.data()?.eliminationTokens ?? profile.eliminationTokens ?? 0);
      transaction.update(userDocRef, {
        eliminationTokens: currentTokens + awarded,
      });

      return { success: true, tokensGranted: awarded };
    });

    return result;
  } catch (err) {
    console.error('Atomic challenge submission error:', err);
    return {
      success: false,
      tokensGranted: 0,
      error: err instanceof Error ? err.message : 'TRANSACTION_FAILED',
    };
  }
}
