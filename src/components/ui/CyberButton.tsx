import React from 'react';
import { cn } from '../../utils/cn';

interface CyberButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'warning' | 'danger';
  children: React.ReactNode;
}

export function CyberButton({ variant = 'primary', className, children, ...props }: CyberButtonProps) {
  const baseStyles = "relative px-6 py-2 font-mono text-sm tracking-wider uppercase transition-all duration-300 border focus:outline-none flex items-center justify-center gap-2 group overflow-hidden";
  
  const variants = {
    primary: "border-cyber-accent/50 text-cyber-accent hover:bg-cyber-accent/10 hover:border-cyber-accent neon-text hover:neon-border",
    secondary: "border-cyber-border text-cyber-text hover:bg-cyber-border/30 hover:border-cyber-muted",
    warning: "border-cyber-warning/50 text-cyber-warning hover:bg-cyber-warning/10 hover:border-cyber-warning shadow-[0_0_10px_rgba(255,51,102,0.5)]",
    danger: "border-red-500/50 text-red-500 hover:bg-red-500/10 hover:border-red-500",
  };

  return (
    <button className={cn(baseStyles, variants[variant], className)} {...props}>
      <span className="absolute left-0 w-0 h-0.5 bg-current bottom-0 group-hover:w-full transition-all duration-300"></span>
      {children}
      <span className="absolute right-0 top-0 w-1 h-1 bg-current opacity-50"></span>
      <span className="absolute left-0 bottom-0 w-1 h-1 bg-current opacity-50"></span>
    </button>
  );
}
