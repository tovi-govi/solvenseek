import { useState, useRef, useEffect, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useSurveillanceStore } from '../../store/surveillanceStore';
import { useAuthStore } from '../../store/authStore';
import { saveRealSeeker } from '../../lib/firebase';
import type { SeekerTelemetry } from '../../types/game';
import {
  IIITK_FACILITIES,
  IIITK_CAMPUS_BOUNDS,
  gridToLatLng,
  latLngToGrid,
  type CampusFacility,
} from '../../lib/iiitkCampusData';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  MapPin,
  Radio,
  Square,
  Crosshair,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

interface SurveillanceMapProps {
  onSelectSeeker?: (seeker: SeekerTelemetry) => void;
}

const CARTO_API_KEY = import.meta.env.VITE_CARTO_API_KEY || 'cb1_2m04_1_3f470e2298f7bf1f28a78ef9';

// Tile layer configurations
const TILE_URLS = {
  tactical: {
    url: CARTO_API_KEY
      ? `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${CARTO_API_KEY}`
      : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 20,
    subdomains: 'abcd',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &copy; OpenStreetMap contributors',
    maxZoom: 19,
    subdomains: 'abc',
  },
};

/**
 * Strict validator for GPS coordinates to prevent Leaflet NaN/crash errors.
 * Ensures -90 <= lat <= 90 and -180 <= lon <= 180 and both are finite numbers.
 */
