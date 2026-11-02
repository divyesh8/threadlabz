"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import type { IntroConfig } from '../config/intro.config';

const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End']);

export function useLandingIntro(config: IntroConfig, onComplete: () => void) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const finishRef = useRef<() => void>(() => {});
  const canSkipRef = useRef(false);
  const [phase, setPhase] = useState<'playing' | 'revealing'>('playing');
  const [canSkip, setCanSkip] = useState(false);

  const finish = useCallback(() => {
    finishRef.current();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const dialog = dialogRef.current;
    if (!video || !dialog) {
      delete document.documentElement.dataset.introBoot;
      delete document.documentElement.dataset.introStage;
      onComplete();
      return;
    }

    let disposed = false;
    let finishing = false;
    let started = false;
    let playbackBegun = false;
    let skipUnlocked = false;
    let accumulatedPlayMs = 0;
    let playSegmentStart: number | null = null;
    let skipTimer: ReturnType<typeof setTimeout> | undefined;
    let exitTimer: ReturnType<typeof setTimeout> | undefined;
    let lastProgress = performance.now();
    let lastTime = video.currentTime;

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const scrollY = window.scrollY;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');

    const unlockSkip = () => {
      if (disposed || skipUnlocked) return;
      skipUnlocked = true;
      canSkipRef.current = true;
      clearTimeout(skipTimer);
      setCanSkip(true);
    };

    const syncPlayClock = () => {
      if (disposed || finishing || skipUnlocked) return;
      if (video.currentTime >= config.skipUnlockDelay / 1000) {
        unlockSkip();
        return;
      }
      const activelyPlaying = !document.hidden && !video.paused && !video.ended && video.readyState >= 2 && (playbackBegun || video.currentTime > 0);
      if (activelyPlaying) {
        if (playSegmentStart === null) {
          playSegmentStart = performance.now();
          const remaining = Math.max(0, config.skipUnlockDelay - accumulatedPlayMs);
          clearTimeout(skipTimer);
          skipTimer = setTimeout(syncPlayClock, remaining + 12);
        }
        if (accumulatedPlayMs + (performance.now() - playSegmentStart) >= config.skipUnlockDelay) {
          unlockSkip();
        }
      } else {
        if (playSegmentStart !== null) {
          accumulatedPlayMs += performance.now() - playSegmentStart;
          playSegmentStart = null;
        }
        clearTimeout(skipTimer);
      }
    };

    const reveal = () => {
      if (disposed || finishing) return;
      finishing = true;
      clearTimeout(skipTimer);
      video.pause();
      delete document.documentElement.dataset.introBoot;
      document.documentElement.dataset.introStage = 'revealing';
      window.dispatchEvent(new CustomEvent('threadlabz:intro-reveal'));
      setPhase('revealing');

      const isReducedMotion = config.respectReducedMotion && motion.matches;
      const duration = isReducedMotion
        ? config.reducedMotionTransitionDuration
        : config.transitionDuration;

      if (isReducedMotion && duration > 0) {
        const stage = dialog.firstElementChild;
        if (stage instanceof HTMLElement && typeof stage.animate === 'function') {
          stage.animate([{ opacity: 1 }, { opacity: 0 }], { duration, easing: 'ease-out', fill: 'forwards' });
        }
      }

      if (duration <= 0) {
        onComplete();
        return;
      }
      exitTimer = setTimeout(() => {
        if (!disposed) onComplete();
      }, duration);
    };

    finishRef.current = reveal;

    try {
      if (!dialog.open) dialog.showModal();
    } catch {
      delete document.documentElement.dataset.introBoot;
      delete document.documentElement.dataset.introStage;
      onComplete();
      return;
    }

    document.documentElement.dataset.introStage = 'playing';
    const bootClearFrame = requestAnimationFrame(() => {
      delete document.documentElement.dataset.introBoot;
    });

    dialog.querySelector<HTMLButtonElement>('[data-intro-skip]')?.focus({ preventScroll: true });

    const preventBackgroundScroll = (event: Event) => {
      if (event.cancelable) event.preventDefault();
    };

    const play = () => {
      if (disposed || finishing || document.hidden) return;
      video.defaultMuted = true;
      video.muted = true;
      video.playsInline = true;
      try {
        const promise = video.play();
        if (promise !== undefined) {
          void promise.catch(() => {
            if (!disposed && !document.hidden) reveal();
          });
        }
      } catch {
        reveal();
      }
    };

    const onPlaying = () => {
      if (disposed || finishing) return;
      playbackBegun = true;
      started = true;
      lastProgress = performance.now();
      syncPlayClock();
    };

    const onPauseOrWaiting = () => {
      syncPlayClock();
    };

    const onEnded = () => {
      reveal();
    };

    const onError = () => {
      reveal();
    };

    const onProgress = () => {
      if (video.currentTime > lastTime) {
        started = true;
        playbackBegun = true;
        lastProgress = performance.now();
        lastTime = video.currentTime;
      }
      syncPlayClock();
    };

    const onVisibility = () => {
      if (document.hidden) {
        video.pause();
        syncPlayClock();
      } else {
        lastProgress = performance.now();
        if (video.ended) reveal();
        else play();
      }
    };

    const onReducedMotion = () => {
      if (config.respectReducedMotion && motion.matches) {
        reveal();
      }
    };

    const onPageHide = () => {
      onComplete();
    };

    const onDialogClose = () => {
      if (!disposed && !finishing) {
        delete document.documentElement.dataset.introBoot;
        delete document.documentElement.dataset.introStage;
        onComplete();
      }
    };

    const onWindowKeyDown = (event: KeyboardEvent) => {
      if (disposed || finishing) return;
      if (SCROLL_KEYS.has(event.key)) {
        event.preventDefault();
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        if (canSkipRef.current) reveal();
      }
    };

    dialog.addEventListener('wheel', preventBackgroundScroll, { passive: false });
    dialog.addEventListener('touchmove', preventBackgroundScroll, { passive: false });
    dialog.addEventListener('close', onDialogClose);
    window.addEventListener('keydown', onWindowKeyDown);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('pause', onPauseOrWaiting);
    video.addEventListener('waiting', onPauseOrWaiting);
    video.addEventListener('ended', onEnded);
    video.addEventListener('error', onError);
    video.addEventListener('timeupdate', onProgress);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    motion.addEventListener('change', onReducedMotion);

    const watchdog = setInterval(() => {
      if (disposed || finishing || document.hidden) return;
      onProgress();
      const timeout = started ? config.stallTimeout : config.startupTimeout;
      if (performance.now() - lastProgress > timeout) {
        reveal();
      }
    }, 200);

    if (video.error) {
      reveal();
    } else if (!video.paused && video.readyState >= 2 && video.currentTime > 0) {
      playbackBegun = true;
      started = true;
      syncPlayClock();
    } else {
      play();
    }

    return () => {
      disposed = true;
      finishRef.current = () => {};
      canSkipRef.current = false;
      clearInterval(watchdog);
      clearTimeout(skipTimer);
      clearTimeout(exitTimer);
      cancelAnimationFrame(bootClearFrame);
      dialog.removeEventListener('wheel', preventBackgroundScroll);
      dialog.removeEventListener('touchmove', preventBackgroundScroll);
      dialog.removeEventListener('close', onDialogClose);
      window.removeEventListener('keydown', onWindowKeyDown);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('pause', onPauseOrWaiting);
      video.removeEventListener('waiting', onPauseOrWaiting);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('error', onError);
      video.removeEventListener('timeupdate', onProgress);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      motion.removeEventListener('change', onReducedMotion);
      video.pause();
      if (dialog.open) dialog.close();
      delete document.documentElement.dataset.introBoot;
      delete document.documentElement.dataset.introStage;
      if (window.location.pathname === '/') {
        const target = previousFocus?.isConnected && previousFocus !== document.body
          ? previousFocus
          : document.getElementById('main-content');
        target?.focus({ preventScroll: true });
        window.scrollTo({ top: scrollY, behavior: 'instant' });
      }
    };
  }, [config, onComplete]);

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLDialogElement>) => {
    if (!event.isPrimary) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    if (canSkipRef.current) finishRef.current();
  }, []);

  const handleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (canSkipRef.current) finishRef.current();
  }, []);

  const handleCancel = useCallback((event: React.SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault();
    if (canSkipRef.current) finishRef.current();
  }, []);

  return {
    videoRef,
    dialogRef,
    phase,
    canSkip,
    finish,
    handlePointerUp,
    handleClick,
    handleCancel,
  };
}
