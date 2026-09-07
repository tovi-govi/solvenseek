import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { isMockMode } from '../lib/supabase';
import RippleGrid from '../components/ui/RippleGrid';

export function Login() {
  const navigate = useNavigate();
  const { login, profile } = useAuthStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bootDone, setBootDone] = useState(false);

  // Refs for GSAP
  const logoRef       = useRef<HTMLDivElement>(null);
  const subtitleRef   = useRef<HTMLDivElement>(null);
  const badgeRef      = useRef<HTMLDivElement>(null);
  const dividerRef    = useRef<HTMLDivElement>(null);
  const formRef       = useRef<HTMLDivElement>(null);
  const statusRef     = useRef<HTMLDivElement>(null);
  const scanlineRef   = useRef<HTMLDivElement>(null);

  // If already logged in, redirect immediately
  useEffect(() => {
    if (profile) {
      if (profile.status === 'ELIMINATED') navigate('/eliminated', { replace: true });
      else if (profile.role === 'HIDER') navigate('/hider', { replace: true });
      else navigate('/seeker', { replace: true });
    }
  }, [profile, navigate]);

  // GSAP boot animation
  useEffect(() => {
    const tl = gsap.timeline({ onComplete: () => setBootDone(true) });

    // Start everything invisible
    gsap.set([logoRef.current, subtitleRef.current, badgeRef.current,
               dividerRef.current, formRef.current, statusRef.current], {
      autoAlpha: 0,
    });
    gsap.set(scanlineRef.current, { scaleY: 0, transformOrigin: 'top center' });

    tl
      // Scanline sweep
      .to(scanlineRef.current, { scaleY: 1, duration: 0.6, ease: 'power2.in' })
      .to(scanlineRef.current, { autoAlpha: 0, duration: 0.3 })
      // Logo appears with glitch
      .to(logoRef.current, { autoAlpha: 1, duration: 0.05 }, '<')
      .to(logoRef.current, { x: -4, duration: 0.05 })
      .to(logoRef.current, { x: 4, duration: 0.05 })
      .to(logoRef.current, { x: 0, duration: 0.05 })
      // Subtitle
      .to(subtitleRef.current, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out' }, '-=0.1')
      // Badge
      .to(badgeRef.current, { autoAlpha: 1, duration: 0.3, ease: 'power2.out' }, '+=0.1')
      // Divider draws
      .to(dividerRef.current, { autoAlpha: 1, scaleX: 1, transformOrigin: 'left', duration: 0.5, ease: 'power2.inOut' }, '+=0.05')
      // Form panel
      .to(formRef.current, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' }, '-=0.2')
      // Status
      .to(statusRef.current, { autoAlpha: 1, duration: 0.4 }, '-=0.1');

    return () => { tl.kill(); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setError('');
    setIsSubmitting(true);

    const result = await login(username, password);
    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
      // Glitch the form on error
      gsap.to(formRef.current, {
        x: 'random(-8,8)', duration: 0.04, repeat: 7, yoyo: true,
        onComplete: () => gsap.set(formRef.current, { x: 0 }),
      });
      return;
    }

    // Redirect is handled by the profile useEffect above
  };

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden flex items-center justify-center font-mono">
      {/* Background grid */}
      <div className="absolute inset-0 z-0 pointer-events-auto">
        <RippleGrid
          enableRainbow={false}
          gridColor="#00ffcc"
          rippleIntensity={0.05}
          gridSize={10}
          gridThickness={15}
          mouseInteraction={true}
          mouseInteractionRadius={1.2}
          opacity={0.3}
        />
      </div>

      {/* Ambient corner glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-cyber-accent/5 blur-[120px] pointer-events-none" />

      {/* Scanline sweep element */}
      <div
        ref={scanlineRef}
        className="absolute inset-0 bg-gradient-to-b from-transparent via-cyber-accent/20 to-transparent pointer-events-none z-50"
      />

      {/* Content column */}
      <div className="relative z-10 w-full max-w-md px-6 flex flex-col items-center gap-6">
        {/* LOGO */}
        <div ref={logoRef} className="text-center" style={{ opacity: 0 }}>
          <p className="text-cyber-muted text-[11px] tracking-[0.4em] mb-3 uppercase">
            OpenVerse Presents
          </p>
          <h1
            className="text-5xl md:text-7xl font-bold text-white tracking-tight leading-none"
            style={{ textShadow: '0 0 30px rgba(0,255,204,0.4), 0 0 60px rgba(0,255,204,0.15)' }}
          >
            HIDE{' '}
            <span className="text-cyber-accent">//</span>
            {' '}SEEK
          </h1>
        </div>

        {/* SUBTITLE */}
        <div ref={subtitleRef} className="text-center" style={{ opacity: 0, transform: 'translateY(8px)' }}>
          <span className="text-cyber-accent font-mono tracking-[0.3em] text-sm border border-cyber-accent/30 bg-cyber-accent/10 px-4 py-1 inline-block">
            CAMPUS PROTOCOL
          </span>
        </div>

        {/* DIVIDER */}
        <div
          ref={dividerRef}
          className="w-full h-px bg-gradient-to-r from-transparent via-cyber-border to-transparent"
          style={{ opacity: 0, transform: 'scaleX(0)' }}
        />

        {/* FORM PANEL */}
        <div
          ref={formRef}
          className="w-full relative bg-[#080808]/90 border border-cyber-border backdrop-blur-sm"
          style={{ opacity: 0, transform: 'translateY(12px)' }}
        >
          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyber-accent" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyber-accent" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyber-accent" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyber-accent" />

          <div className="p-7 flex flex-col gap-6">
            <div className="text-center">
              <p className="text-cyber-muted text-[10px] tracking-[0.4em] uppercase">
                IDENTIFICATION REQUIRED
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Username */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] tracking-[0.35em] text-cyber-muted uppercase">
                  Username
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cyber-accent/50 text-sm">›</span>
                  <input
                    id="login-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={isMockMode ? 'hider1 / seeker1' : 'USERNAME'}
                    autoComplete="username"
                    className="w-full bg-black border border-cyber-border text-white font-mono text-sm pl-7 pr-4 py-3 focus:outline-none focus:border-cyber-accent focus:bg-cyber-accent/5 transition-colors placeholder:text-[#444] uppercase tracking-wider"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] tracking-[0.35em] text-cyber-muted uppercase">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cyber-accent/50 text-sm">›</span>
                  <input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full bg-black border border-cyber-border text-white font-mono text-sm pl-7 pr-4 py-3 focus:outline-none focus:border-cyber-accent focus:bg-cyber-accent/5 transition-colors placeholder:text-[#444]"
                  />
                </div>
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="bg-cyber-warning/10 border border-cyber-warning/50 text-cyber-warning text-xs px-3 py-2 uppercase tracking-wider flex items-center gap-2"
                  >
                    <span className="w-1.5 h-1.5 bg-cyber-warning rounded-full animate-pulse" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <button
                id="login-submit"
                type="submit"
                disabled={isSubmitting || !username || !password}
                className="relative w-full bg-cyber-accent/10 border border-cyber-accent text-cyber-accent font-mono text-sm tracking-[0.3em] py-3 uppercase hover:bg-cyber-accent/20 hover:shadow-[0_0_20px_rgba(0,255,204,0.2)] transition-all disabled:opacity-40 disabled:cursor-not-allowed mt-1 group overflow-hidden"
              >
                <span className="relative z-10">
                  {isSubmitting ? 'AUTHENTICATING...' : 'CONNECT'}
                </span>
                {/* scan line on hover */}
                <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-cyber-accent/10 to-transparent transition-transform duration-700 ease-in-out" />
              </button>
            </form>

            {/* Demo credentials */}
            {isMockMode && bootDone && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="border border-cyber-border/40 bg-cyber-accent/3 p-3 flex flex-col gap-1.5"
              >
                <p className="text-[9px] tracking-widest text-cyber-muted uppercase border-b border-cyber-border/30 pb-1.5 mb-1">
                  Demo Credentials (Mock Mode)
                </p>
                {[
                  { role: 'HIDER',  u: 'hider1',  p: 'hide123' },
                  { role: 'SEEKER', u: 'seeker1', p: 'seek123' },
                ].map(({ role, u, p }) => (
                  <button
                    key={u}
                    onClick={() => { setUsername(u); setPassword(p); }}
                    className="text-left flex items-center gap-2 text-[10px] font-mono hover:text-white transition-colors group"
                  >
                    <span className={`text-[9px] tracking-widest px-1.5 py-0.5 border ${role === 'HIDER' ? 'text-cyber-accent border-cyber-accent/40' : 'text-[#00ff41] border-[#00ff41]/40'}`}>
                      {role}
                    </span>
                    <span className="text-cyber-muted group-hover:text-cyber-text">
                      {u} / {p}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </div>
        </div>

        {/* STATUS INDICATORS */}
        <div
          ref={statusRef}
          className="w-full flex justify-between text-[10px] tracking-widest text-cyber-muted uppercase"
          style={{ opacity: 0 }}
        >
          {[
            { label: 'SYSTEM', value: 'ONLINE', ok: true },
            { label: 'NETWORK', value: 'SECURE', ok: true },
            { label: 'GAME', value: 'ACTIVE', ok: true },
          ].map(({ label, value, ok }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-cyber-success animate-pulse' : 'bg-cyber-warning'}`} />
              <span>{label}: <span className={ok ? 'text-cyber-success' : 'text-cyber-warning'}>{value}</span></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
