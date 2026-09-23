import React from 'react';
import { Shield, Zap, Lock, CheckCircle, Terminal, Layers } from 'lucide-react';
import type { Challenge, ChallengeCategory } from '../../types/game';
import type { StatusFilter } from '../../store/hiderStore';

interface HiderHUDProps {
  challenges: Challenge[];
  currentUserId: string;
  tokens: number;
  filterCategory: ChallengeCategory | 'ALL';
  filterStatus: StatusFilter;
  onSelectCategory: (category: ChallengeCategory | 'ALL') => void;
  onSelectStatus: (status: StatusFilter) => void;
}

const CATEGORIES: (ChallengeCategory | 'ALL')[] = [
  'ALL',
  'CRYPTOGRAPHY',
  'NETWORK',
  'LOGIC',
  'LINUX',
  'OSINT',
];

export const HiderHUD: React.FC<HiderHUDProps> = ({
  challenges,
  currentUserId,
  tokens,
  filterCategory,
  filterStatus,
  onSelectCategory,
  onSelectStatus,
}) => {
  const total = challenges.length;
  const openCount = challenges.filter((c) => !c.isSolved).length;
  const mySolvedCount = challenges.filter((c) => c.isSolved && c.solvedBy?.uid === currentUserId).length;
  const otherClaimedCount = challenges.filter((c) => c.isSolved && c.solvedBy?.uid !== currentUserId).length;

  return (
    <div className="bg-[#03081a]/90 border-b border-cyber-accent/20 px-4 py-3 font-mono shrink-0 flex flex-col gap-3">
      {/* 1. TOP METRICS STRIP */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left: Tactical Metrics */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-black/50 border border-white/10">
            <Layers className="w-3.5 h-3.5 text-cyber-accent" />
            <span className="text-white/60 text-[11px]">POOL SIZE:</span>
            <span className="text-white font-bold">{total} ANOMALIES</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-cyber-accent/10 border border-cyber-accent/30 text-cyber-accent">
            <Terminal className="w-3.5 h-3.5" />
            <span className="text-white/70 text-[11px]">AVAILABLE:</span>
            <span className="font-bold">{openCount} OPEN</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400">
            <Lock className="w-3.5 h-3.5" />
            <span className="text-white/70 text-[11px]">CLAIMED BY OTHERS:</span>
            <span className="font-bold">{otherClaimedCount} LOCKED</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-cyber-success/10 border border-cyber-success/30 text-cyber-success">
            <CheckCircle className="w-3.5 h-3.5" />
            <span className="text-white/70 text-[11px]">CLAIMED BY YOU:</span>
            <span className="font-bold">{mySolvedCount} SECURED</span>
          </div>
        </div>

        {/* Right: Player Elimination Tokens Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#ffd700]/10 border border-[#ffd700]/40 px-3.5 py-1.5 rounded shadow-[0_0_15px_rgba(255,215,0,0.15)]">
            <Zap className="w-4 h-4 text-[#ffd700] fill-[#ffd700]" />
            <span className="text-[10px] text-[#ffd700]/80 tracking-widest uppercase">ELIMINATION TOKENS:</span>
            <span className="text-lg font-bold text-[#ffd700] tracking-wider leading-none">
              {tokens.toString().padStart(2, '0')}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-white/50 border border-white/10 px-2 py-1.5 rounded bg-black/40">
            <Shield className="w-3 h-3 text-cyber-accent" />
            <span>FIRST-SOLVE LOCKOUT: ACTIVE</span>
          </div>
        </div>
      </div>

      {/* 2. FILTER CONTROLS */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-white/5 text-xs">
        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-white/40 tracking-wider mr-1">STATUS:</span>
          {(
            [
              { key: 'ALL', label: `ALL (${total})` },
              { key: 'OPEN', label: `OPEN (${openCount})` },
              { key: 'CLAIMED', label: `LOCKED (${otherClaimedCount})` },
              { key: 'SOLVED_BY_ME', label: `MINE (${mySolvedCount})` },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              onClick={() => onSelectStatus(item.key)}
              className={`px-2.5 py-1 rounded text-[10px] tracking-wider transition-all uppercase ${
                filterStatus === item.key
                  ? 'bg-cyber-accent text-black font-bold shadow-[0_0_10px_rgba(0,240,255,0.4)]'
                  : 'bg-black/40 text-white/60 hover:text-white border border-white/10'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Category Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-white/40 tracking-wider mr-1">CATEGORY:</span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className={`px-2 py-0.5 rounded text-[10px] tracking-wider transition-all ${
                filterCategory === cat
                  ? 'bg-white text-black font-bold'
                  : 'bg-white/5 text-white/50 hover:text-white border border-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
