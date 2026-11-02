"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import type { IntroConfig } from '../config/intro.config';

const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End']);

export type IntroMediaOptions = {
  src: string;
  poster: string;
  backgroundColor: string;
  focalY: number;
};

type VideoWithFrameCallback = HTMLVideoElement & {
  requestVideoFrameCallback?: (callback: () => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

function drawMediaCover(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sw: number,
  sh: number,
  dw: number,
  dh: number,
  alignX = 0.5,
  alignY = 0.5,
) {
  if (sw <= 0 || sh <= 0 || dw <= 0 || dh <= 0) return false;
  const scale = Math.max(dw / sw, dh / sh);
  const cropW = dw / scale;
  const cropH = dh / scale;
  const sx = Math.max(0, Math.min(sw - cropW, (sw - cropW) * alignX));
  const sy = Math.max(0, Math.min(sh - cropH, (sh - cropH) * alignY));
  ctx.drawImage(source, sx, sy, cropW, cropH, 0, 0, dw, dh);
  return true;
}

export function useLandingIntro(
  config: IntroConfig,
  media: IntroMediaOptions,
  onComplete: () => void,
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const finishRef = useRef<() => void>(() => {});
  const canSkipRef = useRef(false);
  const [phase, setPhase] = useState<'playing' | 'revealing'>('playing');
  const [canSkip, setCanSkip] = useState(false);

  const { src: mediaSrc, poster: mediaPoster, backgroundColor: mediaBg, focalY } = media;

  const finish = useCallback(() => {
    finishRef.current();
  }, []);

  useEffect(() => {
    const video = videoRef.current as VideoWithFrameCallback | null;
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    const dialog = dialogRef.current;
    if (!video || !canvas || !stage || !dialog) {
      delete document.documentElement.dataset.introBoot;
      delete document.documentElement.dataset.introVariant;
      delete document.documentElement.dataset.introStage;
      onComplete();
      return;
    }

    let disposed = false;
    let finishing = false;
    let started = false;
    let playbackBegun = false;
    let skipUnlocked = false;
    let hasPaintedCanvas = false;
    let accumulatedPlayMs = 0;
    let playSegmentStart: number | null = null;
    let skipTimer: ReturnType<typeof setTimeout> | undefined;
    let exitTimer: ReturnType<typeof setTimeout> | undefined;
    let rafHandle = 0;
    let vfcHandle: number | undefined;
    let objectUrl: string | null = null;
    let lastProgress = performance.now();
    let lastTime = 0;

    const fetchController = new AbortController();
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const scrollY = window.scrollY;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const ctx = canvas.getContext('2d', { alpha: false });

    video.setAttribute('webkit-playsinline', 'true');
    video.setAttribute('x5-playsinline', 'true');
    video.setAttribute('x5-video-player-type', 'h5-page');
    video.setAttribute('controlslist', 'nodownload nofullscreen noremoteplayback');

    let posterImg: HTMLImageElement | null = null;
    if (mediaPoster) {
      posterImg = new Image();
      posterImg.decoding = 'async';
      posterImg.src = mediaPoster;
    }

    const syncCanvasSize = () => {
      const rect = stage.getBoundingClientRect();
      const cssW = rect.width || window.innerWidth;
      const cssH = rect.height || window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const targetW = Math.max(1, Math.round(cssW * dpr));
      const targetH = Math.max(1, Math.round(cssH * dpr));
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
    };

    const paintFrame = () => {
      if (disposed || !ctx) return;
      syncCanvasSize();
      const dw = canvas.width;
      const dh = canvas.height;
      const alignY = dw > dh ? focalY : 0.5;
      let drew = false;
      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        drew = drawMediaCover(ctx, video, video.videoWidth, video.videoHeight, dw, dh, 0.5, alignY);
      } else if (posterImg && posterImg.complete && posterImg.naturalWidth > 0) {
        drew = drawMediaCover(ctx, posterImg, posterImg.naturalWidth, posterImg.naturalHeight, dw, dh, 0.5, alignY);
      }
      if (drew && !hasPaintedCanvas) {
        hasPaintedCanvas = true;
        canvas.dataset.painted = 'true';
      } else if (!drew && !hasPaintedCanvas) {
        ctx.fillStyle = mediaBg || '#f4ede5';
        ctx.fillRect(0, 0, dw, dh);
      }
    };

    if (posterImg) {
      if (posterImg.complete) {
        paintFrame();
      } else {
        posterImg.onload = () => paintFrame();
      }
    }

    const scheduleVideoFrame = () => {
      if (disposed || finishing || typeof video.requestVideoFrameCallback !== 'function') return;
      vfcHandle = video.requestVideoFrameCallback(() => {
        paintFrame();
        scheduleVideoFrame();
      });
    };

    const tick = () => {
      if (disposed || finishing) return;
      if (!document.hidden && !video.paused && video.readyState >= 2) {
        paintFrame();
      }
      rafHandle = requestAnimationFrame(tick);
    };

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
      const activelyPlaying =
        !document.hidden &&
        !video.paused &&
        !video.ended &&
        video.readyState >= 2 &&
        (playbackBegun || video.currentTime > 0);
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

    const applyHeroDockGeometry = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const hero = document.querySelector<HTMLElement>('.home .hero');
      const heroRect = hero?.getBoundingClientRect();
      if (!hero || !heroRect || heroRect.width <= 0 || heroRect.height <= 0 || vw <= 0 || vh <= 0) {
        return;
      }
      const top = Math.max(0, Math.min(vh * 0.65, heroRect.top));
      const left = Math.max(0, Math.min(vw * 0.35, heroRect.left));
      const right = Math.max(0, Math.min(vw * 0.35, vw - heroRect.right));
      const bottom = Math.max(0, Math.min(vh * 0.55, vh - heroRect.bottom));
      const radius = getComputedStyle(hero).borderTopLeftRadius || '20px';
      const visibleBottom = Math.max(top + 48, vh - bottom);
      const targetCenterX = left + (vw - left - right) / 2;
      const targetCenterY = top + (visibleBottom - top) / 2;
      const dx = Math.round(targetCenterX - vw / 2);
      const dy = Math.round(Math.max(-vh * 0.2, Math.min(vh * 0.22, targetCenterY - vh / 2)));
      const uniformScale = Math.min(
        0.96,
        Math.max(0.76, Math.max((vw - left - right) / vw, (visibleBottom - top) / vh)),
      );
      stage.style.setProperty('--clip-top', `${Math.round(top)}px`);
      stage.style.setProperty('--clip-right', `${Math.round(right)}px`);
      stage.style.setProperty('--clip-bottom', `${Math.round(bottom)}px`);
      stage.style.setProperty('--clip-left', `${Math.round(left)}px`);
      stage.style.setProperty('--clip-radius', radius);
      stage.style.setProperty('--morph-x', `${dx}px`);
      stage.style.setProperty('--morph-y', `${dy}px`);
      stage.style.setProperty('--morph-scale', uniformScale.toFixed(4));
    };

    const reveal = () => {
      if (disposed || finishing) return;
      finishing = true;
      fetchController.abort();
      clearTimeout(skipTimer);
      cancelAnimationFrame(rafHandle);
      if (vfcHandle !== undefined && typeof video.cancelVideoFrameCallback === 'function') {
        video.cancelVideoFrameCallback(vfcHandle);
        vfcHandle = undefined;
      }
      paintFrame();
      video.pause();

      const isReducedMotion = config.respectReducedMotion && motion.matches;
      if (!isReducedMotion) {
        applyHeroDockGeometry();
      }

      delete document.documentElement.dataset.introBoot;
      document.documentElement.dataset.introStage = 'revealing';
      window.dispatchEvent(new CustomEvent('threadlabz:intro-reveal'));
      setPhase('revealing');

      const duration = isReducedMotion
        ? config.reducedMotionTransitionDuration
        : config.transitionDuration;

      if (isReducedMotion && duration > 0 && typeof stage.animate === 'function') {
        stage.animate([{ opacity: 1 }, { opacity: 0 }], { duration, easing: 'ease-out', fill: 'forwards' });
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
      fetchController.abort();
      delete document.documentElement.dataset.introBoot;
      delete document.documentElement.dataset.introVariant;
      delete document.documentElement.dataset.introStage;
      onComplete();
      return;
    }

    document.documentElement.dataset.introStage = 'playing';
    paintFrame();
    rafHandle = requestAnimationFrame(tick);

    const bootClearFrame = requestAnimationFrame(() => {
      delete document.documentElement.dataset.introBoot;
    });

    dialog.querySelector<HTMLButtonElement>('[data-intro-skip]')?.focus({ preventScroll: true });

    const preventBackgroundScroll = (event: Event) => {
      if (event.cancelable) event.preventDefault();
    };

    const play = () => {
      if (disposed || finishing || document.hidden) return;
      if (!video.src && !video.currentSrc) return;
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

    const onLoadedData = () => {
      if (disposed || finishing) return;
      paintFrame();
    };

    const onPlaying = () => {
      if (disposed || finishing) return;
      playbackBegun = true;
      started = true;
      lastProgress = performance.now();
      paintFrame();
      scheduleVideoFrame();
      syncPlayClock();
    };

    const onPauseOrWaiting = () => {
      syncPlayClock();
    };

    const onEnded = () => {
      paintFrame();
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
        paintFrame();
      }
      syncPlayClock();
    };

    const onResize = () => {
      if (disposed) return;
      paintFrame();
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
        delete document.documentElement.dataset.introVariant;
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

    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => onResize()) : null;
    resizeObserver?.observe(stage);

    dialog.addEventListener('wheel', preventBackgroundScroll, { passive: false });
    dialog.addEventListener('touchmove', preventBackgroundScroll, { passive: false });
    dialog.addEventListener('close', onDialogClose);
    window.addEventListener('keydown', onWindowKeyDown);
    window.addEventListener('resize', onResize);
    video.addEventListener('loadeddata', onLoadedData);
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

    // Fetch silent video bytes over standard fetch() -> in-memory Blob URL so mobile
    // OEM browsers never show cellular streaming prompts or attach Video Assistant UI.
    void fetch(mediaSrc, { signal: fetchController.signal, credentials: 'same-origin' })
      .then(async response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        if (disposed || finishing) return;
        if (!blob.size) throw new Error('Empty intro blob');
        objectUrl = URL.createObjectURL(blob);
        video.src = objectUrl;
        video.load();
        if (!document.hidden) {
          play();
        }
      })
      .catch((err: unknown) => {
        if (disposed || finishing) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        reveal();
      });

    return () => {
      disposed = true;
      finishRef.current = () => {};
      canSkipRef.current = false;
      fetchController.abort();
      clearInterval(watchdog);
      clearTimeout(skipTimer);
      clearTimeout(exitTimer);
      cancelAnimationFrame(bootClearFrame);
      cancelAnimationFrame(rafHandle);
      if (vfcHandle !== undefined && typeof video.cancelVideoFrameCallback === 'function') {
        video.cancelVideoFrameCallback(vfcHandle);
      }
      if (posterImg) {
        posterImg.onload = null;
      }
      resizeObserver?.disconnect();
      dialog.removeEventListener('wheel', preventBackgroundScroll);
      dialog.removeEventListener('touchmove', preventBackgroundScroll);
      dialog.removeEventListener('close', onDialogClose);
      window.removeEventListener('keydown', onWindowKeyDown);
      window.removeEventListener('resize', onResize);
      video.removeEventListener('loadeddata', onLoadedData);
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
      video.removeAttribute('src');
      video.load();
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = null;
      }
      if (dialog.open) dialog.close();
      delete document.documentElement.dataset.introBoot;
      delete document.documentElement.dataset.introVariant;
      delete document.documentElement.dataset.introStage;
      if (window.location.pathname === '/') {
        const target =
          previousFocus?.isConnected && previousFocus !== document.body
            ? previousFocus
            : document.getElementById('main-content');
        target?.focus({ preventScroll: true });
        window.scrollTo({ top: scrollY, behavior: 'instant' });
      }
    };
  }, [config, mediaSrc, mediaPoster, mediaBg, focalY, onComplete]);

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
    canvasRef,
    stageRef,
    dialogRef,
    phase,
    canSkip,
    finish,
    handlePointerUp,
    handleClick,
    handleCancel,
  };
}
