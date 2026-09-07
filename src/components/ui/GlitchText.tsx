import React from 'react';
import { cn } from '../../utils/cn';

interface GlitchTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  text: string;
  active?: boolean;
}

export function GlitchText({ text, active = false, className, ...props }: GlitchTextProps) {
  return (
    <span 
      className={cn(
        "relative inline-block font-display",
        active && "animate-glitch",
        className
      )}
      data-text={text}
      {...props}
    >
      {text}
      {active && (
        <>
          <span className="absolute top-0 left-[-1px] -z-10 w-full h-full text-cyber-warning opacity-70" aria-hidden="true">{text}</span>
          <span className="absolute top-0 left-[1px] -z-10 w-full h-full text-cyber-accent opacity-70" aria-hidden="true">{text}</span>
        </>
      )}
    </span>
  );
}
