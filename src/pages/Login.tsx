import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import {
  Lock,
  Mail,
  ArrowRight,
  AlertTriangle,
  Radio,
  ExternalLink,
} from 'lucide-react';

export function Login() {
  const navigate = useNavigate();
  const { signInWithEmail, signInWithGoogle, isLoading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [authInProgress, setAuthInProgress] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage('Please fill in all required credentials.');
      return;
    }

    setAuthInProgress(true);

    try {
      const result = await signInWithEmail(email, password);
      if (result.error) {
        setErrorMessage(result.error);
      } else {
        navigate('/');
      }
    } finally {
      setAuthInProgress(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setAuthInProgress(true);
    try {
      const result = await signInWithGoogle();
      if (result.error) {
        setErrorMessage(result.error);
      } else {
        navigate('/');
      }
    } finally {
      setAuthInProgress(false);
    }
  };

  return (
    <div className="relative min-h-screen w-screen bg-[#02050e] text-white font-mono flex flex-col items-center justify-center p-4 overflow-hidden select-none">
      {/* Background Cyber Grid Lines */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(0, 240, 255, 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 240, 255, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Radial Glow Underlay */}
      <div className="absolute w-[600px] h-[600px] rounded-full bg-cyber-accent/5 blur-[120px] pointer-events-none" />

      {/* Main Authentication Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-md bg-[#050b18]/90 border border-cyber-accent/30 rounded-sm p-6 shadow-[0_0_35px_rgba(0,240,255,0.08)] backdrop-blur-md"
      >
        {/* Top Tactical Status Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-5">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyber-accent animate-pulse" />
            <span className="text-[11px] font-bold tracking-widest text-cyber-accent uppercase">
              SECURITY ACCESS NODE // PORT 443
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[9px] text-cyber-success bg-cyber-success/10 border border-cyber-success/30 px-2 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-cyber-success animate-ping" />
            <span>ONLINE</span>
          </div>
        </div>

        {/* Title & Brand */}
        <div className="mb-6">
          <div className="text-xl font-black tracking-wider text-white flex items-center gap-2 font-display">
            <span>OPENVERSE</span>
            <span className="text-cyber-accent">// SURVEILLANCE</span>
          </div>
          <p className="text-xs text-cyber-muted mt-1">
            Team Command Center Authorization Portal
          </p>
          <div className="mt-2 text-[10px] text-[#ffd700] bg-[#ffd700]/10 border border-[#ffd700]/25 px-2 py-1 rounded flex items-center justify-between">
            <span>FIREBASE PROJECT: <b>cmiyc-d170c</b></span>
            <span className="text-white/60">AUTH & DB</span>
          </div>
        </div>

        {/* Error Alert Banner */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-2.5 rounded bg-[#ff0033]/10 border border-[#ff0033]/40 text-[#ff0033] text-[11px] flex items-start gap-2 overflow-hidden"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 leading-tight">
                <span className="font-bold">AUTH ERROR:</span> {errorMessage}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[10px] text-cyber-muted uppercase tracking-wider mb-1">
              SURVEILLANCE EMAIL
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-cyber-accent/60" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@openverse.net"
                required
                className="w-full bg-black/60 border border-white/15 rounded px-3 py-2 pl-9 text-xs text-white placeholder-white/20 focus:border-cyber-accent focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-cyber-muted uppercase tracking-wider mb-1">
              ENCRYPTION KEY (PASSWORD)
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-cyber-accent/60" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full bg-black/60 border border-white/15 rounded px-3 py-2 pl-9 text-xs text-white placeholder-white/20 focus:border-cyber-accent focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={authInProgress || isLoading}
            className="w-full mt-2 bg-cyber-accent hover:bg-cyber-accent/90 text-black font-bold py-2.5 rounded text-xs tracking-widest uppercase transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,240,255,0.25)] disabled:opacity-50"
          >
            {authInProgress ? (
              <span>AUTHENTICATING NODE...</span>
            ) : (
              <>
                <span>AUTHORIZE ACCESS</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-4 flex items-center justify-center">
          <div className="border-t border-white/10 w-full" />
          <span className="bg-[#050b18] px-2 text-[10px] text-cyber-muted absolute uppercase">
            OR AUTHENTICATE VIA
          </span>
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={authInProgress || isLoading}
          className="w-full bg-white/5 hover:bg-white/10 border border-white/15 text-white/90 text-xs py-2 rounded transition-colors flex items-center justify-center gap-2 font-mono disabled:opacity-50"
        >
          {/* Custom Google G SVG icon */}
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>CONTINUE WITH GOOGLE</span>
        </button>
      </motion.div>

      {/* Footer Info */}
      <div className="relative z-10 mt-6 text-center text-[10px] text-cyber-muted space-y-1">
        <p>OPENVERSE SURVEILLANCE SUITE // FIREBASE BACKEND INTEGRATED</p>
        <div className="flex items-center justify-center gap-3 text-cyber-accent/70">
          <span className="flex items-center gap-1">
            <span>Project: cmiyc-d170c</span>
          </span>
          <span>•</span>
          <a
            href="https://console.firebase.google.com/project/cmiyc-d170c/authentication"
            target="_blank"
            rel="noreferrer"
            className="hover:underline flex items-center gap-1 text-cyber-accent"
          >
            <span>Firebase Console</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
