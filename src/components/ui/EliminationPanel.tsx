import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { getActiveHiders, getActiveSeekers, eliminatePlayer, subscribeToActiveTargetsChanges } from '../../lib/gameService';
import type { ActiveHider } from '../../types/game';

interface EliminationPanelProps {
  tokens: number;
  onEliminated: () => void;
  targets?: ActiveHider[];
  attackerRole?: string;
  accentColor?: string;
  accentHex?: string;
}

export function EliminationPanel({ tokens, onEliminated, targets: propTargets }: EliminationPanelProps) {
  const { profile, setProfile } = useAuthStore();
  const [hiders, setHiders]   = useState<ActiveHider[]>([]);
  const [showTargets, setShowTargets] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<ActiveHider | null>(null);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [isEliminating, setIsEliminating] = useState(false);
  const [feedback, setFeedback]         = useState<'SUCCESS' | 'ERROR' | null>(null);
  const [feedbackMsg, setFeedbackMsg]   = useState('');

  const targetRole = profile?.role === 'SEEKER' ? 'HIDER' : 'SEEKER';

  useEffect(() => {
    let isMounted = true;
    const fetchTargets = async () => {
      if (!profile) return;
      const list = profile.role === 'SEEKER' ? await getActiveHiders() : await getActiveSeekers();
      if (isMounted) {
        setHiders(list);
      }
    };

    fetchTargets();
    const unsub = subscribeToActiveTargetsChanges(fetchTargets);
    return () => {
      isMounted = false;
      unsub();
    };
  }, [profile]);

  const activeTargets = propTargets ?? hiders;

  const handleConfirm = async () => {
    if (!profile || !selectedTarget) return;
    setIsEliminating(true);

    const result = await eliminatePlayer(profile.id, selectedTarget.id, targetRole);

    if (result.success) {
      // Update token count in store
      const newTokens = Math.max(0, (profile.eliminationTokens) - 1);
      setProfile({ ...profile, eliminationTokens: newTokens });
      setHiders((prev) => prev.filter((h) => h.id !== selectedTarget.id));
      setFeedback('SUCCESS');
      setFeedbackMsg(`${selectedTarget.playerId} ELIMINATED`);
      onEliminated();
    } else {
      setFeedback('ERROR');
      setFeedbackMsg(result.error ?? 'OPERATION FAILED');
    }

    setIsEliminating(false);
    setShowConfirm(false);
    setSelectedTarget(null);
    setShowTargets(false);
    setTimeout(() => setFeedback(null), 4000);
  };

  if (tokens < 1 && !feedback) {
    return (
      <div className="border border-[#00ff41]/10 bg-black/40 p-4 font-mono">
        <p className="text-[#00ff41]/30 text-[9px] tracking-[0.4em] uppercase mb-3">Elimination Panel</p>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#00ff41]/40">TOKENS</span>
            <span className="text-[#00ff41]/30 font-bold">00</span>
          </div>
          <p className="text-[#00ff41]/30 text-[10px] leading-relaxed">
            Solve challenges to earn elimination tokens.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-[#00ff41]/30 bg-[#00ff41]/3 font-mono shadow-[0_0_20px_rgba(0,255,65,0.05)]">
      {/* Token status */}
      <div className="p-4 border-b border-[#00ff41]/20">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[#00ff41]/60 text-[9px] tracking-[0.4em] uppercase">Elimination Tokens</span>
          <motion.span
            key={tokens}
            initial={{ scale: 1.5 }}
            animate={{ scale: 1 }}
            className="text-[#00ff41] font-bold text-lg"
            style={{ textShadow: '0 0 10px #00ff41' }}
          >
            {tokens.toString().padStart(2, '0')}
          </motion.span>
        </div>
        <div className="text-[10px] text-[#00ff41] tracking-widest animate-pulse">
          AVAILABLE
        </div>
      </div>

      {/* Feedback message */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`mx-4 mt-4 p-3 border text-xs text-center ${
              feedback === 'SUCCESS'
                ? 'border-[#00ff41]/40 bg-[#00ff41]/10 text-[#00ff41]'
                : 'border-[#ff3366]/40 bg-[#ff3366]/10 text-[#ff3366]'
            }`}
          >
            {feedback === 'SUCCESS' ? '✓ TARGET ' : '✕ '}{feedbackMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 flex flex-col gap-3">
        {/* Choose Target button */}
        {!showTargets ? (
          <button
            id="choose-target-btn"
            onClick={() => setShowTargets(true)}
            className="w-full border border-[#ff3366]/60 bg-[#ff3366]/10 text-[#ff3366] font-mono text-xs tracking-[0.3em] py-3 uppercase hover:bg-[#ff3366]/20 hover:shadow-[0_0_15px_rgba(255,51,102,0.2)] transition-all"
          >
            [ CHOOSE TARGET ]
          </button>
        ) : (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-2"
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-[#ff3366]/70 text-[9px] tracking-[0.4em] uppercase">Active {targetRole}s</p>
                <button
                  onClick={() => setShowTargets(false)}
                  className="text-[#00ff41]/40 text-[10px] hover:text-[#00ff41]/70"
                >
                  [ CANCEL ]
                </button>
              </div>

              {activeTargets.length === 0 ? (
                <p className="text-[#00ff41]/30 text-xs text-center py-4 tracking-widest">
                  NO ACTIVE TARGETS
                </p>
              ) : (
                activeTargets.map((target) => (
                  <button
                    key={target.id}
                    id={`target-${target.playerId}`}
                    onClick={() => { setSelectedTarget(target); setShowConfirm(true); }}
                    className="flex items-center justify-between border border-[#ff3366]/20 bg-black/60 px-4 py-2.5 hover:border-[#ff3366]/60 hover:bg-[#ff3366]/5 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-1.5 h-1.5 bg-[#00ff41] rounded-full animate-pulse" />
                      <span className="text-white text-xs font-bold tracking-wider">{target.playerId}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[#00ff41] text-[9px] tracking-widest">ACTIVE</span>
                      <span className="text-[#ff3366]/40 text-xs group-hover:text-[#ff3366] transition-colors">[ SELECT ]</span>
                    </div>
                  </button>
                ))
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Confirmation modal */}
      <AnimatePresence>
        {showConfirm && selectedTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-sm bg-[#060606] border border-[#ff3366]/50 font-mono shadow-[0_0_40px_rgba(255,51,102,0.2)] relative"
            >
              {/* Corner accents */}
              {['top-0 left-0 border-t-2 border-l-2', 'top-0 right-0 border-t-2 border-r-2',
                'bottom-0 left-0 border-b-2 border-l-2', 'bottom-0 right-0 border-b-2 border-r-2'].map((c, i) => (
                <div key={i} className={`absolute w-3 h-3 border-[#ff3366] ${c}`} />
              ))}

              <div className="p-6 flex flex-col gap-5">
                <div>
                  <p className="text-[#ff3366]/60 text-[9px] tracking-[0.4em] uppercase mb-1">Confirm Target</p>
                  <h3 className="text-[#ff3366] text-lg font-bold tracking-widest">ELIMINATION</h3>
                </div>

                <div className="border border-[#ff3366]/20 bg-[#ff3366]/5 p-4 flex flex-col gap-2 text-sm">
                  {[
                    { k: 'TARGET', v: selectedTarget.playerId },
                    { k: 'ROLE',   v: targetRole },
                    { k: 'STATUS', v: 'ACTIVE' },
                  ].map(({ k, v }) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-[#ff3366]/50">{k}</span>
                      <span className="text-white font-bold">{v}</span>
                    </div>
                  ))}
                </div>

                <div className="border border-[#ff3366]/20 p-3 text-center">
                  <p className="text-[#ff3366]/60 text-[9px] tracking-widest uppercase mb-1">WARNING</p>
                  <p className="text-white text-xs">This action cannot be undone.</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowConfirm(false); setSelectedTarget(null); }}
                    className="flex-1 border border-[#333] text-[#888] font-mono text-xs tracking-widest py-2.5 uppercase hover:border-cyber-border hover:text-white transition-all"
                  >
                    CANCEL
                  </button>
                  <button
                    id="confirm-elimination-btn"
                    onClick={handleConfirm}
                    disabled={isEliminating}
                    className="flex-1 border border-[#ff3366] bg-[#ff3366]/10 text-[#ff3366] font-mono text-xs tracking-widest py-2.5 uppercase hover:bg-[#ff3366]/20 hover:shadow-[0_0_20px_rgba(255,51,102,0.3)] transition-all disabled:opacity-40"
                  >
                    {isEliminating ? 'EXECUTING...' : 'CONFIRM'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
