import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, CheckCircle2, AlertTriangle, Zap, Terminal, HelpCircle } from 'lucide-react';
import type { Challenge, Profile } from '../../types/game';
import { useHiderStore } from '../../store/hiderStore';

interface ChallengeTerminalModalProps {
  challenge: Challenge;
  profile: Profile;
  onClose: () => void;
}

export const ChallengeTerminalModal: React.FC<ChallengeTerminalModalProps> = ({
  challenge,
  profile,
  onClose,
}) => {
  const {
    submitAnswer,
    isSubmitting,
    submissionError,
    submissionSuccess,
    claimedByOperative,
    resetSubmissionState,
  } = useHiderStore();

  const [inputVal, setInputVal] = useState('');
  const [hintIndex, setHintIndex] = useState(0);
  const [showHints, setShowHints] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    resetSubmissionState();
    // Focus input on mount if open
    if (!challenge.isSolved) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [challenge.id, challenge.isSolved, resetSubmissionState]);

  const isSolvedByMe = challenge.isSolved && challenge.solvedBy?.uid === profile.id;
  const isClaimedByOther = challenge.isSolved && !isSolvedByMe;
  const isLockedOut = isClaimedByOther || Boolean(claimedByOperative);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || isSubmitting || challenge.isSolved) return;

    setAttempts((prev) => prev + 1);
    await submitAnswer(profile, challenge.id, inputVal.trim());
  };

  const difficultyColors = {
    EASY: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    MEDIUM: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    HARD: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
  }[challenge.difficulty] ?? 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md font-mono">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-2xl bg-[#030919] border border-cyber-accent/40 rounded shadow-[0_0_40px_rgba(0,240,255,0.18)] flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Terminal Header Bar */}
        <div className="bg-[#050e26] border-b border-cyber-accent/25 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <Terminal className="w-4 h-4 text-cyber-accent animate-pulse" />
            <span className="text-white font-bold tracking-wider">
              TERMINAL // {challenge.id.toUpperCase()}
            </span>
            <span className="text-white/30">|</span>
            <span className="text-cyber-accent/80 text-[11px]">{challenge.category}</span>
          </div>

          <div className="flex items-center gap-3">
            <span className={`px-2 py-0.5 rounded border text-[9px] font-bold tracking-wider ${difficultyColors}`}>
              {challenge.difficulty}
            </span>
            <button
              onClick={onClose}
              className="text-white/50 hover:text-white hover:bg-white/10 p-1 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-5 text-xs text-white/90">
          {/* Lockout Warning Banner if claimed by someone else */}
          {isLockedOut && (
            <div className="p-3 rounded bg-rose-950/40 border border-rose-500/50 text-rose-300 flex items-start gap-3 shadow-[0_0_15px_rgba(244,63,94,0.15)]">
              <Lock className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1">
                <span className="font-bold text-rose-200 tracking-wider text-[11px] uppercase">
                  ANOMALY PERMANENTLY LOCKED
                </span>
                <span className="text-[10px] text-rose-300/80 leading-relaxed">
                  This challenge has already been solved and claimed by operative{' '}
                  <strong className="text-rose-100">
                    {claimedByOperative ?? challenge.solvedBy?.playerId ?? challenge.solvedBy?.username ?? 'UNKNOWN'}
                  </strong>
                  . Under the competitive first-solve protocol, submissions for this anomaly are permanently closed.
                </span>
              </div>
            </div>
          )}

          {/* Solved by Me Banner */}
          {(isSolvedByMe || submissionSuccess) && (
            <div className="p-3 rounded bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 flex items-start gap-3 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1">
                <span className="font-bold text-emerald-200 tracking-wider text-[11px] uppercase">
                  ACCESS GRANTED // REWARD CLAIMED
                </span>
                <span className="text-[10px] text-emerald-300/80 leading-relaxed">
                  You decrypted this anomaly first!{' '}
                  <strong className="text-white">+{challenge.tokensAwarded} Elimination Token</strong> has been credited to your active session.
                </span>
              </div>
            </div>
          )}

          {/* Anomaly Title & Reward */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
            <h2 className="text-base font-bold text-white tracking-wide">
              {challenge.title}
            </h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-[#ffd700] text-xs font-bold bg-[#ffd700]/10 border border-[#ffd700]/30 px-2.5 py-1 rounded">
                <Zap className="w-3.5 h-3.5 fill-[#ffd700]" />
                <span>+{challenge.tokensAwarded} TOKEN</span>
              </div>
              <span className="text-white/40">{challenge.points} PTS</span>
            </div>
          </div>

          {/* Anomaly Description & Code Block */}
          <div className="bg-black/50 border border-cyber-accent/20 rounded p-4 text-[12px] leading-relaxed whitespace-pre-wrap font-mono text-cyan-100/90 shadow-inner">
            {challenge.description}
          </div>

          {/* Hints Section */}
          {challenge.hints && challenge.hints.length > 0 && (
            <div className="flex flex-col gap-2">
              {!showHints ? (
                <button
                  type="button"
                  onClick={() => setShowHints(true)}
                  className="flex items-center gap-1.5 text-[11px] text-cyber-accent/80 hover:text-cyber-accent self-start border border-cyber-accent/30 hover:border-cyber-accent px-2.5 py-1 rounded transition-colors"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>REQUEST HINT (1/{challenge.hints.length})</span>
                </button>
              ) : (
                <div className="p-3 rounded bg-cyber-accent/5 border border-cyber-accent/25 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[10px] text-cyber-accent font-bold">
                    <span>HINT // STAGE {hintIndex + 1} OF {challenge.hints.length}</span>
                    {hintIndex < challenge.hints.length - 1 && (
                      <button
                        type="button"
                        onClick={() => setHintIndex((n) => n + 1)}
                        className="text-white/70 hover:text-white underline"
                      >
                        NEXT HINT ›
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-cyan-200">
                    {challenge.hints[hintIndex]}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Error Notice */}
          <AnimatePresence>
            {submissionError && !isLockedOut && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-3 rounded bg-rose-500/10 border border-rose-500/40 text-rose-400 flex items-center gap-2 text-xs"
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  {submissionError === 'INVALID_ANSWER'
                    ? 'ACCESS DENIED: Candidate payload failed validation.'
                    : `SUBMISSION ERROR: ${submissionError}`}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input & Form */}
          <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cyber-accent font-bold text-sm">
                ›
              </span>
              <input
                ref={inputRef}
                type="text"
                disabled={isLockedOut || isSolvedByMe || isSubmitting || submissionSuccess}
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder={
                  isLockedOut
                    ? 'SUBMISSIONS LOCKED — CLAIMED BY ANOTHER OPERATIVE'
                    : isSolvedByMe || submissionSuccess
                    ? 'SOLVED BY YOU — REWARD CREDITED'
                    : 'ENTER DECRYPTED PAYLOAD RESPONSE...'
                }
                className="w-full bg-[#020512] border border-cyber-accent/30 focus:border-cyber-accent rounded px-8 py-3 text-white placeholder:text-white/30 text-xs font-mono tracking-wider focus:outline-none focus:shadow-[0_0_15px_rgba(0,240,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-[10px] text-white/40">
                ATTEMPTS: {attempts.toString().padStart(2, '0')}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded border border-white/10 hover:border-white/30 text-white/60 hover:text-white text-xs tracking-wider transition-colors"
                >
                  ABORT
                </button>

                <button
                  type="submit"
                  disabled={
                    !inputVal.trim() ||
                    isLockedOut ||
                    isSolvedByMe ||
                    isSubmitting ||
                    submissionSuccess
                  }
                  className="px-5 py-2 rounded bg-cyber-accent hover:bg-cyan-300 text-black font-bold text-xs tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                >
                  {isSubmitting ? 'TRANSMITTING...' : 'TRANSMIT DECRYPTION'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
