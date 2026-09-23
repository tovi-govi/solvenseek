import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSurveillanceStore } from '../../store/surveillanceStore';
import type { SeekerTelemetry } from '../../types/game';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface SurveillanceMapProps {
  onSelectSeeker?: (seeker: SeekerTelemetry) => void;
}

export function SurveillanceMap({ onSelectSeeker }: SurveillanceMapProps) {
  const { seekers, selectedSeekerId, setSelectedSeeker } = useSurveillanceStore();
  const [zoomLevel, setZoomLevel] = useState(1);
  const [hoveredSeeker, setHoveredSeeker] = useState<SeekerTelemetry | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Track mouse coordinates for tooltips
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleSeekerClick = (seeker: SeekerTelemetry) => {
    setSelectedSeeker(seeker.id);
    onSelectSeeker?.(seeker);
  };

  // Group seekers count by zone matching the diagram
  const westCount = seekers.filter((s) => s.zoneId === 'new-west').length;
  const adminCount = seekers.filter((s) => s.zoneId === 'admin').length;
  const eastCount = seekers.filter((s) => s.zoneId === 'new-east').length;
  const totalArtifactsClaimed = seekers.reduce((sum, s) => sum + (s.qrScannedCount ?? 0), 0);

  return (
    <div
      ref={mapContainerRef}
      className="relative w-full h-full bg-[#030712] overflow-hidden flex flex-col select-none border border-cyber-accent/20"
    >
      {/* Top Map Action Bar */}
      <div className="absolute top-3 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        {/* Left Status Badges */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="bg-black/85 backdrop-blur-md border border-cyber-accent/40 px-3 py-1.5 rounded-sm flex items-center gap-2 shadow-[0_0_15px_rgba(0,255,204,0.15)]">
            <span className="w-2 h-2 rounded-full bg-[#ffea00]" />
            <span className="text-[11px] font-mono tracking-widest text-[#ffea00] font-bold">
              LIVE MAP
            </span>
            <span className="text-[10px] font-mono text-cyber-muted pl-2 border-l border-white/10">
              {seekers.length} ACTIVE SEEKERS
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 bg-black/70 backdrop-blur-sm border border-white/10 px-2.5 py-1 text-[10px] font-mono text-cyber-muted">
            <span>SECTORS:</span>
            <span className="text-white">NEW (W): <b className="text-[#ffea00]">{westCount}</b></span>
            <span className="text-white/40">|</span>
            <span className="text-white">ADMIN: <b className="text-[#ffea00]">{adminCount}</b></span>
            <span className="text-white/40">|</span>
            <span className="text-white">NEW (E): <b className="text-[#ffea00]">{eastCount}</b></span>
            <span className="text-white/40">|</span>
            <span>CAMPUS ARTIFACTS:</span>
            <span className="text-[#ffd700] font-bold">{totalArtifactsClaimed} / 15</span>
          </div>
        </div>

        {/* Right Map View Controls */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-black/80 backdrop-blur-md border border-white/10 p-1 rounded-sm">

          <button
            onClick={() => setZoomLevel((z) => Math.min(z + 0.15, 1.6))}
            className="p-1.5 text-cyber-muted hover:text-cyber-accent hover:bg-white/5 rounded transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoomLevel((z) => Math.max(z - 0.15, 0.7))}
            className="p-1.5 text-cyber-muted hover:text-cyber-accent hover:bg-white/5 rounded transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            className="p-1.5 text-cyber-muted hover:text-cyber-accent hover:bg-white/5 rounded transition-colors"
            title="Reset Zoom"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* SVG Canvas Map Area */}
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        <div
          className="relative w-full h-full max-w-[1280px] max-h-[850px] aspect-[10/7] transition-transform duration-300 ease-out"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          <svg
            viewBox="0 0 1000 750"
            className="w-full h-full"
            style={{ filter: 'drop-shadow(0 0 20px rgba(0, 150, 255, 0.05))' }}
          >
            <defs>
              {/* Grid patterns */}
              <pattern id="survGrid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(0, 240, 255, 0.04)" strokeWidth="1" />
              </pattern>
              <pattern id="dotGrid" width="60" height="60" patternUnits="userSpaceOnUse">
                <circle cx="30" cy="30" r="1" fill="rgba(0, 240, 255, 0.15)" />
              </pattern>

              {/* Glow filters */}
              <filter id="yellowRadarGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="cyanZoneGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Base Background grids */}
            <rect width="100%" height="100%" fill="#040914" />
            <rect width="100%" height="100%" fill="url(#survGrid)" />
            <rect width="100%" height="100%" fill="url(#dotGrid)" />

            {/* Tactical Grid coordinate axes markings */}
            <g opacity="0.3" stroke="#00f0ff" strokeWidth="0.5">
              <line x1="50" y1="50" x2="950" y2="50" strokeDasharray="3 6" />
              <line x1="50" y1="700" x2="950" y2="700" strokeDasharray="3 6" />
              <line x1="50" y1="50" x2="50" y2="700" strokeDasharray="3 6" />
              <line x1="950" y1="50" x2="950" y2="700" strokeDasharray="3 6" />
            </g>

            {/* ------------------------------------------------------------- */}
            {/* CAMPUS LAYOUT ARCHITECTURE (Matching user whiteboard diagram) */}
            {/* ------------------------------------------------------------- */}

            {/* 1. CENTRAL CONNECTOR / WALKWAY CORRIDOR */}
            <g className="cursor-pointer group">
              {/* Connector Hallway Background */}
              <path
                d="M 340 240 L 680 240 L 680 340 L 590 340 L 590 400 L 430 400 L 430 340 L 340 340 Z"
                fill="rgba(15, 35, 60, 0.75)"
                stroke="#00b4d8"
                strokeWidth="2"
                strokeDasharray="4 2"
                className="transition-colors group-hover:fill-[rgba(20,50,90,0.85)]"
              />
              {/* Connector corridor floor markings */}
              <line x1="360" y1="290" x2="660" y2="290" stroke="rgba(0,240,255,0.2)" strokeWidth="1" strokeDasharray="6 8" />
              <text
                x="510"
                y="275"
                textAnchor="middle"
                fill="rgba(0, 240, 255, 0.6)"
                fontSize="11"
                fontFamily="monospace"
                letterSpacing="3"
                className="font-bold pointer-events-none"
              >
                CONNECTING CORRIDOR / SKYWAY
              </text>
            </g>

            {/* 2. TOP-LEFT: "NEW" BUILDING (West Block) */}
            <g className="cursor-pointer group">
              {/* Outer boundary glow */}
              <rect
                x="110"
                y="130"
                width="240"
                height="230"
                rx="18"
                fill="rgba(10, 25, 48, 0.85)"
                stroke="#00f0ff"
                strokeWidth="2.5"
                className="transition-all duration-300 group-hover:stroke-cyber-accent group-hover:shadow-lg"
                filter="url(#cyanZoneGlow)"
              />
              {/* Inner rooms / compartments */}
              <rect x="125" y="145" width="100" height="90" fill="rgba(0, 200, 255, 0.05)" stroke="rgba(0,240,255,0.25)" strokeWidth="1" />
              <rect x="235" y="145" width="100" height="90" fill="rgba(0, 200, 255, 0.05)" stroke="rgba(0,240,255,0.25)" strokeWidth="1" />
              <rect x="125" y="245" width="210" height="100" fill="rgba(0, 200, 255, 0.07)" stroke="rgba(0,240,255,0.3)" strokeWidth="1" />

              {/* Hand-drawn style label matching sketch: "New" */}
              <text
                x="230"
                y="295"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="24"
                fontFamily="'Inter', 'Outfit', sans-serif"
                fontWeight="700"
                letterSpacing="1"
                className="pointer-events-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
              >
                New
              </text>
              <text
                x="230"
                y="318"
                textAnchor="middle"
                fill="#00f0ff"
                fontSize="10"
                fontFamily="monospace"
                letterSpacing="2"
                className="pointer-events-none opacity-80"
              >
                WEST BLOCK // SECTOR-A
              </text>

              {/* Room tags */}
              <text x="135" y="165" fill="rgba(255,255,255,0.4)" fontSize="9" fontFamily="monospace">LAB 101</text>
              <text x="245" y="165" fill="rgba(255,255,255,0.4)" fontSize="9" fontFamily="monospace">SEMINAR</text>
            </g>

            {/* 3. BOTTOM-CENTER: "ADMIN" BLOCK */}
            <g className="cursor-pointer group">
              <rect
                x="410"
                y="400"
                width="190"
                height="280"
                rx="22"
                fill="rgba(10, 25, 48, 0.9)"
                stroke="#00f0ff"
                strokeWidth="2.5"
                className="transition-all duration-300 group-hover:stroke-cyber-accent"
                filter="url(#cyanZoneGlow)"
              />
              {/* Inner rooms / compartments */}
              <rect x="425" y="415" width="160" height="90" fill="rgba(0, 200, 255, 0.06)" stroke="rgba(0,240,255,0.25)" strokeWidth="1" />
              <rect x="425" y="515" width="75" height="150" fill="rgba(0, 200, 255, 0.05)" stroke="rgba(0,240,255,0.25)" strokeWidth="1" />
              <rect x="510" y="515" width="75" height="150" fill="rgba(0, 200, 255, 0.05)" stroke="rgba(0,240,255,0.25)" strokeWidth="1" />

              {/* Hand-drawn style label matching sketch: "Admin" */}
              <text
                x="505"
                y="595"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="24"
                fontFamily="'Inter', 'Outfit', sans-serif"
                fontWeight="700"
                letterSpacing="1"
                className="pointer-events-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
              >
                Admin
              </text>
              <text
                x="505"
                y="618"
                textAnchor="middle"
                fill="#00f0ff"
                fontSize="10"
                fontFamily="monospace"
                letterSpacing="2"
                className="pointer-events-none opacity-80"
              >
                CENTRAL HEADQUARTERS
              </text>

              {/* Room tags */}
              <text x="435" y="435" fill="rgba(255,255,255,0.4)" fontSize="9" fontFamily="monospace">RECORDS</text>
              <text x="435" y="535" fill="rgba(255,255,255,0.4)" fontSize="9" fontFamily="monospace">DEAN WING</text>
              <text x="520" y="535" fill="rgba(255,255,255,0.4)" fontSize="9" fontFamily="monospace">COUNCIL</text>
            </g>

            {/* 4. RIGHT: "NEW" BUILDING (East Block - Tall Rectangle) */}
            <g className="cursor-pointer group">
              <rect
                x="670"
                y="120"
                width="240"
                height="580"
                rx="22"
                fill="rgba(10, 25, 48, 0.88)"
                stroke="#00f0ff"
                strokeWidth="2.5"
                className="transition-all duration-300 group-hover:stroke-cyber-accent"
                filter="url(#cyanZoneGlow)"
              />
              {/* Inner rooms / compartments */}
              <rect x="685" y="135" width="210" height="150" fill="rgba(0, 200, 255, 0.06)" stroke="rgba(0,240,255,0.25)" strokeWidth="1" />
              <rect x="685" y="295" width="100" height="180" fill="rgba(0, 200, 255, 0.05)" stroke="rgba(0,240,255,0.25)" strokeWidth="1" />
              <rect x="795" y="295" width="100" height="180" fill="rgba(0, 200, 255, 0.05)" stroke="rgba(0,240,255,0.25)" strokeWidth="1" />
              <rect x="685" y="485" width="210" height="200" fill="rgba(0, 200, 255, 0.07)" stroke="rgba(0,240,255,0.3)" strokeWidth="1" />

              {/* Hand-drawn style label matching sketch: "New" */}
              <text
                x="790"
                y="450"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="28"
                fontFamily="'Inter', 'Outfit', sans-serif"
                fontWeight="700"
                letterSpacing="1"
                className="pointer-events-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
              >
                New
              </text>
              <text
                x="790"
                y="475"
                textAnchor="middle"
                fill="#00f0ff"
                fontSize="11"
                fontFamily="monospace"
                letterSpacing="2"
                className="pointer-events-none opacity-80"
              >
                EAST ACADEMIC COMPLEX
              </text>

              {/* Room tags */}
              <text x="700" y="155" fill="rgba(255,255,255,0.4)" fontSize="9" fontFamily="monospace">ROBOTICS LAB</text>
              <text x="700" y="315" fill="rgba(255,255,255,0.4)" fontSize="9" fontFamily="monospace">AUDITORIUM</text>
              <text x="805" y="315" fill="rgba(255,255,255,0.4)" fontSize="9" fontFamily="monospace">TECH BAY</text>
              <text x="700" y="505" fill="rgba(255,255,255,0.4)" fontSize="9" fontFamily="monospace">RESEARCH ATRIUM</text>
            </g>

            {/* ------------------------------------------------------------- */}
            {/* LIVE SEEKER MARKERS (Yellow Dots matching sketch)             */}
            {/* ------------------------------------------------------------- */}
            {seekers.map((seeker) => {
              const isSelected = seeker.id === selectedSeekerId;
              const isHovered = hoveredSeeker?.id === seeker.id;

              return (
                <g
                  key={seeker.id}
                  transform={`translate(${seeker.x}, ${seeker.y})`}
                  className="cursor-pointer group"
                  onClick={() => handleSeekerClick(seeker)}
                  onMouseEnter={() => setHoveredSeeker(seeker)}
                  onMouseLeave={() => setHoveredSeeker(null)}
                >
                  {/* Subtle outer halo on selection */}
                  {isSelected && (
                    <circle
                      cx="0"
                      cy="0"
                      r={14}
                      fill="rgba(255, 215, 0, 0.15)"
                      stroke="#ffd700"
                      strokeWidth="1.5"
                    />
                  )}

                  {/* Main Yellow Core Dot (From drawing) */}
                  <circle
                    cx="0"
                    cy="0"
                    r={isSelected ? 7.5 : isHovered ? 7 : 5.5}
                    fill="#ffd700"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    filter="url(#yellowRadarGlow)"
                    className="transition-transform duration-150 group-hover:scale-125"
                  />

                  {/* Seeker Player ID Tag Label */}
                  <g transform="translate(0, 16)" className="pointer-events-none">
                    <rect
                      x="-20"
                      y="-7"
                      width="40"
                      height="14"
                      rx="3"
                      fill="rgba(5, 5, 5, 0.9)"
                      stroke={isSelected ? '#ffd700' : 'rgba(255, 234, 0, 0.4)'}
                      strokeWidth="1"
                    />
                    <text
                      x="0"
                      y="3"
                      fill={isSelected ? '#ffd700' : '#ffffff'}
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {seeker.playerId}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Empty state when 0 seekers connected */}
        {seekers.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="bg-[#030816]/90 border border-cyber-accent/40 p-4 rounded-sm max-w-sm text-center font-mono shadow-[0_0_25px_rgba(0,255,204,0.15)] backdrop-blur-sm">
              <div className="flex items-center justify-center gap-2 text-cyber-accent text-xs font-bold mb-1 tracking-wider uppercase">
                <span className="w-2 h-2 rounded-full bg-cyber-accent animate-ping" />
                <span>SEEKER STREAM LISTENER ACTIVE</span>
              </div>
              <p className="text-[11px] text-cyber-muted mt-1">
                Zero active seekers detected on the campus grid.
              </p>
              <p className="text-[10px] text-white/60 mt-1">
                Awaiting React Native mobile app ingest on Cloud Firestore.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Floating Hover Tooltip */}
      <AnimatePresence>
        {hoveredSeeker && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.1 }}
            className="fixed pointer-events-none z-50 bg-[#080d1a]/95 backdrop-blur-md border border-[#ffd700]/70 p-3 shadow-[0_0_20px_rgba(255,215,0,0.25)] rounded-sm font-mono text-xs w-60"
            style={{ left: mousePos.x + 18, top: mousePos.y + 18 }}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-2">
              <span className="font-bold text-[#ffd700] text-sm flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#ffd700] animate-pulse" />
                {hoveredSeeker.playerId} // {hoveredSeeker.name}
              </span>
              <span className="text-[10px] text-cyber-muted uppercase px-1 border border-white/10">
                {hoveredSeeker.signal}
              </span>
            </div>

            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between text-cyber-muted">
                <span>ZONE:</span>
                <span className="text-white font-medium">{hoveredSeeker.zoneName}</span>
              </div>
              <div className="flex justify-between text-cyber-muted">
                <span>STATUS:</span>
                <span className={`font-semibold ${
                  hoveredSeeker.status === 'CLAIMING_ARTIFACT' ? 'text-cyber-accent animate-pulse' : 'text-cyber-success'
                }`}>
                  {hoveredSeeker.status.replace('_', ' ')}
                </span>
              </div>
              <div className="flex justify-between text-cyber-muted">
                <span>BATTERY:</span>
                <span className="text-white">{hoveredSeeker.battery}%</span>
              </div>
              <div className="flex justify-between text-cyber-muted">
                <span>SPEED:</span>
                <span className="text-white">{hoveredSeeker.speedKmh ?? 3.5} km/h</span>
              </div>
              <div className="flex justify-between text-cyber-muted">
                <span>ARTIFACTS:</span>
                <span className="text-[#ffd700] font-bold">
                  {hoveredSeeker.qrScannedCount ?? 0} claimed <span className="text-white/40 text-[9px] font-normal">(of 15 total)</span>
                </span>
              </div>
            </div>

            <div className="mt-2.5 pt-1.5 border-t border-white/10 text-center text-[10px] text-cyber-accent tracking-widest uppercase">
              [ CLICK TO INSPECT TELEMETRY ]
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Map Legend */}
      <div className="absolute bottom-2 left-4 right-4 z-20 flex items-center justify-between text-[10px] font-mono text-cyber-muted pointer-events-none">
        <div className="flex items-center gap-4 bg-black/60 backdrop-blur-sm px-3 py-1 border border-white/10 rounded-sm">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#ffd700]" />
            <span className="text-white">Active Seeker (RN App)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 border border-[#00f0ff] bg-[#00f0ff]/10" />
            <span className="text-white">Campus Zone</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[#00ffcc]">---</span>
            <span className="text-white">Connector Skyway</span>
          </div>
        </div>

        <div className="hidden sm:block text-[9px] tracking-widest text-cyber-muted uppercase">
          OPENVERSE SURVEILLANCE GRID // V3.2
        </div>
      </div>
    </div>
  );
}
