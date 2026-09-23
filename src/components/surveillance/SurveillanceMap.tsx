import { useState, useRef, useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useSurveillanceStore } from '../../store/surveillanceStore';
import type { SeekerTelemetry } from '../../types/game';
import {
  IIITK_FACILITIES,
  IIITK_CAMPUS_BOUNDS,
  gridToLatLng,
  type CampusFacility
} from '../../lib/iiitkCampusData';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  MapPin,
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

export function SurveillanceMap({ onSelectSeeker }: SurveillanceMapProps) {
  const { seekers, selectedSeekerId, setSelectedSeeker } = useSurveillanceStore();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const polygonGroupRef = useRef<L.LayerGroup | null>(null);
  const markerGroupRef = useRef<L.LayerGroup | null>(null);

  const [mapMode, setMapMode] = useState<'tactical' | 'satellite'>('tactical');
  const [selectedFacility, setSelectedFacility] = useState<CampusFacility | null>(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Create Leaflet map centered at IIIT Kottayam
    const map = L.map(mapContainerRef.current, {
      center: IIITK_CAMPUS_BOUNDS.center,
      zoom: 17,
      minZoom: 15,
      maxZoom: 20,
      zoomControl: false, // We render custom HUD controls
      attributionControl: false,
    });

    // Add initial dark tactical basemap
    const initialTile = L.tileLayer(TILE_URLS.tactical.url, {
      maxZoom: TILE_URLS.tactical.maxZoom,
      subdomains: TILE_URLS.tactical.subdomains,
    }).addTo(map);

    tileLayerRef.current = initialTile;

    // Layer groups for polygons and seeker markers
    polygonGroupRef.current = L.layerGroup().addTo(map);
    markerGroupRef.current = L.layerGroup().addTo(map);

    // Set initial bounds to campus
    const bounds = L.latLngBounds(
      IIITK_CAMPUS_BOUNDS.southWest,
      IIITK_CAMPUS_BOUNDS.northEast
    );
    map.fitBounds(bounds, { padding: [30, 30] });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
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

    // Keep tiles at the bottom
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

      // Hover interactions
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

      // Click facility to focus
      polygon.on('click', () => {
        setSelectedFacility(fac);
        map.fitBounds(polygon.getBounds(), { padding: [40, 40], maxZoom: 19 });
      });

      // Facility Tactical Tooltip
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

  // Render Live Seeker Pins
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = markerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    seekers.forEach((seeker) => {
      // Determine position: real GPS or calibrated grid
      const pos: [number, number] =
        seeker.lat && seeker.lon
          ? [seeker.lat, seeker.lon]
          : gridToLatLng(seeker.x, seeker.y);

      const isSelected = seeker.id === selectedSeekerId;

      // Custom pulsing HTML marker
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

      // Tooltip on Hover
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
            <span>BATTERY:</span>
            <span style="color: #4ade80;">${seeker.battery}%</span>
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
      <div className="absolute top-3 left-4 right-4 z-[500] flex items-center justify-between pointer-events-none">
        {/* Left Status & Zone Statistics */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="bg-black/90 backdrop-blur-md border border-cyber-accent/40 px-3 py-1.5 rounded-sm flex items-center gap-2 shadow-[0_0_15px_rgba(0,255,204,0.15)]">
            <span className="w-2 h-2 rounded-full bg-[#ffea00] animate-pulse" />
            <span className="text-[11px] font-mono tracking-widest text-[#ffea00] font-bold">
              IIIT KOTTAYAM GRID
            </span>
            <span className="text-[10px] font-mono text-cyber-muted pl-2 border-l border-white/10">
              {seekers.length} ACTIVE SEEKERS
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-2 bg-black/80 backdrop-blur-sm border border-white/10 px-3 py-1.5 text-[10px] font-mono text-cyber-muted rounded-sm">
            <span>ACADEMIC & ADMIN: <b className="text-[#00f0ff]">{academicCount}</b></span>
            <span className="text-white/30">|</span>
            <span>DINING & AMENITIES: <b className="text-[#fbbf24]">{diningCount}</b></span>
            <span className="text-white/30">|</span>
            <span>SPORTS GROUND: <b className="text-[#4ade80]">{sportsCount}</b></span>
            <span className="text-white/30">|</span>
            <span>CAMPUS ARTIFACTS: <b className="text-[#ffd700] font-bold">{totalArtifactsClaimed} / 15</b></span>
          </div>
        </div>

        {/* Right Map View & Basemap Controls */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-black/85 backdrop-blur-md border border-white/10 p-1 rounded-sm shadow-lg">
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
