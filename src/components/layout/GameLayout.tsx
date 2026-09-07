import React from 'react';
import { cn } from '../../utils/cn';

interface GameLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function GameLayout({ children, className }: GameLayoutProps) {
  return (
    <div className="relative w-full h-screen overflow-hidden bg-cyber-dark text-cyber-text flex flex-col font-mono">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none z-0"></div>
      
      {/* Scanlines overlay */}
      <div className="absolute inset-0 bg-scanlines opacity-10 pointer-events-none z-50 mix-blend-overlay"></div>
      
      {/* Main Content */}
      <div className={cn("relative z-10 w-full h-full flex flex-col", className)}>
        {children}
      </div>
    </div>
  );
}
