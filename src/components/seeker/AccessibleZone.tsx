import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import type { Zone } from '../../types/game';

/** Renders an unlocked/accessible zone on the tactical map with a cyan glow animation */
export function AccessibleZone({ zone }: { zone: Zone }) {
  const polygonRef = useRef<SVGPolygonElement>(null);

  useEffect(() => {
    if (!polygonRef.current) return;
    // Entrance: flash green then settle to cyan
    const tl = gsap.timeline();
    tl.fromTo(
      polygonRef.current,
      { fill: 'rgba(0,255,102,0.5)', stroke: '#00ff66', strokeWidth: 3 },
      { fill: 'rgba(0,255,204,0.12)', stroke: 'rgba(0,255,204,0.5)', strokeWidth: 1, duration: 1.5, ease: 'power2.inOut' }
    );
    return () => {
      tl.kill();
    };
  }, []);

  const pts = zone.points.split(' ').map((p) => p.split(',').map(Number));
  const cx  = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cy  = pts.reduce((s, p) => s + p[1], 0) / pts.length;

  return (
    <g className="pointer-events-none">
      <polygon
        ref={polygonRef}
        points={zone.points}
        fill="rgba(0,255,204,0.12)"
        stroke="rgba(0,255,204,0.5)"
        strokeWidth="1"
        style={{ filter: 'drop-shadow(0 0 6px rgba(0,255,204,0.3))' }}
      />
      <text
        x={cx} y={cy}
        fill="rgba(0,255,204,0.7)"
        fontSize="11"
        fontFamily="monospace"
        textAnchor="middle"
        fontWeight="bold"
        className="uppercase tracking-widest"
      >
        ✓ {zone.name}
      </text>
    </g>
  );
}
