import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSurveillanceStore } from '../../store/surveillanceStore';
import { Radio, Clock, Send, CheckCircle2, History, ShieldCheck, Lock, Globe2 } from 'lucide-react';
import { isServerTimeSynced } from '../../lib/serverTime';

export function SharePositionsControl() {
  const {
    seekers,
    broadcastCooldownSec,
    tickCooldown,
    broadcastPositions,
    lastBroadcast,
    broadcastHistory,
  } = useSurveillanceStore();

  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [recentBroadcastSuccess, setRecentBroadcastSuccess] = useState(false);

  // 1-second interval to synchronize and re-evaluate cooldown against server time
  useEffect(() => {
    tickCooldown();
    const timer = setInterval(() => {
      tickCooldown();
    }, 1000);
    return () => clearInterval(timer);
  }, [tickCooldown]);

  // Format MM:SS
  const minutes = Math.floor(broadcastCooldownSec / 60).toString().padStart(2, '0');
  const seconds = (broadcastCooldownSec % 60).toString().padStart(2, '0');
  const isCooldownActive = broadcastCooldownSec > 0;

  const handleBroadcast = async () => {
    if (isCooldownActive) return;

    setIsBroadcasting(true);
    try {
      const res = await broadcastPositions('Surveillance Team');
      if (res.success) {
        setRecentBroadcastSuccess(true);
        setTimeout(() => setRecentBroadcastSuccess(false), 4500);
      }
    } finally {
      setIsBroadcasting(false);
    }
  };

  return (
    <div className="relative bg-[#060c18] border border-cyber-accent/30 p-3.5 shadow-[0_0_25px_rgba(0,255,204,0.06)] rounded-sm font-mono">
      {/* Top Banner / Label */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyber-accent/20 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Radio className="w-4 h-4 text-cyber-accent" />
          </div>
          <span className="text-xs font-bold text-white tracking-widest uppercase">
            Hider Tactical Transmission
          </span>
          <span className="text-[10px] text-cyber-accent bg-cyber-accent/10 border border-cyber-accent/30 px-2 py-0.5 rounded font-bold">
            10-MIN CYCLE
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[9px] text-[#ffd700] bg-[#ffd700]/10 border border-[#ffd700]/30 px-1.5 py-0.5 rounded">
            <Globe2 className="w-2.5 h-2.5 text-[#ffd700]" />
            <span>SERVER TIME AUTH</span>
          </span>
        </div>

        <button
          onClick={() => setShowHistoryModal(true)}
          className="text-[10px] text-cyber-muted hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <History className="w-3 h-3" />
          <span>LOGS ({broadcastHistory.length})</span>
        </button>
      </div>

      {/* Main Broadcast Trigger Row */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* 10-Minute Countdown Display */}
        <div className="w-full sm:w-auto bg-black/60 border border-white/10 px-3.5 py-2 rounded flex items-center justify-between sm:justify-start gap-3">
          <div className="flex items-center gap-2 text-cyber-muted text-xs">
            <Clock className="w-3.5 h-3.5 text-cyber-accent" />
            <span className="text-[11px] tracking-wider">NEXT CYCLE:</span>
          </div>
          <div
            className={`text-lg font-bold tracking-widest font-mono ${
              isCooldownActive ? 'text-[#ffea00]' : 'text-cyber-success'
            }`}
          >
            {minutes}:{seconds}
          </div>
        </div>

        {/* Tactical Action Button (Cannot be clicked until 10 minutes have passed) */}
        <button
          onClick={handleBroadcast}
          disabled={isCooldownActive || isBroadcasting}
          className={`relative flex-1 w-full sm:w-auto py-2.5 px-4 font-mono text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2.5 transition-all overflow-hidden border ${
            !isCooldownActive && !isBroadcasting
              ? 'bg-cyber-accent text-black border-cyber-accent hover:shadow-[0_0_25px_rgba(0,255,204,0.6)] cursor-pointer animate-pulse'
              : 'bg-white/5 text-cyber-muted/60 border-white/10 cursor-not-allowed opacity-60'
          }`}
          title={
            isCooldownActive
              ? `Transmission locked: ${minutes}:${seconds} remaining. Authorized only once every 10 minutes.`
              : 'Click to transmit seeker coordinates to hiders'
          }
        >
          {isBroadcasting ? (
            <>
              <Send className="w-3.5 h-3.5 animate-bounce" />
              <span>TRANSMITTING POSITIONS...</span>
            </>
          ) : isCooldownActive ? (
            <>
              <Lock className="w-3.5 h-3.5 text-cyber-muted/80" />
              <span>TRANSMISSION LOCKED ({minutes}:{seconds} COOLDOWN)</span>
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5 text-black" />
              <span>SHARE SEEKER POSITIONS TO HIDERS (READY)</span>
            </>
          )}

          {/* Scanner sweep line only active when button is ready to fire */}
          {!isCooldownActive && !isBroadcasting && (
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
          )}
        </button>
      </div>

      {/* Status Details Bar */}
      <div className="mt-2.5 flex flex-wrap items-center justify-between text-[10px] text-cyber-muted gap-2 pt-2 border-t border-white/5">
        <div className="flex items-center gap-2">
          <span>Active Tracked Seekers:</span>
          <span className="text-white font-bold">{seekers.length} Nodes</span>
          <span className="text-white/20">|</span>
          <span className="text-[9px] text-cyber-accent">
            {isServerTimeSynced() ? '● Authoritative Server Clock' : '○ Synchronizing Server Time...'}
          </span>
        </div>

        {lastBroadcast && (
          <div className="flex items-center gap-1.5 text-cyber-success">
            <ShieldCheck className="w-3 h-3" />
            <span>
              Last shared:{' '}
              {new Date(lastBroadcast.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}{' '}
              ({lastBroadcast.seekerPositions.length} positions)
            </span>
          </div>
        )}
      </div>

      {/* Success Notification Alert Banner */}
      <AnimatePresence>
        {recentBroadcastSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -6, height: 0 }}
            className="mt-3 bg-cyber-success/10 border border-cyber-success/50 text-cyber-success px-3 py-2 text-xs flex items-center justify-between rounded"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyber-success animate-pulse" />
              <span className="tracking-wide">
                SUCCESS: {seekers.length} Seeker locations transmitted to all active Hiders!
              </span>
            </div>
            <span className="text-[10px] text-white/50">Next window in 10:00</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Broadcast History Modal */}
      <AnimatePresence>
        {showHistoryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-[#080d1a] border border-cyber-accent/40 w-full max-w-xl p-5 shadow-[0_0_30px_rgba(0,255,204,0.15)] rounded-sm flex flex-col max-h-[80vh]"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-cyber-accent" />
                  <h3 className="text-white font-bold text-sm tracking-wider uppercase">
                    10-Minute Broadcast Transmission Log
                  </h3>
                </div>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="text-cyber-muted hover:text-white text-xs px-2 py-1 border border-white/10"
                >
                  ✕ CLOSE
                </button>
              </div>

              <div className="overflow-y-auto flex-1 pr-1 space-y-2">
                {broadcastHistory.length === 0 ? (
                  <div className="text-center py-8 text-cyber-muted text-xs">
                    No transmission broadcasts recorded yet. Press the transmission button when unlocked to push seeker positions to hiders.
                  </div>
                ) : (
                  broadcastHistory.map((bc, idx) => (
                    <div
                      key={bc.id}
                      className="bg-black/50 border border-white/10 p-3 rounded flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-cyber-accent font-bold">
                          CYCLE #{broadcastHistory.length - idx} // {bc.operator}
                        </span>
                        <span className="text-cyber-muted text-[11px]">
                          {new Date(bc.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-[11px] text-white/80">
                        Transmitted positions for {bc.seekerPositions.length} active seekers.
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {bc.seekerPositions.map((pos) => (
                          <span
                            key={pos.playerId}
                            className="bg-white/5 border border-white/10 px-1.5 py-0.5 text-[9px] text-[#ffea00]"
                          >
                            {pos.playerId} ({pos.zoneName})
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex justify-end">
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="bg-cyber-accent/15 border border-cyber-accent/40 text-cyber-accent px-4 py-1.5 text-xs hover:bg-cyber-accent/30 transition-colors uppercase"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
