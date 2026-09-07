import React from 'react';
import { cn } from '../../utils/cn';

interface TerminalPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  children: React.ReactNode;
}

export function TerminalPanel({ title, children, className, ...props }: TerminalPanelProps) {
  return (
    <div className={cn("glass-panel relative flex flex-col overflow-hidden", className)} {...props}>
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyber-accent"></div>
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyber-accent"></div>
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyber-accent"></div>
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyber-accent"></div>
      
      {title && (
        <div className="px-4 py-1 text-xs tracking-widest text-cyber-accent bg-cyber-accent/10 border-b border-cyber-border/50 uppercase font-mono flex items-center justify-between">
          <span>{title}</span>
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-cyber-accent animate-pulse-fast"></span>
          </div>
        </div>
      )}
      <div className="p-4 flex-grow overflow-auto relative z-10">
        {children}
      </div>
      
      {/* Background noise/scanline effect inside panel */}
      <div className="absolute inset-0 pointer-events-none opacity-5 bg-scanlines mix-blend-overlay z-0"></div>
    </div>
  );
}
