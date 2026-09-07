import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { useSeekerStore } from '../../store/seekerStore';
import { TerminalPanel } from '../ui/TerminalPanel';

export function SeekerMapHUD() {
  const navigate = useNavigate();
  const { profile, logout } = useAuthStore();
  const { challenges, gameConfig } = useSeekerStore();

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };
  
  const [timeLeft, setTimeLeft] = useState('--:--');

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

  if (!profile) return null;

  const total = challenges.length || 1;
  const solved = challenges.filter((c) => c.solved).length;
  const pct = Math.round((solved / total) * 100);

  return (
    <div className="absolute top-4 left-4 z-20 flex flex-col gap-4 w-64 pointer-events-none">
      
      {/* Player Info Panel */}
      <div className="pointer-events-auto">
        <TerminalPanel title="SEEKER_HUD" className="bg-black/80 backdrop-blur-md border-[#00ff41]/30">
          <div className="flex flex-col gap-2 font-mono text-xs">
            {[
              { k: 'PLAYER', v: profile.playerId, accent: true },
              { k: 'ROLE',   v: profile.role },
            ].map(({ k, v, accent }) => (
              <div key={k} className="flex justify-between items-center border-b border-[#00ff41]/20 pb-1 last:border-0 last:pb-0">
                <span className="text-cyber-muted">{k}:</span>
                <span className={accent ? 'text-[#00ff41] font-bold' : 'text-white font-bold'}>{v}</span>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <div className="text-[10px] text-cyber-muted uppercase tracking-widest font-display">Time</div>
                <div className="font-mono text-[#00ff41]">{timeLeft}</div>
              </div>
              <div>
                <div className="text-[10px] text-cyber-muted uppercase tracking-widest font-display">Tokens</div>
                <div className="font-mono text-[#00ff41]">{profile?.eliminationTokens ?? 0}</div>
              </div>
            </div>
          </div>
        </TerminalPanel>
      </div>

      {/* Progress Panel */}
      <div className="pointer-events-auto">
        <TerminalPanel title="MAP_PROGRESS" className="bg-black/80 backdrop-blur-md border-[#00ff41]/30">
          <div className="flex flex-col gap-3 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-cyber-muted">AREAS UNLOCKED</span>
              <span className="text-[#00ff41] font-bold">
                {solved.toString().padStart(2, '0')} / {total.toString().padStart(2, '0')}
              </span>
            </div>
            {/* progress bar */}
            <div className="relative w-full bg-[#111] h-1.5 border border-[#333] mt-1 overflow-hidden">
              <motion.div
                className="absolute left-0 top-0 bottom-0 bg-[#00ff41] shadow-[0_0_10px_#00ff41]"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </div>
        </TerminalPanel>
      </div>

      {/* Logout Button */}
      <div className="pointer-events-auto mt-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 justify-between px-3 py-2 border border-[#00ff41]/20 bg-black/50 text-[#00ff41] font-mono text-xs hover:bg-[#00ff41]/10 transition-colors"
        >
          <span>LOGOUT_PROTOCOL</span>
          <span className="opacity-50">[x]</span>
        </button>
      </div>
    </div>
  );
}
