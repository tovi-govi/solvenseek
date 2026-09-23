// ---------------------------------------------------------------------------
// Core enums / unions
// ---------------------------------------------------------------------------

export type UserRole = 'HIDER' | 'SEEKER' | 'SURVEILLANCE';
export type UserStatus = 'ACTIVE' | 'ELIMINATED';

// ---------------------------------------------------------------------------
// Profile — Authoritative operator user record from Firebase
// ---------------------------------------------------------------------------

export interface Profile {
  id: string;
  username: string;
  playerId: string; // display code e.g. SURV-E12F
  role: UserRole;
  status: UserStatus;
  eliminationTokens: number;
  createdAt?: string;
}

// ---------------------------------------------------------------------------
// Surveillance & Real-Time Seeker Tracking
// ---------------------------------------------------------------------------

export interface SeekerTelemetry {
  id: string;
  playerId: string; // e.g. S-001
  name: string; // e.g. "Echo Agent"
  zoneId: string; // e.g. 'academic_1' | 'admin' | 'sports_ground'
  zoneName: string; // e.g. "Academic Block 1", "Main Sports Ground"
  x: number; // Normalized map coordinate (0-1000)
  y: number; // Normalized map coordinate (0-800)
  lat?: number; // Real-world GPS Latitude (e.g. 9.754904)
  lon?: number; // Real-world GPS Longitude (e.g. 76.649988)
  battery: number; // Battery % (e.g. 84)
  signal: 'STRONG' | 'GOOD' | 'WEAK';
  status: 'ACTIVE' | 'CLAIMING_ARTIFACT' | 'IN_TRANSIT';
  speedKmh?: number;
  qrScannedCount?: number; // Valid artifacts scanned
  lastPing: number; // timestamp ms
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
