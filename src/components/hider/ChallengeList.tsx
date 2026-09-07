import { motion } from 'framer-motion';
import type { HiderChallenge } from '../../types/game';

interface ChallengeListProps {
  challenges: HiderChallenge[];
  onSelect: (challenge: HiderChallenge) => void;
}

const difficultyColor: Record<string, string> = {
  EASY:   'text-[#00ff41] border-[#00ff41]/40 bg-[#00ff41]/5',
  MEDIUM: 'text-yellow-400 border-yellow-400/40 bg-yellow-400/5',
  HARD:   'text-[#ff3366] border-[#ff3366]/40 bg-[#ff3366]/5',
};

const categoryColor: Record<string, string> = {
  Cryptography:        'text-purple-400',
  Programming:         'text-blue-400',
  Web:                 'text-cyan-400',
  Linux:               'text-orange-400',
  Logic:               'text-yellow-300',
  'Reverse Engineering': 'text-pink-400',
  OSINT:               'text-emerald-400',
  'General CTF':       'text-gray-400',
};

export function ChallengeList({ challenges, onSelect }: ChallengeListProps) {
  if (challenges.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 font-mono text-center gap-3">
        <div className="w-8 h-8 border-t-2 border-[#00ff41] animate-[spin_1s_linear_infinite] rounded-full" />
        <p className="text-[#00ff41]/50 text-xs tracking-widest animate-pulse">LOADING INTELLIGENCE...</p>
      </div>
    );
  }

  const solved   = challenges.filter((c) => c.solved).length;
  const unsolved = challenges.filter((c) => !c.solved).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h2 className="text-[#00ff41] font-mono text-xs tracking-[0.4em] uppercase">
          AVAILABLE CHALLENGES
        </h2>
        <div className="flex items-center gap-3 font-mono text-[10px]">
          <span className="text-[#00ff41]/60">{unsolved} OPEN</span>
          <span className="text-[#00ff41]/30">|</span>
          <span className="text-[#00ff41]/40">{solved} SOLVED</span>
        </div>
      </div>

      {/* Challenge cards */}
      <div className="grid gap-2">
        {challenges.map((challenge, i) => (
          <motion.button
            key={challenge.id}
            id={`challenge-${challenge.id}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06, duration: 0.3 }}
            onClick={() => !challenge.solved && onSelect(challenge)}
            disabled={challenge.solved}
            className={`
              w-full text-left border font-mono transition-all duration-200 group relative overflow-hidden
              ${challenge.solved
                ? 'border-[#00ff41]/20 bg-[#00ff41]/5 opacity-60 cursor-default'
                : 'border-[#00ff41]/20 bg-black/60 hover:border-[#00ff41]/60 hover:bg-[#00ff41]/5 hover:shadow-[0_0_15px_rgba(0,255,65,0.1)] cursor-pointer'
              }
            `}
          >
            {/* Hover scan line */}
            {!challenge.solved && (
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-[#00ff41]/8 to-transparent transition-transform duration-700 ease-in-out pointer-events-none" />
            )}

            <div className="px-4 py-3 flex items-center gap-4">
              {/* Status indicator */}
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                challenge.solved ? 'bg-[#00ff41] shadow-[0_0_6px_#00ff41]' : 'bg-[#00ff41]/30 group-hover:bg-[#00ff41]/70'
              }`} />

              {/* Challenge info */}
              <div className="flex-1 flex items-center gap-4 min-w-0">
                <span className="text-[#00ff41]/50 text-[10px] tracking-widest flex-shrink-0">
                  [{challenge.id.toUpperCase()}]
                </span>
                <span className={`text-sm font-bold truncate ${challenge.solved ? 'text-[#00ff41]/60' : 'text-white group-hover:text-[#00ff41]'} transition-colors`}>
                  {challenge.title}
                </span>
                <span className={`text-[10px] tracking-wider flex-shrink-0 ${categoryColor[challenge.category] ?? 'text-gray-400'}`}>
                  {challenge.category}
                </span>
              </div>

              {/* Right side metadata */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={`text-[10px] border px-2 py-0.5 font-bold tracking-wider ${difficultyColor[challenge.difficulty]}`}>
                  {challenge.difficulty}
                </span>
                <span className="text-[#00ff41]/40 text-[10px] tracking-widest">
                  {challenge.points}pts
                </span>
                {challenge.solved ? (
                  <span className="text-[#00ff41] text-xs">✓</span>
                ) : (
                  <span className="text-[#00ff41]/30 text-xs group-hover:text-[#00ff41]/70 transition-colors">›</span>
                )}
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
