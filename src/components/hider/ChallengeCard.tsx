import React from 'react';
import { motion } from 'framer-motion';
import { Lock, CheckCircle2, Terminal, ShieldAlert, Zap } from 'lucide-react';
import type { Challenge } from '../../types/game';

interface ChallengeCardProps {
  challenge: Challenge;
  currentUserId: string;
  onSelect: (challenge: Challenge) => void;
}

export const ChallengeCard: React.FC<ChallengeCardProps> = ({
  challenge,
  currentUserId,
  onSelect,
}) => {
  const isSolvedByMe = challenge.isSolved && challenge.solvedBy?.uid === currentUserId;
  const isClaimedByOther = challenge.isSolved && !isSolvedByMe;
  const isOpen = !challenge.isSolved;

  const difficultyColors = {
    EASY: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    MEDIUM: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    HARD: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
  }[challenge.difficulty] ?? 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10';

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ duration: 0.18 }}
      onClick={() => onSelect(challenge)}
      className={`group relative rounded-sm p-4 cursor-pointer font-mono border backdrop-blur-md transition-all flex flex-col justify-between overflow-hidden ${
        isSolvedByMe
          ? 'bg-[#002b1b]/40 border-cyber-success/60 shadow-[0_0_15px_rgba(0,255,100,0.12)]'
          : isClaimedByOther
          ? 'bg-[#1a080c]/50 border-rose-500/30 opacity-80 hover:opacity-100 hover:border-rose-500/60'
          : 'bg-[#03091c]/70 border-cyber-accent/25 hover:border-cyber-accent hover:shadow-[0_0_20px_rgba(0,255,204,0.16)]'
      }`}
    >
      {/* Top glowing edge line */}
      <div
        className={`absolute top-0 left-0 right-0 h-[2px] ${
          isSolvedByMe
            ? 'bg-cyber-success shadow-[0_0_8px_#00ff66]'
            : isClaimedByOther
            ? 'bg-rose-500/60'
            : 'bg-cyber-accent/50 group-hover:bg-cyber-accent group-hover:shadow-[0_0_10px_#00f0ff]'
        }`}
      />

      {/* Header Info */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-2 text-[10px]">
          <span className="text-white/40 tracking-widest uppercase">
            {challenge.id.toUpperCase()} // {challenge.category}
          </span>
          <span className={`px-2 py-0.5 rounded border text-[9px] font-bold tracking-wider ${difficultyColors}`}>
            {challenge.difficulty}
          </span>
        </div>

        <h3 className="text-sm font-bold text-white tracking-wide mb-2 line-clamp-1 group-hover:text-cyber-accent transition-colors">
          {challenge.title}
        </h3>

        <p className="text-[11px] text-white/60 line-clamp-2 leading-relaxed mb-4">
          {challenge.description.replace(/[>#*`]/g, '')}
        </p>
      </div>

      {/* Rewards & Lockout Status */}
      <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[11px] font-bold text-[#ffd700]">
            <Zap className="w-3.5 h-3.5 fill-[#ffd700]" />
            <span>+{challenge.tokensAwarded} TOKEN</span>
          </div>
          <span className="text-white/20 text-[10px]">|</span>
          <span className="text-[10px] text-white/50">{challenge.points} PTS</span>
        </div>

        {/* Status Indicator */}
        <div>
          {isSolvedByMe && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyber-success/20 border border-cyber-success/50 text-cyber-success text-[10px] font-bold">
              <CheckCircle2 className="w-3 h-3 text-cyber-success" />
              <span>CLAIMED BY YOU</span>
            </div>
          )}

          {isClaimedByOther && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/40 text-rose-400 text-[10px] font-bold">
              <Lock className="w-3 h-3 text-rose-400" />
              <span>LOCKED // {challenge.solvedBy?.playerId ?? 'CLAIMED'}</span>
            </div>
          )}

          {isOpen && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyber-accent/15 border border-cyber-accent/40 text-cyber-accent text-[10px] font-bold group-hover:bg-cyber-accent group-hover:text-black transition-all">
              <Terminal className="w-3 h-3" />
              <span>DECRYPT [OPEN]</span>
            </div>
          )}
        </div>
      </div>

      {/* Diagonal scan watermark for locked challenges */}
      {isClaimedByOther && (
        <div className="absolute -right-6 -bottom-6 pointer-events-none opacity-5">
          <ShieldAlert className="w-32 h-32 text-rose-500" />
        </div>
      )}
    </motion.div>
  );
};
