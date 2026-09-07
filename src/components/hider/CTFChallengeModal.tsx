import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { useAuthStore } from '../../store/authStore';
import { solveHiderChallenge } from '../../lib/gameService';
import type { HiderChallenge } from '../../types/game';

interface CTFChallengeModalProps {
  challenge: HiderChallenge | null;
  onClose: () => void;
  onSolved: (newTokenCount: number) => void;
}

export function CTFChallengeModal({ challenge, onClose, onSolved }: CTFChallengeModalProps) {
  const { profile, setProfile } = useAuthStore();
  const [answer, setAnswer]   = useState('');
  const [status, setStatus]   = useState<'IDLE' | 'SUBMITTING' | 'ERROR' | 'SUCCESS'>('IDLE');
  const [attempts, setAttempts] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);
  const [newTokens, setNewTokens] = useState(0);

  const modalRef   = useRef<HTMLDivElement>(null);
  const tokenRef   = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const descRef    = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 300);
    const desc = descRef.current;
    const modal = modalRef.current;
    const token = tokenRef.current;
    if (desc && challenge?.description) {
      gsap.fromTo(desc, 
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', delay: 0.1 }
      );
    }
    return () => {
      clearTimeout(timer);
      if (desc) gsap.killTweensOf(desc);
      if (modal) gsap.killTweensOf(modal);
      if (token) gsap.killTweensOf(token);
    };
  }, [challenge?.id, challenge?.description]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challenge || !profile || status === 'SUBMITTING' || status === 'SUCCESS') return;
    setStatus('SUBMITTING');
    setAttempts((n) => n + 1);

    const result = await solveHiderChallenge(profile.id, challenge.id, answer);

    if (result.success) {
      const updatedTokens = (profile.eliminationTokens) + result.tokensGranted;
      setNewTokens(updatedTokens);
      setStatus('SUCCESS');
      setProfile({ ...profile, eliminationTokens: updatedTokens });

      // GSAP token counter animation
      if (tokenRef.current) {
        gsap.timeline()
          .to(tokenRef.current, { scale: 1.5, color: '#00ff41', duration: 0.3, ease: 'back.out(3)' })
          .to(tokenRef.current, { scale: 1, duration: 0.4, ease: 'elastic.out(1,0.5)' });
      }
      // Notify parent after a moment
      setTimeout(() => { onSolved(updatedTokens); }, 2500);
    } else {
      setStatus('ERROR');
      if (modalRef.current) {
        gsap.to(modalRef.current, {
          x: 'random(-8,8)', duration: 0.05, repeat: 6, yoyo: true,
          onComplete: () => {
            if (modalRef.current) gsap.set(modalRef.current, { x: 0 });
            setTimeout(() => setStatus('IDLE'), 1500);
          },
        });
      }
    }
  };

  const diffColor =
    challenge?.difficulty === 'EASY'   ? 'text-[#00ff41]' :
    challenge?.difficulty === 'MEDIUM' ? 'text-yellow-400' : 'text-[#ff3366]';

  return (
    <AnimatePresence>
      {challenge && (
        <motion.div
          key="hider-modal-bg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
        >
          <motion.div
            key="hider-modal"
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.93, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 30 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-xl max-h-[90vh] flex flex-col"
          >
            {/* Terminal box */}
            <div className="relative bg-[#040404] border border-[#00ff41]/30 shadow-[0_0_40px_rgba(0,255,65,0.1)] font-mono overflow-y-auto max-h-[90vh]">
              {/* Corner accents (green) */}
              {['top-0 left-0 border-t-2 border-l-2', 'top-0 right-0 border-t-2 border-r-2',
                'bottom-0 left-0 border-b-2 border-l-2', 'bottom-0 right-0 border-b-2 border-r-2'].map((c, i) => (
                <div key={i} className={`absolute w-3 h-3 border-[#00ff41] ${c}`} />
              ))}

              {/* Scanlines */}
              <div className="absolute inset-0 pointer-events-none opacity-5 bg-scanlines mix-blend-overlay z-0" />

              {/* Header */}
              <div className="relative z-10 px-5 py-3 border-b border-[#00ff41]/20 bg-black/60 flex justify-between items-center">
                <div>
                  <p className="text-[#00ff41]/40 text-[9px] tracking-widest">HIDER NETWORK</p>
                  <p className="text-[#00ff41] font-bold tracking-widest uppercase text-xs mt-0.5">
                    {challenge.id.toUpperCase()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[#00ff41]/40 text-[9px] tracking-widest">CATEGORY</p>
                  <p className="text-white text-xs mt-0.5 tracking-wider">{challenge.category}</p>
                </div>
              </div>

              <div className="relative z-10 p-6">
                {status === 'SUCCESS' ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-6 py-6 text-center"
                  >
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 0.4 }}
                      className="text-4xl"
                    >
                      ⚡
                    </motion.div>

                    <div>
                      <p className="text-[#00ff41]/60 text-[10px] tracking-[0.5em] mb-2">CHALLENGE SOLVED</p>
                      <p className="text-white text-2xl font-bold tracking-wider">ACCESS GRANTED</p>
                    </div>

                    <div className="w-full border border-[#00ff41]/30 bg-[#00ff41]/5 p-5 flex flex-col gap-3">
                      <p className="text-[#00ff41]/60 text-[10px] tracking-widest uppercase">REWARD</p>
                      <p className="text-white text-sm">ELIMINATION TOKEN +1</p>
                      <div className="flex items-center justify-center gap-4 mt-2">
                        <span className="text-[#00ff41]/40 text-sm tracking-widest">TOKENS:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[#00ff41]/40 text-lg">{(newTokens - 1).toString().padStart(2,'0')}</span>
                          <span className="text-[#00ff41]/40 text-sm">→</span>
                          <span
                            ref={tokenRef}
                            className="text-[#00ff41] text-2xl font-bold"
                            style={{ textShadow: '0 0 15px #00ff41' }}
                          >
                            {newTokens.toString().padStart(2,'0')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-[#00ff41]/40 text-[10px] tracking-widest">Returning to dashboard…</p>
                  </motion.div>
                ) : (
                  <div className="flex flex-col gap-5">
                    {/* Title */}
                    <div className="border-l-2 border-[#00ff41] pl-4 flex flex-col gap-1">
                      <h2 className="text-lg font-display text-white">{challenge.title}</h2>
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-bold ${diffColor}`}>{challenge.difficulty}</span>
                        <span className="text-[#00ff41]/40 text-[10px]">{challenge.points} PTS</span>
                      </div>
                    </div>

                    {/* Separator */}
                    <div className="w-full h-px bg-[#00ff41]/10" />

                    {/* Description */}
                    <p ref={descRef} className="text-[#b0b0b0] text-sm whitespace-pre-wrap leading-relaxed">
                      {challenge.description}
                    </p>

                    {/* Hints */}
                    {challenge.hints && challenge.hints.length > 0 && (
                      <div>
                        {!showHint ? (
                          <button
                            onClick={() => setShowHint(true)}
                            className="text-[#00ff41]/40 text-[10px] tracking-widest uppercase hover:text-[#00ff41]/70 transition-colors"
                          >
                            [ REQUEST HINT ]
                          </button>
                        ) : (
                          <AnimatePresence>
                            <motion.div
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="border border-[#00ff41]/20 bg-[#00ff41]/5 p-3 flex flex-col gap-2"
                            >
                              <p className="text-[#00ff41]/50 text-[9px] tracking-widest">HINT {hintIndex + 1}/{challenge.hints.length}</p>
                              <p className="text-[#00ff41] text-sm">{challenge.hints[hintIndex]}</p>
                              {hintIndex < challenge.hints.length - 1 && (
                                <button
                                  onClick={() => setHintIndex((n) => n + 1)}
                                  className="text-[#00ff41]/40 text-[9px] tracking-widest hover:text-[#00ff41]/70 self-start"
                                >
                                  [ NEXT HINT ]
                                </button>
                              )}
                            </motion.div>
                          </AnimatePresence>
                        )}
                      </div>
                    )}

                    <div className="w-full h-px bg-[#00ff41]/10" />

                    {/* Error */}
                    <AnimatePresence>
                      {status === 'ERROR' && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="border border-[#ff3366]/40 bg-[#ff3366]/5 p-3 text-[#ff3366] text-xs uppercase flex items-center gap-2"
                        >
                          <span className="w-1.5 h-1.5 bg-[#ff3366] rounded-full animate-pulse" />
                          ACCESS DENIED — INVALID RESPONSE
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Answer form */}
                    <div className="flex flex-col gap-1">
                      <p className="text-[#00ff41]/50 text-[9px] tracking-[0.4em] uppercase">Your Response</p>
                      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#00ff41]/40">›</span>
                          <input
                            ref={inputRef}
                            type="text"
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            placeholder="ENTER RESPONSE..."
                            disabled={status === 'SUBMITTING'}
                            className="w-full bg-[#0a0a0a] border border-[#00ff41]/20 text-white font-mono text-sm pl-8 pr-4 py-3 focus:outline-none focus:border-[#00ff41]/60 focus:bg-[#00ff41]/3 transition-colors placeholder:text-[#333] uppercase tracking-wider"
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-[#00ff41]/30 text-[10px] tracking-widest">
                            ATTEMPTS: {attempts.toString().padStart(2, '0')}
                          </span>
                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={onClose}
                              className="border border-[#00ff41]/20 text-[#00ff41]/50 font-mono text-xs tracking-widest px-4 py-2 uppercase hover:border-[#00ff41]/40 hover:text-[#00ff41]/80 transition-all"
                            >
                              ABORT
                            </button>
                            <button
                              type="submit"
                              disabled={!answer.trim() || status === 'SUBMITTING'}
                              className="border border-[#00ff41]/50 bg-[#00ff41]/10 text-[#00ff41] font-mono text-xs tracking-widest px-6 py-2 uppercase hover:bg-[#00ff41]/20 hover:shadow-[0_0_15px_rgba(0,255,65,0.2)] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              {status === 'SUBMITTING' ? 'VALIDATING...' : 'SUBMIT'}
                            </button>
                          </div>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
