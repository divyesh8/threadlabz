"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import type { IntroConfig } from '../config/intro.config';

export function useLandingIntro(config: IntroConfig, onComplete: () => void) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const finishRef = useRef<(hold?: boolean) => void>(() => {});
  const [phase, setPhase] = useState<'playing' | 'holding' | 'revealing'>('playing');
  const [muted, setMuted] = useState(true);
  const finish = useCallback((hold = false) => finishRef.current(hold), []);

  useEffect(() => {
    const video = videoRef.current;
    const dialog = dialogRef.current;
    if (!video || !dialog) { onComplete(); return; }
    let disposed = false, finishing = false, started = false;
    let holdTimer: ReturnType<typeof setTimeout> | undefined;
    let exitTimer: ReturnType<typeof setTimeout> | undefined;
    let lastProgress = performance.now(), lastTime = video.currentTime;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const scrollY = window.scrollY;
    const previousOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const reveal = (hold = false) => {
      if (disposed || finishing) return;
      finishing = true;
      video.pause();
      if (config.respectReducedMotion && motion.matches) { onComplete(); return; }
      if (hold) setPhase('holding');
      holdTimer = setTimeout(() => {
        if (disposed) return;
        setPhase('revealing');
        exitTimer = setTimeout(onComplete, config.transitionDuration);
      }, hold ? config.finalFrameHold : 0);
    };
    finishRef.current = reveal;
    try { dialog.showModal(); } catch { onComplete(); return; }
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    dialog.querySelector<HTMLButtonElement>('[data-intro-skip]')?.focus({ preventScroll: true });
    const play = () => {
      if (disposed || finishing || document.hidden) return;
      try { void video.play().catch(() => { if (!disposed && !document.hidden) reveal(); }); }
      catch { reveal(); }
    };
    const ended = () => reveal(true);
    const failed = () => reveal();
    const progress = () => {
      if (video.currentTime > lastTime) { started = true; lastProgress = performance.now(); lastTime = video.currentTime; }
    };
    const visibility = () => {
      if (document.hidden) video.pause();
      else { lastProgress = performance.now(); if (video.ended) reveal(true); else play(); }
    };
    const reducedMotion = () => { if (config.respectReducedMotion && motion.matches) onComplete(); };
    const pageHide = () => onComplete();
    video.addEventListener('ended', ended);
    video.addEventListener('error', failed);
    video.addEventListener('timeupdate', progress);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', pageHide);
    motion.addEventListener('change', reducedMotion);
    const watchdog = setInterval(() => {
      if (disposed || finishing || document.hidden) return;
      progress();
      if (performance.now() - lastProgress > (started ? config.stallTimeout : config.startupTimeout)) reveal();
    }, 250);
    play();
    return () => {
      disposed = true;
      finishRef.current = () => {};
      clearInterval(watchdog); clearTimeout(holdTimer); clearTimeout(exitTimer);
      video.removeEventListener('ended', ended);
      video.removeEventListener('error', failed);
      video.removeEventListener('timeupdate', progress);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', pageHide);
      motion.removeEventListener('change', reducedMotion);
      video.pause();
      dialog.close();
      document.documentElement.style.overflow = previousOverflow;
      document.body.style.overflow = previousBodyOverflow;
      if (window.location.pathname === '/') {
        const target = previousFocus?.isConnected && previousFocus !== document.body ? previousFocus : document.getElementById('main-content');
        target?.focus({ preventScroll: true });
        window.scrollTo({ top: scrollY, behavior: 'instant' });
      }
    };
  }, [config, onComplete]);

  const toggleSound = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };
  return { videoRef, dialogRef, phase, muted, toggleSound, finish };
}
