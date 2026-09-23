import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Map, LogOut, RefreshCw, Zap } from 'lucide-react';
import { GameLayout } from '../components/layout/GameLayout';
import { HiderHUD } from '../components/hider/HiderHUD';
import { ChallengeCard } from '../components/hider/ChallengeCard';
import { ChallengeTerminalModal } from '../components/hider/ChallengeTerminalModal';
import { useHiderStore } from '../store/hiderStore';
import { useAuthStore } from '../store/authStore';
import type { Challenge } from '../types/game';

export function Hider() {
  const navigate = useNavigate();
  const { profile, logout } = useAuthStore();
  const {
    challenges,
    selectedChallenge,
    setSelectedChallenge,
    filterCategory,
    filterStatus,
    setFilterCategory,
    setFilterStatus,
    init,
  } = useHiderStore();

  const [isBooting, setIsBooting] = useState(true);

  useEffect(() => {
    const unsub = init();
    const timer = setTimeout(() => setIsBooting(false), 500);
    return () => {
      unsub();
      clearTimeout(timer);
    };
  }, [init]);

  if (!profile) return null;

  // Filter challenges based on category and lockout status
  const filteredChallenges = challenges.filter((c) => {
    // 1. Category check
    if (filterCategory !== 'ALL' && c.category !== filterCategory) {
      return false;
    }

    // 2. Status check
    const isSolvedByMe = c.isSolved && c.solvedBy?.uid === profile.id;
    const isClaimedByOther = c.isSolved && !isSolvedByMe;
    const isOpen = !c.isSolved;

    if (filterStatus === 'OPEN' && !isOpen) return false;
    if (filterStatus === 'CLAIMED' && !isClaimedByOther) return false;
    if (filterStatus === 'SOLVED_BY_ME' && !isSolvedByMe) return false;

    return true;
  });

  if (isBooting) {
    return (
      <div className="w-screen h-screen bg-[#02050e] flex items-center justify-center font-mono text-cyber-accent tracking-widest text-xs">
        <div className="flex flex-col items-center gap-4 max-w-sm w-full px-6">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Terminal className="w-5 h-5 text-cyber-accent animate-pulse" />
            <span>CONNECTING TO HIDER PUZZLE MATRIX...</span>
          </div>

          <div className="w-full h-1 bg-white/10 overflow-hidden border border-cyber-accent/30">
            <motion.div
              className="h-full bg-cyber-accent shadow-[0_0_12px_#00ffcc]"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            />
          </div>

          <div className="text-[10px] text-cyber-muted text-center flex flex-col gap-0.5">
            <span>SYNCING REAL-TIME CHALLENGE LOCKOUT CACHE...</span>
            <span>VERIFYING CRYPTOGRAPHIC OPERATOR CREDENTIALS...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <GameLayout className="bg-[#020612] flex flex-col h-screen overflow-hidden">
      {/* 1. TOP COMMAND BAR */}
      <header className="h-14 border-b border-cyber-accent/25 bg-black/85 backdrop-blur-md px-4 flex items-center justify-between z-30 shrink-0 font-mono">
        {/* Left: Branding & Role */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-white font-bold tracking-widest text-sm">
            <div className="w-7 h-7 rounded border border-cyber-accent/50 bg-cyber-accent/10 flex items-center justify-center">
              <Terminal className="w-4 h-4 text-cyber-accent" />
            </div>
            <div>
              <span className="text-white">OPENVERSE</span>{' '}
              <span className="text-cyber-accent">// HIDER ANOMALIES</span>
            </div>
          </div>

          <span className="hidden md:inline-block text-[10px] px-2 py-0.5 rounded bg-cyber-accent/15 border border-cyber-accent/40 text-cyber-accent font-bold">
            GRID DECK
          </span>
        </div>

        {/* Center: Navigation Switcher between Radar and Challenges */}
        <nav className="flex items-center gap-1 bg-black/60 p-1 rounded border border-white/10 text-xs">
          <button
            onClick={() => navigate('/surveillance')}
            className="flex items-center gap-1.5 px-3 py-1 rounded text-white/60 hover:text-white transition-colors"
          >
            <Map className="w-3.5 h-3.5 text-cyber-accent" />
            <span className="hidden sm:inline">SURVEILLANCE RADAR</span>
          </button>

          <button
            onClick={() => navigate('/hider')}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-cyber-accent/20 border border-cyber-accent/40 text-cyber-accent font-bold"
          >
            <Terminal className="w-3.5 h-3.5 text-cyber-accent" />
            <span className="hidden sm:inline">HIDER CHALLENGES</span>
          </button>
        </nav>

        {/* Right: Operator & Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-[11px] text-white font-bold tracking-wider">
              {profile?.username ?? 'HIDER'}
            </span>
            <div className="flex items-center gap-1 text-[9px] text-[#ffd700] justify-end">
              <Zap className="w-2.5 h-2.5 fill-[#ffd700]" />
              <span>{profile?.eliminationTokens ?? 0} TOKENS</span>
            </div>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-1.5 text-xs font-mono text-cyber-accent hover:bg-cyber-accent/15 border border-cyber-accent/40 px-2.5 py-1.5 rounded transition-colors"
            title="Refresh Feed"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyber-accent" />
            <span className="hidden sm:inline">SYNC</span>
          </button>

          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-xs font-mono text-[#ff0033] hover:bg-[#ff0033]/15 border border-[#ff0033]/40 px-2.5 py-1.5 rounded transition-colors"
            title="Log Out"
          >
            <LogOut className="w-3.5 h-3.5 text-[#ff0033]" />
            <span className="hidden sm:inline">EXIT</span>
          </button>
        </div>
      </header>

      {/* 2. HUD SUMMARY & FILTER CONTROLS */}
      <HiderHUD
        challenges={challenges}
        currentUserId={profile.id}
        tokens={profile.eliminationTokens ?? 0}
        filterCategory={filterCategory}
        filterStatus={filterStatus}
        onSelectCategory={setFilterCategory}
        onSelectStatus={setFilterStatus}
      />

      {/* 3. MAIN CHALLENGES SCROLLABLE GRID */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin scrollbar-thumb-cyber-accent/20">
        <div className="max-w-7xl mx-auto">
          {filteredChallenges.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredChallenges.map((challenge) => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  currentUserId={profile.id}
                  onSelect={(ch: Challenge) => setSelectedChallenge(ch)}
                />
              ))}
            </div>
          ) : (
            <div className="min-h-[300px] flex flex-col items-center justify-center text-center p-8 border border-white/10 rounded bg-black/40 font-mono">
              <Terminal className="w-8 h-8 text-cyber-accent/50 mb-3" />
              <p className="text-white/80 text-sm font-bold tracking-wider mb-1">
                NO ANOMALIES MATCH CRITERIA
              </p>
              <p className="text-xs text-white/50 mb-4 max-w-sm">
                No challenges found under the current category and status filters.
              </p>
              <button
                onClick={() => {
                  setFilterCategory('ALL');
                  setFilterStatus('ALL');
                }}
                className="px-4 py-1.5 text-xs rounded border border-cyber-accent/40 text-cyber-accent hover:bg-cyber-accent/10 transition-colors uppercase"
              >
                RESET FILTERS
              </button>
            </div>
          )}
        </div>
      </main>

      {/* 4. MODAL FOR SOLVING CHALLENGE */}
      <AnimatePresence>
        {selectedChallenge && (
          <ChallengeTerminalModal
            key={selectedChallenge.id}
            challenge={selectedChallenge}
            profile={profile}
            onClose={() => setSelectedChallenge(null)}
          />
        )}
      </AnimatePresence>
    </GameLayout>
  );
}
