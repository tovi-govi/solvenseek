import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { useAuthStore } from '../../store/authStore';
import { useSeekerStore } from '../../store/seekerStore';

interface MapChallengeModalProps {
  challengeId: string | null;
  onClose: () => void;
}

export function MapChallengeModal({ challengeId, onClose }: MapChallengeModalProps) {
  const { profile } = useAuthStore();
  const { challenges, zones, submitAnswer } = useSeekerStore();
  const [answer, setAnswer] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'SUBMITTING' | 'ERROR' | 'SUCCESS'>('IDLE');
  const [attempts, setAttempts] = useState(0);
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  const challenge = challenges.find((c) => c.id === challengeId);
  const location  = zones.find((z) => z.id === challenge?.locationId);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 200);
    const modalEl = modalRef.current;
    return () => {
      clearTimeout(timer);
      if (modalEl) gsap.killTweensOf(modalEl);
    };
  }, [challengeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeId || !profile || status === 'SUBMITTING' || status === 'SUCCESS') return;

    setStatus('SUBMITTING');
    setAttempts((n) => n + 1);

    const result = await submitAnswer(profile.id, challengeId, answer);

    if (result.success) {
      setStatus('SUCCESS');
      
      // Flash modal
      if (modalRef.current) {
        gsap.to(modalRef.current, {
          borderColor: '#00ff41',
          boxShadow: '0 0 40px #00ff41, inset 0 0 20px #00ff41',
          duration: 0.3,
          yoyo: true,
          repeat: 3,
          onComplete: () => {
            setTimeout(onClose, 1000);
          }
        });
      }
    } else {
      setStatus('ERROR');
      
      // Shake animation for error
      if (modalRef.current) {
        gsap.fromTo(modalRef.current, 
          { x: -10 },
          { x: 10, duration: 0.1, yoyo: true, repeat: 5, clearProps: 'x' }
        );
      }
      
      setTimeout(() => setStatus('IDLE'), 2000);
    }
  };

  if (!challenge || !location) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <motion.div
        ref={modalRef}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="w-full max-w-2xl bg-black border border-[#00ff41]/40 shadow-[0_0_20px_rgba(0,255,65,0.15)] overflow-hidden flex flex-col max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="bg-[#00ff41]/10 border-b border-[#00ff41]/30 p-4 flex justify-between items-center relative overflow-hidden">
          {/* Scanning line effect */}
          <motion.div 
            className="absolute top-0 bottom-0 w-8 bg-gradient-to-r from-transparent via-[#00ff41]/20 to-transparent skew-x-12"
            animate={{ x: ['-100%', '800%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />

          <div>
            <div className="text-[10px] text-cyber-muted font-mono tracking-widest flex items-center gap-2">
              <span>RESTRICTED SIGNAL</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#00ff41] animate-pulse"></span>
            </div>
            <h2 className="text-xl font-bold text-[#00ff41] font-display tracking-widest uppercase">
              {location.name}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="text-cyber-muted hover:text-white transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="p-6 flex-1 flex flex-col">
          {/* Challenge Info */}
          <div className="mb-6 border-l-2 border-[#00ff41]/50 pl-4">
            <div className="text-xs text-[#00ff41] font-mono mb-1">CHALLENGE: {challenge.id.split('-').pop()}</div>
            <h3 className="text-2xl text-white font-display mb-4">{challenge.title}</h3>
            
            <div className="bg-[#111] p-4 border border-[#333] font-mono text-sm text-gray-300 whitespace-pre-wrap font-mono">
              {challenge.description}
            </div>
            
            <div className="mt-4 flex gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-cyber-muted tracking-widest font-mono">DIFFICULTY</span>
                <span className={`text-[10px] px-2 py-0.5 font-bold tracking-widest border font-mono ${
                  challenge.difficulty === 'HARD' ? 'text-cyber-warning border-cyber-warning' :
                  challenge.difficulty === 'MEDIUM' ? 'text-yellow-400 border-yellow-400' :
                  'text-[#00ff41] border-[#00ff41]'
                }`}>
                  {challenge.difficulty}
                </span>
              </div>
            </div>
          </div>

          {/* Answer Form */}
          <form onSubmit={handleSubmit} className="mt-auto">
            <div className="flex flex-col gap-2 relative">
              <label className="text-[10px] text-cyber-muted tracking-widest font-mono">OVERRIDE CODE</label>
              <div className="flex">
                <div className="bg-[#111] border border-[#00ff41]/30 border-r-0 px-3 flex items-center text-[#00ff41]">
                  &gt;
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  disabled={status === 'SUCCESS'}
                  className="flex-1 bg-[#050505] border border-[#00ff41]/30 p-3 text-[#00ff41] font-mono focus:outline-none focus:border-[#00ff41] transition-colors"
                  placeholder="ENTER ANSWER..."
                  autoComplete="off"
                  spellCheck="false"
                />
                <button
                  type="submit"
                  disabled={!answer.trim() || status === 'SUBMITTING' || status === 'SUCCESS'}
                  className="bg-[#00ff41]/10 border border-[#00ff41]/30 border-l-0 px-6 font-mono text-[#00ff41] hover:bg-[#00ff41]/20 disabled:opacity-50 transition-colors"
                >
                  {status === 'SUBMITTING' ? 'VERIFYING' : 'SUBMIT'}
                </button>
              </div>

              {/* Status messages */}
              <AnimatePresence>
                {status === 'ERROR' && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0 }}
                    className="absolute -bottom-6 left-0 text-cyber-warning text-xs font-mono flex items-center gap-2"
                  >
                    <span>⚠️ INCORRECT OVERRIDE CODE</span>
                    <span className="text-cyber-muted">({attempts} ATTEMPTS)</span>
                  </motion.div>
                )}
                {status === 'SUCCESS' && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="absolute -bottom-6 left-0 text-[#00ff41] text-xs font-mono font-bold"
                  >
                    ✓ ACCESS GRANTED. AREA UNLOCKED.
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}
