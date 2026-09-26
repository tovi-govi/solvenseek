import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSurveillanceStore } from '../../store/surveillanceStore';
import type { SeekerTelemetry } from '../../types/game';
import {
  Smartphone,
  Wifi,
  QrCode,
  MapPin,
  X,
  Plus,
  Trash2,
  Radio,
  CheckCircle,
} from 'lucide-react';

import { IIITK_FACILITIES, latLngToGrid } from '../../lib/iiitkCampusData';

interface SeekerTelemetryDrawerProps {
  onClose?: () => void;
}

export function SeekerTelemetryDrawer({ onClose }: SeekerTelemetryDrawerProps) {
  const {
    seekers,
    selectedSeekerId,
    setSelectedSeeker,
    addSeekerNode,
    deleteSeekerNode,
  } = useSurveillanceStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // New Seeker Form fields
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeId, setNewNodeId] = useState('');
  const [newZone, setNewZone] = useState<string>('academic_1');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedSeeker = seekers.find((s) => s.id === selectedSeekerId) ?? seekers[0];
  const totalTeamArtifacts = seekers.reduce((sum, s) => sum + (s.qrScannedCount ?? 0), 0);
  const remainingArtifacts = Math.max(0, 15 - totalTeamArtifacts);
  const isOnline = (seeker: SeekerTelemetry) => {
    const fiveMinutesMs = 5 * 60 * 1000;
    return seeker.active && (Date.now() - seeker.lastPing < fiveMinutesMs);
  };

  const handleAddSeeker = async (e: FormEvent) => {
    e.preventDefault();
    if (!newNodeName.trim() || !newNodeId.trim()) return;

    setIsSubmitting(true);

    const facility = IIITK_FACILITIES.find((f) => f.key === newZone) || IIITK_FACILITIES[0];
    const [lat, lon] = facility.center;
    const { x, y } = latLngToGrid(lat, lon);

    const newSeeker: SeekerTelemetry = {
      id: `seeker-${Date.now()}`,
      uid: `u_${Date.now()}`,
      playerId: newNodeId.trim().toUpperCase(),
      name: newNodeName.trim(),
      teamId: 'alpha',
      active: true,
      status: 'ACTIVE',
      zoneId: facility.key,
      zoneName: facility.name,
      x,
      y,
      lat,
      lon,
      battery: 100,
      signal: 'STRONG',
      speedKmh: 0,
      qrScannedCount: 0,
      lastPing: Date.now(),
    };

    try {
      await addSeekerNode(newSeeker);
      setSelectedSeeker(newSeeker.id);
      setShowAddModal(false);
      setNewNodeName('');
      setNewNodeId('');
      setFeedback(`Node ${newSeeker.playerId} provisioned to Firestore successfully!`);
      setTimeout(() => setFeedback(null), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSeeker = async (seekerId: string, playerId: string) => {
    if (window.confirm(`Decommission Seeker Node ${playerId} from active surveillance?`)) {
      await deleteSeekerNode(seekerId);
      setFeedback(`Node ${playerId} decommissioned.`);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  return (
    <div className="bg-[#050914] border border-cyber-accent/30 rounded-sm p-4 font-mono flex flex-col h-full overflow-hidden text-xs">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-cyber-accent" />
          <span className="font-bold text-white tracking-wider uppercase text-sm">
            Seeker Ingest & Telemetry
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-cyber-success bg-cyber-success/10 border border-cyber-success/30 px-2 py-0.5 rounded flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyber-success animate-pulse" />
            FIRESTORE STREAM ACTIVE
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-cyber-muted hover:text-white border border-white/10 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Global Campus Artifacts Progress Pool (Real Data Derived from Firestore) */}
      <div className="bg-[#030914] border border-[#ffd700]/30 p-2.5 rounded text-[11px] space-y-1.5 shadow-[0_0_12px_rgba(255,215,0,0.06)] mb-3">
        <div className="flex items-center justify-between text-[10px] uppercase font-bold">
          <span className="flex items-center gap-1.5 text-[#ffd700]">
            <QrCode className="w-3.5 h-3.5 text-[#ffd700]" />
            Campus Artifact Pool
          </span>
          <span className="text-white font-mono">
            <span className="text-[#ffd700] text-xs font-bold">{totalTeamArtifacts}</span> / 15 CLAIMED
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-cyber-accent via-[#ffd700] to-[#ffd700] h-full transition-all duration-300"
            style={{ width: `${(totalTeamArtifacts / 15) * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[9px] text-cyber-muted pt-0.5">
          <span>{remainingArtifacts} remaining on campus</span>
          <span>10 Valid Puzzles • 5 Decoys</span>
        </div>
      </div>

      {/* Seeker Selector Pills & Add Button */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none mb-3">
        {seekers.map((s) => {
          const online = isOnline(s);
          return (
            <button
              key={s.id}
              onClick={() => setSelectedSeeker(s.id)}
              className={`px-2 py-1 rounded text-[10px] whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                selectedSeeker && s.id === selectedSeeker.id
                  ? 'bg-[#ffd700] text-black font-bold shadow-[0_0_8px_rgba(255,215,0,0.3)]'
                  : 'bg-white/5 text-cyber-muted hover:text-white border border-white/5'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-cyber-success animate-pulse' : 'bg-white/30'}`} />
              <span>{s.playerId}</span>
              <span className={`text-[9px] ${selectedSeeker && s.id === selectedSeeker.id ? 'text-black/80 font-bold' : 'text-[#ffd700]'}`}>
                ({s.qrScannedCount ?? 0} found)
              </span>
            </button>
          );
        })}

        <button
          onClick={() => setShowAddModal(true)}
          className="px-2 py-1 bg-cyber-accent/15 border border-cyber-accent/40 text-cyber-accent hover:bg-cyber-accent/25 rounded text-[10px] whitespace-nowrap flex items-center gap-1 font-bold"
        >
          <Plus className="w-3 h-3" />
          <span>PROVISION NODE</span>
        </button>
      </div>

      {/* Main Content Area */}
      {seekers.length === 0 ? (
        <div className="bg-black/50 border border-white/10 p-6 rounded flex-1 flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-10 h-10 rounded-full border border-cyber-accent/40 bg-cyber-accent/10 flex items-center justify-center text-cyber-accent">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="text-sm font-bold text-white uppercase tracking-wider">
              No Seeker Nodes Active
            </div>
            <p className="text-[11px] text-cyber-muted mt-1 max-w-xs">
              Awaiting React Native seeker mobile devices to stream live telemetry into Cloud Firestore, or provision a node manually.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="bg-cyber-accent text-black font-bold px-4 py-2 rounded text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,255,204,0.3)]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>PROVISION REAL SEEKER NODE</span>
          </button>
        </div>
      ) : selectedSeeker ? (
        <div className="bg-black/50 border border-white/10 p-3.5 rounded flex-1 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-cyber-accent/20">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-base font-bold text-white flex items-center gap-2">
                <span className="text-[#ffd700]">{selectedSeeker.playerId}</span>
                <span>// {selectedSeeker.name}</span>
              </div>
              <div className="text-[11px] text-cyber-accent flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" />
                <span>{selectedSeeker.zoneName}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 text-[10px] rounded uppercase font-bold border ${
                  !isOnline(selectedSeeker)
                    ? 'bg-white/10 text-white/50 border-white/20'
                    : selectedSeeker.status === 'IN_TRANSIT'
                    ? 'bg-cyber-accent/20 text-cyber-accent border-cyber-accent/40 animate-pulse'
                    : 'bg-cyber-success/20 text-cyber-success border-cyber-success/40'
                }`}
              >
                {!isOnline(selectedSeeker) ? 'OFFLINE / STALE' : selectedSeeker.status.replace('_', ' ')}
              </span>

              <button
                onClick={() => handleDeleteSeeker(selectedSeeker.id, selectedSeeker.playerId)}
                title="Decommission Node"
                className="p-1 text-cyber-muted hover:text-[#ff0033] border border-white/10 hover:border-[#ff0033]/40 rounded transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Telemetry Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-white/5 p-2 rounded border border-white/5">
              <div className="text-cyber-muted text-[10px] flex items-center gap-1">
                <Wifi className="w-3 h-3 text-cyber-accent" /> SIGNAL
              </div>
              <div className="text-white font-bold text-sm mt-0.5">
                {selectedSeeker.signal}
              </div>
            </div>

            <div className="bg-white/5 p-2 rounded border border-white/5">
              <div className="text-cyber-muted text-[10px] flex items-center gap-1">
                <QrCode className="w-3 h-3 text-[#ffd700]" /> ARTIFACTS CLAIMED
              </div>
              <div className="text-[#ffd700] font-bold text-sm mt-0.5 flex items-baseline gap-1">
                <span>{selectedSeeker.qrScannedCount ?? 0}</span>
                <span className="text-[10px] text-cyber-muted font-normal">
                  ({totalTeamArtifacts > 0 ? Math.round(((selectedSeeker.qrScannedCount ?? 0) / totalTeamArtifacts) * 100) : 0}% of team)
                </span>
              </div>
            </div>
          </div>

          {/* Real Stream Info */}
          <div className="bg-[#030914] border border-cyber-accent/20 p-2.5 rounded text-[11px] space-y-1.5">
            <div className="text-cyber-muted text-[10px] uppercase font-bold flex items-center justify-between">
              <span>Mobile Ingest Pipeline</span>
              <span className="text-cyber-success text-[9px]">REALTIME CLOUD SYNC</span>
            </div>
            <div className="text-white/80 text-[10px] leading-relaxed">
              • <b>GPS Stream:</b> Real coordinates piped from mobile hardware.
              <br />
              • <b>QR Scans:</b> Mobile camera scans update Firestore directly.
              <br />
              • <b>Last Ping:</b> {new Date(selectedSeeker.lastPing).toLocaleTimeString()}
            </div>
          </div>
        </div>
      ) : null}

      {/* Feedback banner */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2 p-2 rounded bg-black/90 border border-cyber-accent/40 text-cyber-accent text-[10px] text-center flex items-center justify-center gap-1.5"
          >
            <CheckCircle className="w-3 h-3" />
            <span>{feedback}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Provision Seeker Node Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95 }}
              className="bg-[#070d1c] border border-cyber-accent/50 w-full max-w-sm p-4 rounded shadow-[0_0_30px_rgba(0,255,204,0.15)] font-mono text-xs"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                <span className="font-bold text-white uppercase text-sm">
                  Provision Seeker Node
                </span>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-cyber-muted hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddSeeker} className="space-y-3">
                <div>
                  <label className="block text-[10px] text-cyber-muted uppercase mb-1">
                    Node ID (e.g. S-001)
                  </label>
                  <input
                    type="text"
                    value={newNodeId}
                    onChange={(e) => setNewNodeId(e.target.value)}
                    placeholder="S-001"
                    required
                    className="w-full bg-black/70 border border-white/15 rounded px-2.5 py-1.5 text-xs text-white focus:border-cyber-accent focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-cyber-muted uppercase mb-1">
                    Seeker Call-sign / Agent Name
                  </label>
                  <input
                    type="text"
                    value={newNodeName}
                    onChange={(e) => setNewNodeName(e.target.value)}
                    placeholder="e.g. Phoenix"
                    required
                    className="w-full bg-black/70 border border-white/15 rounded px-2.5 py-1.5 text-xs text-white focus:border-cyber-accent focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-cyber-muted uppercase mb-1">
                    Initial Campus Zone
                  </label>
                  <select
                    value={newZone}
                    onChange={(e) => setNewZone(e.target.value)}
                    className="w-full bg-black/70 border border-white/15 rounded px-2.5 py-1.5 text-xs text-white focus:border-cyber-accent focus:outline-none"
                  >
                    {IIITK_FACILITIES.map((fac) => (
                      <option key={fac.key} value={fac.key}>
                        {fac.name} [{fac.shortCategory}]
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-3 py-1.5 text-cyber-muted hover:text-white border border-white/10 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-cyber-accent hover:bg-cyber-accent/90 text-black font-bold px-3 py-1.5 rounded disabled:opacity-50"
                  >
                    {isSubmitting ? 'Registering...' : 'Provision to Firestore'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
