import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GameLayout } from '../components/layout/GameLayout';
import { HiderCTFHUD } from '../components/hider/HiderCTFHUD';
import { ChallengeList } from '../components/hider/ChallengeList';
import { CTFChallengeModal } from '../components/hider/CTFChallengeModal';
import { EliminationPanel } from '../components/ui/EliminationPanel';
import { useAuthStore } from '../store/authStore';
import { useHiderStore } from '../store/hiderStore';
import { subscribeToElimination, subscribeToTokenUpdates } from '../lib/gameService';
import { GlitchText } from '../components/ui/GlitchText';
import type { HiderChallenge } from '../types/game';

export function Hider() {
  const navigate = useNavigate();
  const { profile, updateTokens, updateStatus } = useAuthStore();
  const { load, isLoaded, challenges, gameConfig } = useHiderStore();

  const [selectedChallenge, setSelectedChallenge] = useState<HiderChallenge | null>(null);
  const [timeLeft, setTimeLeft] = useState('--:--');
  const [elimFeedback, setElimFeedback] = useState(false);
  const [isBooting, setIsBooting] = useState(true);
  const [showEliminated, setShowEliminated] = useState(false);

  // Load data
  useEffect(() => {
    if (profile?.id) {
      load(profile.id).then(() => {
        setTimeout(() => setIsBooting(false), 800);
      });
    }
  }, [profile?.id, load]);

  // Subscribe to real-time updates (tokens + elimination)
  useEffect(() => {
    if (!profile?.id) return;

    const unsubTokens = subscribeToTokenUpdates(profile.id, (newCount) => {
      updateTokens(newCount);
    });

    const unsubElim = subscribeToElimination(profile.id, () => {
      updateStatus('ELIMINATED');
      setShowEliminated(true);
    });

    return () => {
      unsubTokens();
      unsubElim();
    };
  }, [profile?.id, updateTokens, updateStatus]);

  // Timer
  useEffect(() => {
    if (!gameConfig?.endTime) return;
    const tick = () => {
      const diff = Math.max(0, Math.floor((gameConfig.endTime! - Date.now()) / 1000));
      const m = Math.floor(diff / 60).toString().padStart(2, '0');
      const s = (diff % 60).toString().padStart(2, '0');
      setTimeLeft(`${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [gameConfig?.endTime]);

  const handleChallengeSolved = () => {
    setSelectedChallenge(null);
  };

  const handleEliminated = () => {
    setElimFeedback(true);
    setTimeout(() => setElimFeedback(false), 3000);
  };

  const handleAcknowledgeElimination = () => {
    navigate('/eliminated', { replace: true });
  };

  if (!profile) return null;

  if (isBooting) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center font-mono text-[#00ffcc] tracking-widest text-sm">
        <div className="flex flex-col items-center gap-4">
          <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
            ESTABLISHING SECURE CONNECTION...
          </motion.div>
          <div className="w-48 h-1 border border-[#00ffcc]/30 overflow-hidden">
            <motion.div
              className="h-full bg-[#00ffcc] shadow-[0_0_10px_#00ffcc]"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 0.8, ease: 'easeInOut' }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <GameLayout className="bg-[#050505]">
      {/* HUD Bar */}
      <HiderCTFHUD timeLeft={timeLeft} />

      <div className="flex flex-col lg:flex-row flex-1 h-[calc(100vh-100px)] overflow-hidden">
        {/* Main Content (Challenges) */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin scrollbar-thumb-cyber-accent/20">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto">
            <div className="mb-6 md:mb-8">
              <GlitchText text="AVAILABLE_CHALLENGES" className="text-xl md:text-2xl font-bold text-cyber-accent tracking-widest font-display mb-2" />
              <p className="text-cyber-muted font-mono text-xs md:text-sm">Solve technical anomalies to earn elimination tokens.</p>
            </div>
            
            {isLoaded && (
              <ChallengeList 
                challenges={challenges} 
                onSelect={(c) => setSelectedChallenge(c)} 
              />
            )}
          </motion.div>
        </div>

        {/* Right Sidebar (Target list) */}
        <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-cyber-accent/10 bg-black/40 flex flex-col">
          <EliminationPanel 
            tokens={profile.eliminationTokens ?? 0}
            onEliminated={handleEliminated}
          />
        </div>
      </div>

      {/* Challenge Modal */}
      <AnimatePresence>
        {selectedChallenge && (
          <CTFChallengeModal
            key={selectedChallenge.id}
            challenge={selectedChallenge}
            onClose={() => setSelectedChallenge(null)}
            onSolved={handleChallengeSolved}
          />
        )}
      </AnimatePresence>

      {/* Elimination Feedback */}
      <AnimatePresence>
        {elimFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-black border border-cyber-warning text-cyber-warning px-8 py-4 font-mono tracking-widest text-lg z-50 shadow-[0_0_20px_rgba(255,51,102,0.4)]"
          >
            TARGET ELIMINATED
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cross-tab Realtime Elimination Overlay for this player */}
      <AnimatePresence>
        {showEliminated && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-6 border-[8px] border-cyber-warning"
          >
            <GlitchText text="SIGNAL LOST" className="text-5xl md:text-7xl font-bold text-cyber-warning mb-6 font-display" active />
            <div className="text-cyber-warning/80 font-mono tracking-widest text-center max-w-lg leading-relaxed text-sm md:text-base">
              YOUR CONNECTION HAS BEEN TERMINATED BY A SEEKER.
              <br /><br />
              YOU HAVE BEEN ELIMINATED FROM THE GRID.
            </div>
            <button
              onClick={handleAcknowledgeElimination}
              className="mt-8 px-8 py-3 border border-cyber-warning text-cyber-warning font-mono tracking-widest hover:bg-cyber-warning/10 transition-colors uppercase text-sm font-bold"
            >
              ACKNOWLEDGE AND EXIT
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </GameLayout>
  );
}
