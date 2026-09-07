import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { GlitchText } from '../components/ui/GlitchText';

export function Eliminated() {
  const navigate = useNavigate();
  const { profile, logout } = useAuthStore();

  // If unauthenticated or not eliminated, redirect appropriately
  useEffect(() => {
    if (!profile) {
      navigate('/', { replace: true });
    } else if (profile.status !== 'ELIMINATED') {
      navigate(profile.role === 'HIDER' ? '/hider' : '/seeker', { replace: true });
    }
  }, [profile, navigate]);

  const handleReturn = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const playerId = profile?.playerId ?? '???';

  return (
    <div className="w-screen h-screen bg-black overflow-hidden flex items-center justify-center font-mono relative">
      {/* Pulsing red background ambient */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.03, 0.08, 0.03] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{ background: 'radial-gradient(circle at center, rgba(255,0,51,0.3) 0%, transparent 70%)' }}
      />

      {/* Grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,0,51,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,0,51,0.04) 1px,transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md px-6 flex flex-col items-center gap-8"
      >
        {/* Header */}
        <div className="text-center">
          <p className="text-[#ff3366]/60 text-[10px] tracking-[0.5em] uppercase mb-4">
            OPENVERSE // SYSTEM ALERT
          </p>

          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <GlitchText
              text="ACCESS DENIED"
              className="text-4xl md:text-5xl font-bold text-[#ff3366] tracking-wider"
              active
            />
          </motion.div>
        </div>

        {/* Main panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="w-full bg-[#080808] border border-[#ff0033]/50 shadow-[0_0_40px_rgba(255,0,51,0.15)] relative"
        >
          {/* Red corner accents */}
          {['top-0 left-0 border-t-2 border-l-2', 'top-0 right-0 border-t-2 border-r-2',
            'bottom-0 left-0 border-b-2 border-l-2', 'bottom-0 right-0 border-b-2 border-r-2'].map((c, i) => (
            <div key={i} className={`absolute w-4 h-4 border-[#ff3366] ${c}`} />
          ))}

          <div className="p-8 flex flex-col items-center gap-6 text-center">
            {/* Icon */}
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-16 h-16 border-2 border-[#ff3366] flex items-center justify-center"
            >
              <span className="text-[#ff3366] text-2xl font-bold">✕</span>
            </motion.div>

            <div className="flex flex-col gap-3">
              <GlitchText
                text="PLAYER ELIMINATED"
                className="text-xl font-bold text-white tracking-widest"
                active
              />
              <p className="text-cyber-muted text-sm">Your game session has ended.</p>
            </div>

            {/* Status box */}
            <div className="w-full border border-[#ff0033]/30 bg-[#ff0033]/5 p-4 flex flex-col gap-2">
              <div className="flex justify-between text-xs">
                <span className="text-cyber-muted">TARGET ID</span>
                <span className="text-white font-bold">{playerId}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-cyber-muted">ROLE</span>
                <span className="text-white font-bold">{profile?.role ?? 'HIDER'}</span>
              </div>
              <div className="h-px bg-[#ff0033]/20 my-1" />
              <div className="flex justify-between items-center">
                <span className="text-cyber-muted text-xs">STATUS</span>
                <span className="bg-[#ff0033]/20 text-[#ff3366] font-bold text-sm px-3 py-0.5 border border-[#ff3366]/40 animate-pulse">
                  ELIMINATED
                </span>
              </div>
            </div>

            <p className="text-cyber-muted text-xs tracking-widest">
              YOU HAVE BEEN REMOVED FROM THE GRID.
            </p>

            <button
              id="eliminated-return"
              onClick={handleReturn}
              className="w-full border border-[#ff3366]/50 text-[#ff3366] font-mono text-sm tracking-[0.3em] py-3 uppercase hover:bg-[#ff3366]/10 hover:border-[#ff3366] transition-all hover:shadow-[0_0_20px_rgba(255,51,102,0.2)]"
            >
              RETURN TO LOGIN
            </button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
