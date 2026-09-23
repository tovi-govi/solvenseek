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
} from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import type { Profile, SeekerTelemetry, SeekerBroadcast } from '../types/game';
import { getServerNow } from './serverTime';

// Firebase configuration provided by user
const firebaseConfig = {
  apiKey: "AIzaSyBP2_ouW2tlw-JD2lU4xXFwmrf_Lm_s2fY",
  authDomain: "cmiyc-d170c.firebaseapp.com",
  projectId: "cmiyc-d170c",
  storageBucket: "cmiyc-d170c.firebasestorage.app",
  messagingSenderId: "762238097989",
  appId: "1:762238097989:web:56a7dad85d439ad4f5e12c",
  measurementId: "G-0FW1KQN31J"
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
 * Fetch or create an operator profile in Cloud Firestore ('users' collection)
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
      return {
        id: uid,
        playerId: data.playerId ?? `SURV-${uid.slice(0, 4).toUpperCase()}`,
        username: data.username ?? displayName ?? email?.split('@')[0] ?? 'OPERATOR',
        role: 'SURVEILLANCE',
        status: 'ACTIVE',
        eliminationTokens: 0,
        createdAt: data.createdAt ?? new Date().toISOString(),
      };
    }

    const newProfile: Profile = {
      id: uid,
      playerId: `SURV-${uid.slice(0, 4).toUpperCase()}`,
      username: displayName ?? email?.split('@')[0] ?? 'OPERATOR',
      role: 'SURVEILLANCE',
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
      playerId: `SURV-${uid.slice(0, 4).toUpperCase()}`,
      username: displayName ?? email?.split('@')[0] ?? 'OPERATOR',
      role: 'SURVEILLANCE',
      status: 'ACTIVE',
      eliminationTokens: 0,
      createdAt: new Date().toISOString(),
    };
  }
}

/**
 * Real-time listener for real seekers in Cloud Firestore ('seekers' collection)
 */
export function subscribeToRealSeekers(onUpdate: (seekers: SeekerTelemetry[]) => void): () => void {
  try {
    const seekersCol = collection(db, 'seekers');
    const unsub = onSnapshot(
      seekersCol,
      (snapshot) => {
        const seekers: SeekerTelemetry[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            playerId: d.playerId ?? `S-${docSnap.id.slice(0, 3).toUpperCase()}`,
            name: d.name ?? 'Seeker Node',
            zoneId: d.zoneId ?? 'new-west',
            zoneName: d.zoneName ?? 'New Building (West)',
            x: Number(d.x ?? 250),
            y: Number(d.y ?? 250),
            battery: Number(d.battery ?? 100),
            signal: d.signal ?? 'STRONG',
            status: d.status ?? 'ACTIVE',
            speedKmh: Number(d.speedKmh ?? 0),
            qrScannedCount: Number(d.qrScannedCount ?? 0),
            lastPing: d.lastPing ?? Date.now(),
          };
        });
        onUpdate(seekers);
      },
      (error) => {
        console.warn('Real Firestore seekers subscription error:', error);
      }
    );
    return unsub;
  } catch (err) {
    console.warn('Could not subscribe to seekers collection:', err);
    return () => {};
  }
}

/**
 * Fetch all real seekers once from Cloud Firestore
 */
export async function fetchRealSeekers(): Promise<SeekerTelemetry[]> {
  try {
    const snap = await getDocs(collection(db, 'seekers'));
    return snap.docs.map((docSnap) => {
      const d = docSnap.data();
      return {
        id: docSnap.id,
        playerId: d.playerId ?? `S-${docSnap.id.slice(0, 3).toUpperCase()}`,
        name: d.name ?? 'Seeker Node',
        zoneId: d.zoneId ?? 'new-west',
        zoneName: d.zoneName ?? 'New Building (West)',
        x: Number(d.x ?? 250),
        y: Number(d.y ?? 250),
        battery: Number(d.battery ?? 100),
        signal: d.signal ?? 'STRONG',
        status: d.status ?? 'ACTIVE',
        speedKmh: Number(d.speedKmh ?? 0),
        qrScannedCount: Number(d.qrScannedCount ?? 0),
        lastPing: d.lastPing ?? Date.now(),
      };
    });
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
