import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSeekerStore } from '../../store/seekerStore';
import { RestrictedZone } from './RestrictedZone';
import { AccessibleZone } from './AccessibleZone';

interface TacticalMapProps {
  onChallengeSelect: (id: string) => void;
  selectedChallengeId: string | null;
}

export function TacticalMap({ onChallengeSelect, selectedChallengeId }: TacticalMapProps) {
  const { zones, challenges } = useSeekerStore();
  const mapRef = useRef<HTMLDivElement>(null);
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const mapWidth  = 1000;
  const mapHeight = 800;

  const hoveredZone      = zones.find((z) => z.id === hoveredZoneId);
  const hoveredChallenge = hoveredZone ? challenges.find((c) => c.locationId === hoveredZone.id) : null;

  useEffect(() => {
    const onMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  const handleZoneClick = (zoneId: string) => {
    const challenge = challenges.find((c) => c.locationId === zoneId);
    if (challenge) onChallengeSelect(challenge.id);
  };

  return (
    <div className="relative w-full h-full bg-[#030303] overflow-hidden flex items-center justify-center p-2" ref={mapRef}>
      {/* Stage container maintaining fixed aspect ratio so image & SVG share identical bounding box */}
      <div
        className="relative w-full h-full max-w-[1200px] max-h-[900px] aspect-[5/4] flex items-center justify-center transition-all duration-700"
        style={{
          transform: selectedChallengeId ? 'scale(0.98)' : 'scale(1)',
          opacity: selectedChallengeId ? 0.35 : 1,
          filter: selectedChallengeId ? 'blur(2px)' : 'none',
        }}
      >
        {/* Base map image */}
        <img
          src="/09_Ground_floor_plan.jpg"
          alt="Campus Grid Base"
          className="absolute inset-0 w-full h-full object-fill opacity-60 pointer-events-none select-none"
          style={{ filter: 'invert(1) sepia(1) hue-rotate(140deg) saturate(3) brightness(0.9) contrast(2)' }}
        />

        {/* SVG overlay layer */}
        <svg viewBox={`0 0 ${mapWidth} ${mapHeight}`} className="absolute inset-0 w-full h-full touch-none select-none">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,255,204,0.05)" strokeWidth="1" />
            </pattern>
            <filter id="cyanGlow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="greenGlow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Zones */}
          {zones.map((zone) => {
            if (!zone.points) return null;
            const challenge = challenges.find((c) => c.locationId === zone.id);
            const isSelected = challenge?.id === selectedChallengeId;

            if (zone.isRestricted && !zone.isAccessible) {
              return (
                <RestrictedZone
                  key={zone.id}
                  zone={zone}
                  onClick={handleZoneClick}
                  isHovered={hoveredZoneId === zone.id && !selectedChallengeId}
                  onHover={setHoveredZoneId}
                  isSelected={isSelected}
                />
              );
            }
            if (zone.isAccessible) {
              return (
                <AccessibleZone key={zone.id} zone={zone} />
              );
            }
            return null;
          })}

          {/* Player marker */}
          <g transform="translate(250, 450)" className="pointer-events-none">
            <circle cx="0" cy="0" r="30" fill="none" stroke="rgba(0,255,204,0.2)" strokeWidth="1" className="animate-ping" />
            <circle cx="0" cy="0" r="15" fill="none" stroke="rgba(0,255,204,0.5)" strokeDasharray="4 8" strokeWidth="2" className="animate-[spin_4s_linear_infinite]" />
            <polygon points="0,-6 5,5 -5,5" fill="#00ffcc" filter="url(#cyanGlow)" />
            <text x="0" y="26" fill="#00ffcc" fontSize="9" fontFamily="monospace" textAnchor="middle" className="tracking-widest">YOU</text>
          </g>
        </svg>
      </div>

      {/* Hover tooltip */}
      <AnimatePresence>
        {hoveredZone && !selectedChallengeId && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="fixed pointer-events-none z-50 bg-[#050505]/90 backdrop-blur-md border border-[#ff0033]/50 p-3 shadow-[0_0_15px_rgba(255,0,51,0.2)]"
            style={{ left: mousePos.x + 20, top: mousePos.y + 20, fontFamily: '"JetBrains Mono", monospace' }}
          >
            <div className="text-[10px] text-[#ff3366] uppercase tracking-widest border-b border-[#ff0033]/30 pb-1 mb-2 font-bold flex items-center justify-between gap-4">
              <span>{hoveredZone.isAccessible ? 'ACCESSIBLE ZONE' : 'RESTRICTED ZONE'}</span>
              <span className="w-1.5 h-1.5 bg-[#ff3366] rounded-full animate-pulse" />
            </div>
            <div className="text-white text-sm uppercase tracking-wider mb-2 font-display">{hoveredZone.name}</div>
            {hoveredChallenge && !hoveredChallenge.solved && !hoveredZone.isAccessible ? (
              <div className="flex flex-col gap-1 text-[11px] text-cyber-accent">
                <span>SIGNAL DETECTED</span>
                <span>CHALLENGE AVAILABLE</span>
                <div className="mt-2 text-white bg-white/10 px-2 py-1 text-center animate-pulse text-[10px]">[ CLICK TO INVESTIGATE ]</div>
              </div>
            ) : hoveredZone.isAccessible ? (
              <div className="text-[11px] text-cyber-success">✓ AREA UNLOCKED</div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map coordinates overlay */}
      <div className="absolute top-20 left-6 flex flex-col gap-1 pointer-events-none opacity-40 font-mono text-[10px] text-cyber-accent">
        <span>LAT: 34.0522 N</span>
        <span>LNG: 118.2437 W</span>
        <span>SYS: NOMINAL</span>
      </div>
    </div>
  );
}
