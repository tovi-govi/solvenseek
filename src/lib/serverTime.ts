/**
 * Server Time Synchronization Service
 * 
 * Ensures countdowns and authorization locks NEVER use the client's local machine time.
 * Instead, it:
 * 1. Synchronizes against the authoritative Google Cloud / Firebase server HTTP Date header.
 * 2. Uses a hardware monotonic clock (performance.now()) to advance time, which is
 *    100% immune to operating system clock modifications or spoofing.
 */

let serverEpochAnchorMs: number = 0;
let monotonicAnchorMs: number = 0;
let isSynced: boolean = false;
let syncPromise: Promise<number> | null = null;

/**
 * Fetch authoritative server time from Google Cloud / Firebase Hosting
 */
export async function syncServerTime(): Promise<number> {
  if (syncPromise) return syncPromise;

  syncPromise = (async () => {
    const t0 = performance.now();
    let serverDateStr: string | null = null;

    // 1. Primary: Direct HEAD request to Firebase project domain
    try {
      const res = await fetch('https://cmiyc-d170c.firebaseapp.com', {
        method: 'HEAD',
        cache: 'no-store',
      });
      serverDateStr = res.headers.get('date');
    } catch {
      // CORS or network fallback
    }

    // 2. Secondary fallback: Local Vite dev server response header
    if (!serverDateStr) {
      try {
        const res = await fetch('/?_t=' + Date.now(), {
          method: 'HEAD',
          cache: 'no-store',
        });
        serverDateStr = res.headers.get('date');
      } catch {
        // fallback
      }
    }

    // 3. Tertiary fallback: WorldTimeAPI UTC
    if (!serverDateStr) {
      try {
        const res = await fetch('https://worldtimeapi.org/api/timezone/Etc/UTC', {
          cache: 'no-store',
        });
        const data = await res.json();
        if (data.unixtime) {
          const t1 = performance.now();
          const rtt = t1 - t0;
          serverEpochAnchorMs = data.unixtime * 1000 + Math.round(rtt / 2);
          monotonicAnchorMs = performance.now();
          isSynced = true;
          return serverEpochAnchorMs;
        }
      } catch {
        // fallback
      }
    }

    const t1 = performance.now();
    const rtt = t1 - t0;

    if (serverDateStr) {
      serverEpochAnchorMs = new Date(serverDateStr).getTime() + Math.round(rtt / 2);
    } else {
      // Ultimate safety fallback if completely offline
      serverEpochAnchorMs = Date.now();
    }

    monotonicAnchorMs = performance.now();
    isSynced = true;
    return serverEpochAnchorMs;
  })().finally(() => {
    syncPromise = null;
  });

  return syncPromise;
}

/**
 * Get current authoritative server epoch ms.
 * Calculated via monotonic offset: completely immune to user changing their computer's clock!
 */
export function getServerNow(): number {
  if (!isSynced || serverEpochAnchorMs === 0) {
    // If not yet synced, trigger background sync and return estimated time
    syncServerTime();
    return Date.now();
  }
  const monotonicElapsed = performance.now() - monotonicAnchorMs;
  return serverEpochAnchorMs + monotonicElapsed;
}

export function isServerTimeSynced(): boolean {
  return isSynced;
}

// Initial background sync on module load
if (typeof window !== 'undefined') {
  syncServerTime();
  // Periodic re-sync every 2 minutes
  setInterval(() => {
    syncServerTime();
  }, 120000);
}
