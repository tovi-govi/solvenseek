import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GameLayout } from '../components/layout/GameLayout';
import { TacticalMap } from '../components/seeker/TacticalMap';
import { SeekerMapHUD } from '../components/seeker/SeekerMapHUD';
import { MapChallengeModal } from '../components/seeker/MapChallengeModal';
import { EliminationPanel } from '../components/ui/EliminationPanel';
import { useAuthStore } from '../store/authStore';
import { useSeekerStore } from '../store/seekerStore';
import { subscribeToElimination, subscribeToTokenUpdates } from '../lib/gameService';
import { GlitchText } from '../components/ui/GlitchText';

export function Seeker() {
  const navigate = useNavigate();
  const { profile, updateTokens, updateStatus } = useAuthStore();
  const { load, isLoaded } = useSeekerStore();
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [showEliminated, setShowEliminated] = useState(false);
  const [elimFeedback, setElimFeedback] = useState(false);

  // Load game data
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

  const handleChallengeSelect = useCallback((challengeId: string) => {
    setSelectedChallengeId(challengeId);
  }, []);

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
      <div className="w-screen h-screen bg-black flex items-center justify-center font-mono text-[#00ff41] tracking-widest text-sm">
        <div className="flex flex-col items-center gap-4">
          <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
            INITIALIZING TACTICAL GRID...
          </motion.div>
          <div className="w-48 h-1 border border-[#00ff41]/30 overflow-hidden">
            <motion.div
              className="h-full bg-[#00ff41] shadow-[0_0_10px_#00ff41]"
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
    <GameLayout className="bg-[#020502] flex flex-col lg:flex-row overflow-hidden">
      {/* Main Map Area */}
      <div className="flex-1 relative h-[65vh] lg:h-screen">
        <SeekerMapHUD />
        {isLoaded && (
          <TacticalMap 
            onChallengeSelect={handleChallengeSelect} 
            selectedChallengeId={selectedChallengeId} 
          />
        )}
      </div>

      {/* Right Sidebar (Target list) */}
      <div className="w-full lg:w-80 h-[35vh] lg:h-screen border-t lg:border-t-0 lg:border-l border-[#00ff41]/20 bg-black/80 flex flex-col z-20">
        <EliminationPanel 
          tokens={profile.eliminationTokens ?? 0}
          onEliminated={handleEliminated}
          attackerRole="SEEKER"
          accentColor="[#00ff41]"
          accentHex="#00ff41"
        />
      </div>

      {/* Challenge Modal Overlay */}
      <AnimatePresence>
        {selectedChallengeId && (
          <MapChallengeModal
            key={selectedChallengeId}
            challengeId={selectedChallengeId}
            onClose={() => setSelectedChallengeId(null)}
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
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-black border border-[#ff3366] text-[#ff3366] px-8 py-4 font-mono tracking-widest text-lg z-50 shadow-[0_0_20px_rgba(255,51,102,0.4)]"
          >
            TARGET ELIMINATED
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cross-tab Realtime Elimination Overlay */}
      <AnimatePresence>
        {showEliminated && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-6 border-[8px] border-[#ff3366]"
          >
            <GlitchText text="SIGNAL LOST" className="text-5xl md:text-7xl font-bold text-[#ff3366] mb-6 font-display" active />
            <div className="text-[#ff3366]/80 font-mono tracking-widest text-center max-w-lg leading-relaxed text-sm md:text-base">
              YOUR CONNECTION HAS BEEN TERMINATED.
              <br /><br />
              YOU HAVE BEEN ELIMINATED FROM THE GRID.
            </div>
            <button
              onClick={handleAcknowledgeElimination}
              className="mt-8 px-8 py-3 border border-[#ff3366] text-[#ff3366] font-mono tracking-widest hover:bg-[#ff3366]/10 transition-colors uppercase text-sm font-bold"
            >
              ACKNOWLEDGE AND EXIT
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </GameLayout>
  );
}
