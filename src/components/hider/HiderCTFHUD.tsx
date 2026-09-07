
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { useHiderStore } from '../../store/hiderStore';
import { GlitchText } from '../ui/GlitchText';

interface HiderCTFHUDProps {
  timeLeft: string;
}

export function HiderCTFHUD({ timeLeft }: HiderCTFHUDProps) {
  const navigate = useNavigate();
  const { profile, logout } = useAuthStore();
  const { challenges } = useHiderStore();

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  if (!profile) return null;

  const total = challenges.length || 1;
  const solved = challenges.filter((c) => c.solved).length;
  const progress = Math.round((solved / total) * 100);

  return (
    <div className="bg-black/80 border-b border-cyber-accent/30 p-4 sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        
        {/* Left: Branding & Status */}
        <div className="flex items-center gap-6">
          <div>
            <GlitchText text="OPENVERSE" className="text-xl font-bold font-display text-cyber-accent tracking-widest" />
            <div className="text-xs font-mono text-cyber-muted tracking-widest">HIDER NETWORK</div>
          </div>
          <div className="h-8 w-[1px] bg-cyber-accent/20 hidden md:block"></div>
          <div className="flex gap-4 font-mono text-xs">
            <div>
              <div className="text-cyber-muted uppercase text-[10px]">STATUS</div>
              <div className="text-cyber-accent font-bold">ACTIVE</div>
            </div>
            <div>
              <div className="text-cyber-muted uppercase text-[10px]">ROLE</div>
              <div className="text-white font-bold">{profile.role}</div>
            </div>
            <div>
              <div className="text-cyber-muted uppercase text-[10px]">PLAYER</div>
              <div className="text-cyber-accent font-bold">{profile.playerId}</div>
            </div>
          </div>
        </div>

        {/* Right: Stats & Logout */}
        <div className="flex flex-col md:flex-row items-end md:items-center gap-6 w-full md:w-auto">
          
          <div className="flex gap-6 font-mono w-full md:w-auto justify-between md:justify-end">
            <div className="text-right">
              <div className="text-cyber-muted uppercase text-[10px] tracking-widest">TIME REMAINING</div>
              <div className="text-xl font-bold text-white">{timeLeft}</div>
            </div>
            <div className="text-right">
              <div className="text-cyber-muted uppercase text-[10px] tracking-widest">TOKENS</div>
              <div className="text-xl font-bold text-cyber-warning">{profile.eliminationTokens ?? 0}</div>
            </div>
            <div className="text-right w-24">
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-cyber-muted uppercase text-[10px] tracking-widest">SOLVED</span>
                <span className="text-cyber-accent font-bold text-xs">{solved}/{total}</span>
              </div>
              <div className="h-1 bg-[#111] border border-[#333] w-full overflow-hidden relative">
                <motion.div
                  className="absolute left-0 top-0 bottom-0 bg-cyber-accent shadow-[0_0_8px_#00ffcc]"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1 }}
                />
              </div>
            </div>
          </div>

          <div className="h-8 w-[1px] bg-cyber-accent/20 hidden md:block"></div>

          <button
            onClick={handleLogout}
            className="px-4 py-2 border border-cyber-accent/20 bg-black/50 text-cyber-accent font-mono text-xs hover:bg-cyber-accent/10 transition-colors uppercase tracking-widest flex items-center gap-2"
          >
            <span>Disconnect</span>
            <span className="opacity-50">[x]</span>
          </button>

        </div>
      </div>
    </div>
  );
}
