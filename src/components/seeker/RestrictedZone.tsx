import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import type { Zone } from '../../types/game';

interface RestrictedZoneProps {
  zone: Zone;
  onClick: (id: string) => void;
  isHovered: boolean;
  onHover: (id: string | null) => void;
  isSelected: boolean;
}

export function RestrictedZone({ zone, onClick, isHovered, onHover, isSelected }: RestrictedZoneProps) {
  const polygonRef = useRef<SVGPolygonElement>(null);
  const scanlineRef = useRef<SVGLineElement>(null);

  useEffect(() => {
    const poly = polygonRef.current;
    const scan = scanlineRef.current;
    if (!poly) return;

    // Clean up any ongoing tweens on these elements
    gsap.killTweensOf([poly, scan].filter(Boolean));

    if (isHovered || isSelected) {
      // Lift effect
      gsap.to(poly, {
        y: -5,
        scale: 1.01,
        fill: "rgba(255, 10, 50, 0.4)",
        stroke: "#ff0033",
        strokeWidth: 2,
        duration: 0.3,
        ease: "power2.out",
        transformOrigin: "center center"
      });

      // Scanline effect
      if (scan) {
        // Approximate height from points
        const yCoords = zone.points.split(' ').map(p => parseFloat(p.split(',')[1])).filter(n => !isNaN(n));
        const minY = Math.min(...yCoords);
        const maxY = Math.max(...yCoords);
        
        gsap.fromTo(scan, 
          { y: minY, opacity: 0 },
          { y: maxY, opacity: 0.8, duration: 1.5, repeat: -1, ease: "linear" }
        );
      }
    } else {
      // Return to normal
      gsap.to(poly, {
        y: 0,
        scale: 1,
        fill: "rgba(255, 10, 50, 0.15)",
        stroke: "rgba(255, 10, 50, 0.5)",
        strokeWidth: 1,
        duration: 0.4,
        ease: "power2.inOut"
      });
      if (scan) {
        gsap.set(scan, { opacity: 0 });
      }
    }

    return () => {
      if (poly) gsap.killTweensOf(poly);
      if (scan) gsap.killTweensOf(scan);
    };
  }, [isHovered, isSelected, zone.points]);

  // Compute center for label approximation
  const pts = zone.points.split(' ').map(p => p.split(',').map(Number));
  const cx = pts.reduce((sum, p) => sum + p[0], 0) / pts.length || 0;
  const cy = pts.reduce((sum, p) => sum + p[1], 0) / pts.length || 0;

  return (
    <g 
      className="cursor-pointer"
      onMouseEnter={() => onHover(zone.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onClick(zone.id)}
    >
      {/* Drop shadow / base anchor for pseudo 3D */}
      {(isHovered || isSelected) && (
        <polygon 
          points={zone.points} 
          fill="rgba(0,0,0,0.5)" 
          className="pointer-events-none filter blur-sm"
        />
      )}
      
      {/* The actual restricted zone geometry */}
      <polygon 
        ref={polygonRef}
        points={zone.points} 
        fill="rgba(255, 10, 50, 0.15)"
        stroke="rgba(255, 10, 50, 0.5)"
        strokeWidth="1"
        style={{ filter: (isHovered || isSelected) ? "drop-shadow(0px 0px 8px rgba(255, 10, 50, 0.8))" : "none" }}
      />
      
      {/* Scanning beam line */}
      <line 
        ref={scanlineRef}
        x1={cx - 150} // Arbitrary width for scanline
        x2={cx + 150}
        y1="0"
        y2="0"
        stroke="#ff0033"
        strokeWidth="2"
        opacity="0"
        className="pointer-events-none filter drop-shadow(0 0 4px #ff0033)"
      />

      {/* Label (only visible on hover or if not selected) */}
      {(isHovered || isSelected) && (
        <text 
          x={cx} 
          y={cy} 
          fill="#ff3366" 
          fontSize="14" 
          fontFamily="monospace"
          textAnchor="middle"
          fontWeight="bold"
          className="pointer-events-none uppercase tracking-widest filter drop-shadow(0 0 4px rgba(0,0,0,0.8))"
          style={{ transform: `translateY(${(isHovered || isSelected) ? -5 : 0}px)`, transition: 'transform 0.3s' }}
        >
          {zone.name}
        </text>
      )}
    </g>
  );
}
