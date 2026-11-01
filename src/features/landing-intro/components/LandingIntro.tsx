"use client";

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Volume2, VolumeX, ArrowUpRight } from 'lucide-react';
import { introConfig, type IntroAsset } from '../config/intro.config';
import { markAttempted, wasAttempted } from '../session';
import { useLandingIntro } from '../hooks/useLandingIntro';
import { IntroTransition } from './IntroTransition';
import styles from './landing-intro.module.css';

function Playback({ asset, onComplete }: { asset: IntroAsset; onComplete: () => void }) {
  const { videoRef, dialogRef, phase, muted, toggleSound, finish } = useLandingIntro(introConfig, onComplete);
  const revealing = phase === 'revealing';
  return createPortal(<dialog ref={dialogRef} className={styles.dialog} aria-label="ThreadLabz campaign film"
    data-landing-intro data-phase={phase} onCancel={event => { event.preventDefault(); finish(); }}>
    <motion.div className={styles.stage} initial={false}
      animate={{ scale: revealing ? 1.035 : 1, opacity: revealing ? 0 : 1 }}
      transition={{ duration: introConfig.transitionDuration / 1000 * 0.4, ease: 'easeInOut' }}>
      <video ref={videoRef} src={asset.src} className={styles.video}
        style={{ aspectRatio: asset.aspectRatio }}
        autoPlay={introConfig.autoplay} muted={introConfig.muted} loop={introConfig.loop}
        playsInline controls={false} preload="auto" disablePictureInPicture
        aria-label="ThreadLabz campaign film" />
    </motion.div>
    <IntroTransition revealing={revealing} duration={introConfig.transitionDuration} />
    <div className={styles.controls}>
      {introConfig.showSoundToggle && asset.hasAudio && <button className={styles.sound} type="button" onClick={toggleSound}
        aria-label={muted ? 'Enable sound' : 'Mute sound'} aria-pressed={!muted}>
        {muted ? <VolumeX size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
      </button>}
      {introConfig.showSkipButton && <button data-intro-skip type="button" onClick={() => finish()} className={styles.skip}>
        Skip intro <ArrowUpRight size={15} aria-hidden="true" />
      </button>}
    </div>
  </dialog>, document.body);
}

export function LandingIntro({ asset }: { asset: IntroAsset | null }) {
  const [active, setActive] = useState(false);
  const complete = useCallback(() => setActive(false), []);
  useEffect(() => {
    let cancelled = false;
    // Deferring admission avoids a Strict Mode setup/cleanup consuming the session.
    queueMicrotask(() => {
      if (cancelled || !asset || !introConfig.enabled || !introConfig.autoplay) return;
      const entry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      if (entry && new URL(entry.name).pathname !== '/') return; // No campaign on internal arrivals.
      if (introConfig.playbackPolicy === 'once-per-session' && wasAttempted(asset.version)) return;
      markAttempted(asset.version); // Attempts, skips, errors and mid-film refreshes all count.
      if (introConfig.respectReducedMotion && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      setActive(true);
    });
    return () => { cancelled = true; };
  }, [asset]);
  // Server HTML and first hydration render match. Without JS the shop is usable.
  return active && asset ? <Playback asset={asset} onComplete={complete} /> : null;
}