function isValidLatLng(lat: unknown, lon: unknown): lat is number {
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    !isNaN(lat) &&
    !isNaN(lon) &&
    isFinite(lat) &&
    isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

/**
 * Helper to determine nearest campus facility from real GPS coordinates.
 */
function getNearestZone(lat: number, lon: number): { key: string; name: string } {
  let closest = IIITK_FACILITIES[0];
  let minD = Infinity;
  for (const fac of IIITK_FACILITIES) {
    const d = Math.hypot(lat - fac.center[0], lon - fac.center[1]);
    if (d < minD) {
      minD = d;
      closest = fac;
    }
  }
  return { key: closest.key, name: closest.name };
}

type TrackingStatus =
  | 'idle'
  | 'requesting'
  | 'active'
  | 'denied'
  | 'unavailable'
  | 'timeout'
  | 'error';

interface UserLocation {
  lat: number;
  lon: number;
  accuracy: number;
  speed: number;
  heading: number | null;
  timestamp: number;
}

export function SurveillanceMap({ onSelectSeeker }: SurveillanceMapProps) {
  const { seekers, selectedSeekerId, setSelectedSeeker } = useSurveillanceStore();
  const { profile } = useAuthStore();

  const operativeName = profile?.username || 'FIELD OPERATIVE';
  const operativePlayerId = profile?.playerId || 'HQ-OPERATIVE';

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const polygonGroupRef = useRef<L.LayerGroup | null>(null);
  const markerGroupRef = useRef<L.LayerGroup | null>(null);
  const trackingLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const userMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const isTogglingRef = useRef<boolean>(false);
  const lastSyncRef = useRef<number>(0);
  const hasInitialCenteredRef = useRef<boolean>(false);

  const [mapMode, setMapMode] = useState<'tactical' | 'satellite'>('tactical');
  const [selectedFacility, setSelectedFacility] = useState<CampusFacility | null>(null);

  // Tracking state
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>('idle');
  const [trackingMessage, setTrackingMessage] = useState<string>('Tracking stopped');
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);

  // Initialize Leaflet Map safely
  useEffect(() => {
    isMountedRef.current = true;
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    try {
      const map = L.map(mapContainerRef.current, {
        center: IIITK_CAMPUS_BOUNDS.center,
        zoom: 17,
        minZoom: 15,
        maxZoom: 20,
        zoomControl: false,
        attributionControl: false,
      });

      const initialTile = L.tileLayer(TILE_URLS.tactical.url, {
        maxZoom: TILE_URLS.tactical.maxZoom,
        subdomains: TILE_URLS.tactical.subdomains,
      }).addTo(map);

      tileLayerRef.current = initialTile;
      polygonGroupRef.current = L.layerGroup().addTo(map);
      markerGroupRef.current = L.layerGroup().addTo(map);
      trackingLayerGroupRef.current = L.layerGroup().addTo(map);

      const bounds = L.latLngBounds(
        IIITK_CAMPUS_BOUNDS.southWest,
        IIITK_CAMPUS_BOUNDS.northEast
      );
      map.fitBounds(bounds, { padding: [30, 30] });

      mapInstanceRef.current = map;
    } catch (e) {
      console.error('[SurveillanceMap] Map initialization error:', e);
    }

    return () => {
      isMountedRef.current = false;
      if (watchIdRef.current !== null) {
        try {
          navigator.geolocation.clearWatch(watchIdRef.current);
        } catch (e) {
          console.warn('[SurveillanceMap] clearWatch cleanup warning:', e);
        }
        watchIdRef.current = null;
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      polygonGroupRef.current = null;
      markerGroupRef.current = null;
      trackingLayerGroupRef.current = null;
      userMarkerRef.current = null;
      accuracyCircleRef.current = null;
    };
  }, []);

  // Handle Basemap Toggle (Tactical Dark vs Satellite)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const cfg = TILE_URLS[mapMode];
    const newLayer = L.tileLayer(cfg.url, {
      maxZoom: cfg.maxZoom,
      subdomains: cfg.subdomains,
    }).addTo(map);

    newLayer.bringToBack();
    tileLayerRef.current = newLayer;
  }, [mapMode]);

  // Render Facility Polygons
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = polygonGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    IIITK_FACILITIES.forEach((fac) => {
      const polygon = L.polygon(fac.polygon, {
        color: fac.color,
        weight: 2,
        opacity: 0.9,
        fillColor: fac.color,
        fillOpacity: mapMode === 'satellite' ? 0.25 : 0.15,
        dashArray: fac.category === 'Central Academic & Administrative Zone' ? undefined : '4, 4',
      });

      polygon.on('mouseover', () => {
        polygon.setStyle({
          weight: 3.5,
          fillOpacity: 0.4,
        });
      });

      polygon.on('mouseout', () => {
        polygon.setStyle({
          weight: 2,
          fillOpacity: mapMode === 'satellite' ? 0.25 : 0.15,
        });
      });

      polygon.on('click', () => {
        setSelectedFacility(fac);
        map.fitBounds(polygon.getBounds(), { padding: [40, 40], maxZoom: 19 });
      });

      const seekersInZone = seekers.filter((s) => s.zoneId === fac.key).length;
      polygon.bindTooltip(
        `<div style="font-family: monospace; font-size: 11px; background: rgba(5,9,20,0.92); border: 1px solid ${fac.color}; padding: 4px 8px; border-radius: 2px; color: #fff; box-shadow: 0 0 10px ${fac.color}40;">
          <div style="font-weight: bold; color: ${fac.color};">${fac.name}</div>
          <div style="font-size: 9px; opacity: 0.7;">${fac.shortCategory}</div>
          ${seekersInZone > 0 ? `<div style="font-size: 9px; color: #ffd700; margin-top: 2px;">⚡ ${seekersInZone} ACTIVE SEEKERS</div>` : ''}
        </div>`,
        { sticky: true, opacity: 1, direction: 'top', className: 'tactical-tooltip' }
      );

      group.addLayer(polygon);
    });
  }, [mapMode, seekers]);

  // Render Live Seeker Pins safely (Defensive coordinate validation)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = markerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    seekers.forEach((seeker) => {
      // Determine position: validate real GPS or calibrated grid
      const hasRealGps = isValidLatLng(seeker.lat, seeker.lon);
      let pos: [number, number] | null = null;

      if (hasRealGps) {
        pos = [seeker.lat as number, seeker.lon as number];
      } else if (
        typeof seeker.x === 'number' &&
        typeof seeker.y === 'number' &&
        !isNaN(seeker.x) &&
        !isNaN(seeker.y) &&
        isFinite(seeker.x) &&
        isFinite(seeker.y)
      ) {
        const converted = gridToLatLng(seeker.x, seeker.y);
        if (isValidLatLng(converted[0], converted[1])) {
          pos = converted;
        }
      }

      // If coordinates are invalid, safely skip marker - NEVER pass NaN to L.marker
      if (!pos) {
        if (import.meta.env.DEV) {
          console.warn(`[SurveillanceMap] Seeker ${seeker.playerId || seeker.id} has invalid coordinates. Skipping.`);
        }
        return;
      }

      const isSelected = seeker.id === selectedSeekerId;

      const customIcon = L.divIcon({
        className: 'custom-seeker-pin',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        html: `
          <div style="position: relative; width: 40px; height: 40px; display: flex; items-center; justify-content: center; cursor: pointer;">
            <!-- Outer Pulsing Halo -->
            <div style="position: absolute; inset: 6px; border-radius: 9999px; background: rgba(255, 215, 0, 0.25); border: 1.5px solid #ffd700; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite; ${isSelected ? 'opacity: 1;' : 'opacity: 0.6;'}"></div>
            
            <!-- Selection Ring -->
            ${isSelected ? `<div style="position: absolute; inset: 2px; border-radius: 9999px; border: 2px dashed #00f0ff; animation: spin 8s linear infinite;"></div>` : ''}

            <!-- Center Core Dot -->
            <div style="position: absolute; top: 12px; left: 12px; width: 16px; height: 16px; border-radius: 9999px; background: #ffd700; border: 2px solid #ffffff; box-shadow: 0 0 12px #ffd700; display: flex; align-items: center; justify-content: center;">
              <div style="width: 4px; height: 4px; border-radius: 9999px; background: #000;"></div>
            </div>

            <!-- Player ID Tag -->
            <div style="position: absolute; top: 30px; left: 50%; transform: translateX(-50%); background: rgba(5, 5, 8, 0.95); border: 1px solid ${isSelected ? '#00f0ff' : '#ffd700'}; color: ${isSelected ? '#00f0ff' : '#ffd700'}; font-family: monospace; font-size: 9px; font-weight: bold; padding: 1px 4px; border-radius: 2px; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.8);">
              ${seeker.playerId}
            </div>
          </div>
        `,
      });

      const marker = L.marker(pos, { icon: customIcon });

      marker.on('click', () => {
        setSelectedSeeker(seeker.id);
        onSelectSeeker?.(seeker);
        map.setView(pos, Math.max(map.getZoom(), 18), { animate: true });
      });

      marker.bindPopup(
        `<div style="font-family: monospace; font-size: 11px; background: rgba(3,7,18,0.95); border: 1px solid #ffd700; padding: 6px 10px; border-radius: 3px; color: #fff;">
          <p style="font-weight: bold; margin: 0 0 4px 0; color: #ffd700;">${seeker.name} (${seeker.playerId})</p>
          <p style="margin: 2px 0;">Zone: ${seeker.zoneName}</p>
          <p style="margin: 2px 0;">Artifacts: ${seeker.qrScannedCount ?? 0}</p>
        </div>`
      );

      marker.bindTooltip(
        `<div style="font-family: monospace; font-size: 11px; background: rgba(3,7,18,0.95); border: 1px solid #ffd700; padding: 6px 10px; border-radius: 3px; color: #fff; min-width: 160px; box-shadow: 0 0 15px rgba(255,215,0,0.25);">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px; margin-bottom: 4px;">
            <span style="font-weight: bold; color: #ffd700;">${seeker.playerId} // ${seeker.name}</span>
            <span style="font-size: 9px; color: #00f0ff;">${seeker.signal}</span>
          </div>
          <div style="font-size: 10px; color: rgba(255,255,255,0.7); display: flex; justify-content: space-between;">
            <span>ZONE:</span>
            <span style="color: #fff; font-weight: 500;">${seeker.zoneName}</span>
          </div>
          <div style="font-size: 10px; color: rgba(255,255,255,0.7); display: flex; justify-content: space-between; margin-top: 2px;">
            <span>ARTIFACTS:</span>
            <span style="color: #ffd700; font-weight: bold;">${seeker.qrScannedCount ?? 0}</span>
          </div>
        </div>`,
        { direction: 'top', offset: [0, -20], opacity: 1 }
      );

      group.addLayer(marker);
    });
  }, [seekers, selectedSeekerId, setSelectedSeeker, onSelectSeeker]);

  // Update local operative marker and accuracy halo on the map
  const updateUserMarkerOnMap = useCallback(
    (loc: { lat: number; lon: number; accuracy: number; speed: number }) => {
      const map = mapInstanceRef.current;
      const group = trackingLayerGroupRef.current;
      if (!map || !group) return;

      if (!isValidLatLng(loc.lat, loc.lon)) return;
      const pos: [number, number] = [loc.lat, loc.lon];

      const operativeIcon = L.divIcon({
        className: 'custom-operative-pin',
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        html: `
          <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <!-- Outer Pulsing Cyan Halo -->
            <div style="position: absolute; inset: 4px; border-radius: 9999px; background: rgba(0, 240, 255, 0.25); border: 2px solid #00f0ff; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            
            <!-- Rotating Reticle -->
            <div style="position: absolute; inset: 1px; border-radius: 9999px; border: 1.5px dashed #00f0ff; animation: spin 7s linear infinite; opacity: 0.85;"></div>

            <!-- Center Core -->
            <div style="position: absolute; top: 14px; left: 14px; width: 16px; height: 16px; border-radius: 9999px; background: #00f0ff; border: 2px solid #ffffff; box-shadow: 0 0 16px #00f0ff; display: flex; align-items: center; justify-content: center;">
              <div style="width: 4px; height: 4px; border-radius: 9999px; background: #000;"></div>
            </div>

            <!-- Operative Callsign Label -->
            <div style="position: absolute; top: 34px; left: 50%; transform: translateX(-50%); background: rgba(2, 6, 18, 0.95); border: 1px solid #00f0ff; color: #00f0ff; font-family: monospace; font-size: 9px; font-weight: bold; padding: 1px 5px; border-radius: 2px; white-space: nowrap; box-shadow: 0 0 10px rgba(0,240,255,0.4);">
              YOU (${operativePlayerId})
            </div>
          </div>
        `,
      });

      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng(pos);
        userMarkerRef.current.setIcon(operativeIcon);
      } else {
        const marker = L.marker(pos, { icon: operativeIcon, zIndexOffset: 1000 });
        marker.bindPopup(
          `<div style="font-family: monospace; font-size: 11px; background: rgba(2,6,18,0.95); border: 1px solid #00f0ff; padding: 6px 10px; border-radius: 3px; color: #fff;">
            <p style="font-weight: bold; margin: 0 0 4px 0; color: #00f0ff;">${operativeName} (${operativePlayerId})</p>
            <p style="margin: 2px 0;">Status: LIVE TRACKING</p>
            <p style="margin: 2px 0;">Accuracy: ±${Math.round(loc.accuracy)}m</p>
          </div>`
        );
        group.addLayer(marker);
        userMarkerRef.current = marker;
      }

      // Update or create accuracy circle
      if (loc.accuracy > 0 && loc.accuracy < 200) {
        if (accuracyCircleRef.current) {
          accuracyCircleRef.current.setLatLng(pos);
          accuracyCircleRef.current.setRadius(loc.accuracy);
        } else {
          const circle = L.circle(pos, {
            radius: loc.accuracy,
            color: '#00f0ff',
            weight: 1,
            opacity: 0.6,
            fillColor: '#00f0ff',
            fillOpacity: 0.08,
          });
          group.addLayer(circle);
          accuracyCircleRef.current = circle;
        }
      }

      // On initial GPS fix, smoothly focus to operative location
      if (!hasInitialCenteredRef.current) {
        hasInitialCenteredRef.current = true;
        map.setView(pos, Math.max(map.getZoom(), 17), { animate: true });
      }
    },
    [operativeName, operativePlayerId]
  );

  // Stop tracking lifecycle cleanup
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      try {
        navigator.geolocation.clearWatch(watchIdRef.current);
      } catch (e) {
        console.warn('[SurveillanceMap] clearWatch error:', e);
      }
      watchIdRef.current = null;
    }

    if (trackingLayerGroupRef.current) {
      trackingLayerGroupRef.current.clearLayers();
    }
    userMarkerRef.current = null;
    accuracyCircleRef.current = null;
    hasInitialCenteredRef.current = false;

    if (isMountedRef.current) {
      setTrackingStatus('idle');
      setTrackingMessage('Tracking stopped');
      setUserLocation(null);
    }
  }, []);

  // Start tracking engine with complete permission, race-condition, and lifecycle safety
  const startTracking = useCallback(async () => {
    if (isTogglingRef.current) return;
    isTogglingRef.current = true;

    try {
      // 1. Ensure only one watcher exists at any time
      if (watchIdRef.current !== null) {
        stopTracking();
      }

      // 2. Validate browser Geolocation API support
      if (typeof window === 'undefined' || !navigator || !('geolocation' in navigator) || !navigator.geolocation) {
        if (isMountedRef.current) {
          setTrackingStatus('unavailable');
          setTrackingMessage('Location unavailable: Geolocation API not supported');
        }
        return;
      }

      // 3. Set requesting state
      if (isMountedRef.current) {
        setTrackingStatus('requesting');
        setTrackingMessage('Requesting location…');
      }

      // 4. Safe Permission check
      if (navigator.permissions && typeof navigator.permissions.query === 'function') {
        try {
          const permissionStatus = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
          if (!isMountedRef.current) return;

          if (permissionStatus.state === 'denied') {
            setTrackingStatus('denied');
            setTrackingMessage('Permission denied: Enable location in browser');
            return;
          }

          // React to live permission revocation
          permissionStatus.onchange = () => {
            if (!isMountedRef.current) return;
            if (permissionStatus.state === 'denied') {
              console.warn('[SurveillanceMap] Location permission was revoked');
              stopTracking();
              setTrackingStatus('denied');
              setTrackingMessage('Permission denied');
            }
          };
        } catch {
          // Ignore permission query rejection on unsupported platforms (e.g. Safari)
        }
      }

      // 5. Geolocation Options
      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      };

      // 6. Handle GPS update
      const handleSuccess = (position: GeolocationPosition) => {
        if (!isMountedRef.current) return;

        if (!position || !position.coords) {
          console.warn('[SurveillanceMap] Malformed geolocation position received:', position);
          return;
        }

        const { latitude, longitude, accuracy, speed, heading } = position.coords;

        // Validate coordinate bounds strictly
        if (!isValidLatLng(latitude, longitude)) {
          console.warn('[SurveillanceMap] Out-of-bounds GPS coordinates received:', latitude, longitude);
          return;
        }

        const validAccuracy = typeof accuracy === 'number' && !isNaN(accuracy) && isFinite(accuracy) ? Math.max(1, accuracy) : 15;
        const validSpeed = typeof speed === 'number' && !isNaN(speed) && isFinite(speed) ? Math.max(0, Math.round(speed * 3.6)) : 0;
        const validHeading = typeof heading === 'number' && !isNaN(heading) && isFinite(heading) ? heading : null;

        const loc: UserLocation = {
          lat: latitude,
          lon: longitude,
          accuracy: validAccuracy,
          speed: validSpeed,
          heading: validHeading,
          timestamp: position.timestamp || Date.now(),
        };

        setUserLocation(loc);
        setTrackingStatus('active');
        setTrackingMessage(`Tracking active (±${Math.round(validAccuracy)}m)`);

        // Update map marker safely
        updateUserMarkerOnMap(loc);

        // Throttled Firestore update (at most once every 3.5 seconds)
        const now = Date.now();
        if (now - lastSyncRef.current > 3500) {
          lastSyncRef.current = now;
          const grid = latLngToGrid(latitude, longitude);
          const zone = getNearestZone(latitude, longitude);

          const seekerPayload: SeekerTelemetry = {
            id: profile?.id || `operative-${profile?.playerId || 'local'}`,
            uid: profile?.id || 'local-op',
            playerId: operativePlayerId,
            name: operativeName,
            teamId: 'alpha',
            active: true,
            status: validSpeed > 3 ? 'IN_TRANSIT' : 'ACTIVE',
            lat: latitude,
            lon: longitude,
            x: grid.x,
            y: grid.y,
            zoneId: zone.key,
            zoneName: zone.name,
            battery: 100,
            signal: validAccuracy < 20 ? 'STRONG' : validAccuracy < 60 ? 'GOOD' : 'WEAK',
            speedKmh: validSpeed,
            accuracyM: validAccuracy,
            headingDeg: validHeading,
            qrScannedCount: 0,
            lastPing: now,
          };

          // Safe Firestore sync: network or permission failure will never crash the UI
          saveRealSeeker(seekerPayload).catch((err) => {
            if (import.meta.env.DEV) {
              console.warn('[SurveillanceMap] Seeker sync notice (offline or permission):', err);
            }
          });
        }
      };

      // 7. Handle Geolocation errors gracefully
      const handleError = (error: GeolocationPositionError) => {
        if (!isMountedRef.current) return;

        console.warn('[SurveillanceMap] Geolocation error:', error.code, error.message);

        switch (error.code) {
          case 1: // PERMISSION_DENIED
            stopTracking();
            setTrackingStatus('denied');
            setTrackingMessage('Permission denied');
            break;
          case 2: // POSITION_UNAVAILABLE
            setTrackingStatus('unavailable');
            setTrackingMessage('Location unavailable');
            break;
          case 3: // TIMEOUT
            setTrackingStatus('timeout');
            setTrackingMessage('Location request timed out');
            break;
          default:
            setTrackingStatus('error');
            setTrackingMessage(`Location error: ${error.message || 'Unknown'}`);
            break;
        }
      };

      // 8. Register position watcher and record ID
      const wid = navigator.geolocation.watchPosition(handleSuccess, handleError, options);
      watchIdRef.current = wid;
    } catch (err) {
      if (isMountedRef.current) {
        console.error('[SurveillanceMap] Unexpected error starting tracking:', err);
        setTrackingStatus('error');
        setTrackingMessage('Tracking failed to start');
      }
    } finally {
      setTimeout(() => {
        isTogglingRef.current = false;
      }, 200);
    }
  }, [stopTracking, updateUserMarkerOnMap, profile, operativePlayerId, operativeName]);

  // Recenter / Reset Bounds
  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    setSelectedFacility(null);
    const bounds = L.latLngBounds(
      IIITK_CAMPUS_BOUNDS.southWest,
      IIITK_CAMPUS_BOUNDS.northEast
    );
    map.fitBounds(bounds, { padding: [30, 30] });
  };

  // Center on user position if tracking is active
  const handleCenterOnUser = () => {
    const map = mapInstanceRef.current;
    if (!map || !userLocation) return;
    if (isValidLatLng(userLocation.lat, userLocation.lon)) {
      map.setView([userLocation.lat, userLocation.lon], Math.max(map.getZoom(), 18), { animate: true });
    }
  };

  // Zone statistics breakdown
  const academicCount = seekers.filter(
    (s) => ['academic_1', 'academic_2', 'admin', 'oat'].includes(s.zoneId)
  ).length;

  const diningCount = seekers.filter(
    (s) => ['dining', 'fitness'].includes(s.zoneId)
  ).length;

  const sportsCount = seekers.filter(
    (s) => ['sports_ground', 'volleyball'].includes(s.zoneId)
  ).length;

  const totalArtifactsClaimed = Math.min(
    15,
    seekers.reduce((sum, s) => sum + (s.qrScannedCount ?? 0), 0)
  );

  return (
    <div className="relative w-full h-full bg-[#030712] overflow-hidden flex flex-col select-none border border-cyber-accent/20">
      {/* Top Map Action Bar HUD */}
      <div className="absolute top-3 left-4 right-4 z-[500] flex items-center justify-between pointer-events-none gap-2">
        {/* Left Status & Zone Statistics */}
        <div className="flex items-center gap-2 pointer-events-auto flex-wrap">
          <div className="bg-black/90 backdrop-blur-md border border-cyber-accent/40 px-3 py-1.5 rounded-sm flex items-center gap-2 shadow-[0_0_15px_rgba(0,255,204,0.15)]">
            <span className="w-2 h-2 rounded-full bg-[#ffea00] animate-pulse" />
            <span className="text-[11px] font-mono tracking-widest text-[#ffea00] font-bold">
              IIIT KOTTAYAM GRID
            </span>
            <span className="text-[10px] font-mono text-cyber-muted pl-2 border-l border-white/10">
              {seekers.length} ACTIVE SEEKERS
            </span>
          </div>

          {/* Tracking Status Indicator Badge */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border text-[10px] font-mono backdrop-blur-md transition-all ${
              trackingStatus === 'active'
                ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : trackingStatus === 'requesting'
                ? 'bg-amber-950/80 border-amber-500/60 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                : trackingStatus === 'denied'
                ? 'bg-rose-950/80 border-rose-500/60 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                : trackingStatus === 'unavailable' || trackingStatus === 'timeout'
                ? 'bg-orange-950/80 border-orange-500/60 text-orange-300'
                : 'bg-black/80 border-white/10 text-cyber-muted'
            }`}
          >
            {trackingStatus === 'active' ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            ) : trackingStatus === 'requesting' ? (
              <Loader2 className="w-3 h-3 text-amber-300 animate-spin" />
            ) : trackingStatus === 'denied' || trackingStatus === 'error' ? (
              <AlertTriangle className="w-3 h-3 text-rose-400" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
            )}
            <span className="font-bold uppercase tracking-wider">{trackingMessage}</span>
          </div>

          <div className="hidden xl:flex items-center gap-2 bg-black/80 backdrop-blur-sm border border-white/10 px-3 py-1.5 text-[10px] font-mono text-cyber-muted rounded-sm">
            <span>
              ACADEMIC & ADMIN: <b className="text-[#00f0ff]">{academicCount}</b>
            </span>
            <span className="text-white/30">|</span>
            <span>
              DINING & AMENITIES: <b className="text-[#fbbf24]">{diningCount}</b>
            </span>
            <span className="text-white/30">|</span>
            <span>
              SPORTS GROUND: <b className="text-[#4ade80]">{sportsCount}</b>
            </span>
            <span className="text-white/30">|</span>
            <span>
              CAMPUS ARTIFACTS: <b className="text-[#ffd700] font-bold">{totalArtifactsClaimed} / 15</b>
            </span>
          </div>
        </div>

        {/* Right Map View & Basemap & Tracking Controls */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-black/85 backdrop-blur-md border border-white/10 p-1 rounded-sm shadow-lg flex-wrap justify-end">
          {/* Main Tracking Start / Stop Button */}
          {trackingStatus === 'active' ? (
            <button
              onClick={stopTracking}
              className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-mono font-bold uppercase rounded bg-rose-600/25 hover:bg-rose-600/40 text-rose-300 border border-rose-500/60 shadow-[0_0_12px_rgba(244,63,94,0.35)] transition-all"
              title="Stop Location Tracking"
            >
              <Square className="w-3 h-3 text-rose-400 fill-rose-400" />
              <span>STOP TRACKING</span>
            </button>
          ) : trackingStatus === 'requesting' ? (
            <button
              onClick={stopTracking}
              className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-mono font-bold uppercase rounded bg-amber-600/25 hover:bg-amber-600/40 text-amber-300 border border-amber-500/60 transition-all"
              title="Cancel Location Request"
            >
              <Loader2 className="w-3 h-3 text-amber-300 animate-spin" />
              <span>CANCEL</span>
            </button>
          ) : (
            <button
              onClick={startTracking}
              className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-mono font-bold uppercase rounded bg-cyber-accent/20 hover:bg-cyber-accent/35 text-cyber-accent border border-cyber-accent/60 shadow-[0_0_15px_rgba(0,255,204,0.3)] transition-all"
              title="Start Live GPS Tracking"
            >
              <Radio className="w-3.5 h-3.5 text-cyber-accent animate-pulse" />
              <span>START TRACKING</span>
            </button>
          )}

          {/* Center on User (Only active when tracking) */}
          {trackingStatus === 'active' && userLocation && (
            <button
              onClick={handleCenterOnUser}
              className="p-1.5 text-cyber-accent hover:bg-cyber-accent/15 border border-cyber-accent/40 rounded transition-colors"
              title="Center Map on Your Location"
            >
              <Crosshair className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="w-[1px] h-4 bg-white/15 mx-0.5" />

          {/* Basemap Switcher Toggle */}
          <button
            onClick={() => setMapMode((m) => (m === 'tactical' ? 'satellite' : 'tactical'))}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono rounded transition-all ${
              mapMode === 'satellite'
                ? 'bg-blue-600/30 text-blue-400 border border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                : 'bg-cyber-accent/15 text-cyber-accent border border-cyber-accent/40 shadow-[0_0_10px_rgba(0,255,204,0.2)]'
            }`}
            title="Toggle between Tactical Dark and Satellite Imagery"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="font-bold uppercase">
              {mapMode === 'tactical' ? 'TACTICAL DARK' : 'ORBITAL SATELLITE'}
            </span>
          </button>

          <div className="w-[1px] h-4 bg-white/15 mx-0.5" />

          {/* Recenter Campus */}
          <button
            onClick={handleRecenter}
            className="p-1.5 text-cyber-muted hover:text-cyber-accent hover:bg-white/5 rounded transition-colors"
            title="Recenter Campus (IIIT Kottayam)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Zoom In */}
          <button
            onClick={() => mapInstanceRef.current?.zoomIn()}
            className="p-1.5 text-cyber-muted hover:text-cyber-accent hover:bg-white/5 rounded transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          {/* Zoom Out */}
          <button
            onClick={() => mapInstanceRef.current?.zoomOut()}
            className="p-1.5 text-cyber-muted hover:text-cyber-accent hover:bg-white/5 rounded transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Selected Facility Banner */}
      {selectedFacility && (
        <div className="absolute top-14 left-4 z-[500] pointer-events-auto bg-black/90 backdrop-blur-md border border-cyber-accent/50 px-3 py-2 rounded-sm font-mono text-xs flex items-center gap-3 shadow-[0_0_20px_rgba(0,255,204,0.2)]">
          <MapPin className="w-4 h-4 text-cyber-accent" />
          <div>
            <div className="font-bold text-white uppercase">{selectedFacility.name}</div>
            <div className="text-[10px] text-cyber-muted">{selectedFacility.category}</div>
          </div>
          <button
            onClick={() => setSelectedFacility(null)}
            className="text-cyber-muted hover:text-white text-xs pl-2 border-l border-white/20"
          >
            ✕
          </button>
        </div>
      )}

      {/* Leaflet Map DOM Node */}
      <div
        ref={mapContainerRef}
        className="w-full h-full relative z-0"
        style={{ background: '#030712' }}
      />

      {/* Bottom Campus Legend HUD */}
      <div className="absolute bottom-3 left-4 z-[500] pointer-events-auto bg-black/80 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-sm font-mono text-[10px] flex items-center gap-3 text-white/80">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#00f0ff]/50 border border-[#00f0ff]" />
          <span>Central Academic & Admin</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#fbbf24]/50 border border-[#fbbf24]" />
          <span>Dining & Amenities</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#4ade80]/50 border border-[#4ade80]" />
          <span>Main Sports Ground</span>
        </div>
        <span className="text-white/30">|</span>
        <span className="text-cyber-muted">LAT 9.7551° N // LON 76.6495° E</span>
      </div>

      {/* Empty State Banner (If 0 Seekers connected) */}
      {seekers.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[450]">
          <div className="bg-[#030816]/90 border border-cyber-accent/40 p-4 rounded-sm max-w-sm text-center font-mono shadow-[0_0_30px_rgba(0,255,204,0.15)] backdrop-blur-sm pointer-events-auto">
            <div className="flex items-center justify-center gap-2 text-cyber-accent text-xs font-bold mb-1 tracking-wider uppercase">
              <span className="w-2 h-2 rounded-full bg-cyber-accent animate-ping" />
              <span>SEEKER STREAM LISTENER ACTIVE</span>
            </div>
            <p className="text-[11px] text-cyber-muted mt-1">
              Zero active seekers detected on IIIT Kottayam grid.
            </p>
            <p className="text-[10px] text-white/60 mt-1">
              Awaiting React Native mobile app ingest on Cloud Firestore.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
