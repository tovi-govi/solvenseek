import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GameLayout } from '../components/layout/GameLayout';
import { SurveillanceMap } from '../components/surveillance/SurveillanceMap';
import { SharePositionsControl } from '../components/surveillance/SharePositionsControl';
import { SeekerTelemetryDrawer } from '../components/surveillance/SeekerTelemetryDrawer';
import { useSurveillanceStore } from '../store/surveillanceStore';
import { useAuthStore } from '../store/authStore';
import {
  Map,
  RefreshCw,
  Smartphone,
  QrCode,
  LogOut,
  Terminal,
} from 'lucide-react';

export function Surveillance() {
  const navigate = useNavigate();
  const { profile, logout } = useAuthStore();
  const { load, seekers } = useSurveillanceStore();

  const [isBooting, setIsBooting] = useState(true);

  useEffect(() => {
    load().then(() => {
      setTimeout(() => setIsBooting(false), 600);
    });
  }, [load]);

  const handleResync = async () => {
    setIsBooting(true);
    await load();
    setTimeout(() => setIsBooting(false), 500);
  };

  if (isBooting) {
    return (
      <div className="w-screen h-screen bg-[#02050e] flex items-center justify-center font-mono text-cyber-accent tracking-widest text-xs">
        <div className="flex flex-col items-center gap-4 max-w-sm w-full px-6">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Map className="w-5 h-5 text-cyber-accent" />
            <span>CONNECTING TO SURVEILLANCE FEED...</span>
          </div>

          <div className="w-full h-1 bg-white/10 overflow-hidden border border-cyber-accent/30">
            <motion.div
              className="h-full bg-cyber-accent shadow-[0_0_12px_#00ffcc]"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
            />
          </div>

          <div className="text-[10px] text-cyber-muted text-center flex flex-col gap-0.5">
            <span>CONNECTING TO CAMPUS SENSOR NODES [PORT 8080]</span>
            <span>INGESTING REACT NATIVE SEEKER GPS STREAMS...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <GameLayout className="bg-[#020612] flex flex-col h-screen overflow-hidden">
      {/* 1. TOP COMMAND BAR */}
      <header className="h-14 border-b border-cyber-accent/25 bg-black/85 backdrop-blur-md px-4 flex items-center justify-between z-30 shrink-0 font-mono">
        {/* Left: Branding & Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-white font-bold tracking-widest text-sm">
            <div className="w-7 h-7 rounded border border-cyber-accent/50 bg-cyber-accent/10 flex items-center justify-center">
              <Map className="w-4 h-4 text-cyber-accent" />
            </div>
            <div>
              <span className="text-white">OPENVERSE</span>{' '}
              <span className="text-cyber-accent">// SURVEILLANCE HQ</span>
            </div>
          </div>

          <span className="hidden xl:inline-block text-[10px] px-2 py-0.5 rounded bg-cyber-success/15 border border-cyber-success/40 text-cyber-success font-bold">
            GRID ACTIVE
          </span>
        </div>

        {/* Center: Navigation Switcher between Radar and Challenges */}
        <nav className="flex items-center gap-1 bg-black/60 p-1 rounded border border-white/10 text-xs">
          <button
            onClick={() => navigate('/surveillance')}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-cyber-accent/20 border border-cyber-accent/40 text-cyber-accent font-bold"
          >
            <Map className="w-3.5 h-3.5 text-cyber-accent" />
            <span className="hidden sm:inline">SURVEILLANCE RADAR</span>
          </button>

          <button
            onClick={() => navigate('/hider')}
            className="flex items-center gap-1.5 px-3 py-1 rounded text-white/60 hover:text-white transition-colors"
          >
            <Terminal className="w-3.5 h-3.5 text-cyber-accent" />
            <span className="hidden sm:inline">HIDER CHALLENGES</span>
          </button>
        </nav>

        {/* Center: Live Stats Quick Ticker */}
        <div className="hidden lg:flex items-center gap-5 text-xs text-cyber-muted">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#ffea00]" />
            <span>SEEKERS TRACKED:</span>
            <span className="text-white font-bold">{seekers.length} ONLINE</span>
          </div>
          <span className="text-white/20">|</span>
          <div className="flex items-center gap-1.5">
            <QrCode className="w-3.5 h-3.5 text-[#ffd700]" />
            <span>CAMPUS ARTIFACTS:</span>
            <span className="text-[#ffd700] font-bold">
              {seekers.reduce((sum, s) => sum + (s.qrScannedCount ?? 0), 0)} / 15 CLAIMED
            </span>
          </div>
          <span className="text-white/20">|</span>
          <div className="flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-cyber-accent" />
            <span>SEEKER APP STREAM:</span>
            <span className="text-cyber-success font-bold">REACT NATIVE INGEST ACTIVE</span>
          </div>
        </div>

        {/* Right: Operator & Resync */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-[11px] text-white font-bold tracking-wider">
              {profile?.username ?? 'TEAM OPERATOR'}
            </span>
            <span className="text-[9px] text-cyber-accent">
              {profile?.playerId ?? 'HQ-SURV'}
            </span>
          </div>

          <button
            onClick={handleResync}
            className="flex items-center gap-1.5 text-xs font-mono text-cyber-accent hover:bg-cyber-accent/15 border border-cyber-accent/40 px-2.5 py-1.5 rounded transition-colors"
            title="Re-sync Radar Feed"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyber-accent" />
            <span className="hidden sm:inline">RE-SYNC GRID</span>
          </button>

          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-xs font-mono text-[#ff0033] hover:bg-[#ff0033]/15 border border-[#ff0033]/40 px-2.5 py-1.5 rounded transition-colors"
            title="Log Out of Surveillance Node"
          >
            <LogOut className="w-3.5 h-3.5 text-[#ff0033]" />
            <span className="hidden sm:inline">DISCONNECT</span>
          </button>
        </div>
      </header>

      {/* 2. SUB-BAR: 10-MINUTE SHARE SEEKER POSITIONS TO HIDERS */}
      <div className="p-2 sm:px-4 shrink-0 bg-[#030816]/90 border-b border-cyber-accent/15 z-20">
        <SharePositionsControl />
      </div>

      {/* 3. MAIN DASHBOARD SPLIT AREA */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-2 sm:p-3 gap-3">
        {/* Left / Center: Large Tactical Campus Map */}
        <div className="flex-1 h-full min-h-[380px] rounded-sm overflow-hidden flex flex-col">
          <SurveillanceMap />
        </div>

        {/* Right: Seeker Telemetry & Mobile Ingest Panel */}
        <div className="w-full lg:w-[400px] h-[45vh] lg:h-full flex flex-col shrink-0">
          <div className="flex-1 overflow-hidden">
            <SeekerTelemetryDrawer />
          </div>
        </div>
      </div>
    </GameLayout>
  );
}
