"use client";

import type { CSSProperties } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { introConfig, type IntroAsset, type IntroManifest } from '../config/intro.config';
import { markAttempted, sessionKey, wasAttempted } from '../session';
import { useLandingIntro } from '../hooks/useLandingIntro';
import styles from './landing-intro.module.css';

declare global {
  interface Window {
    __tlIntroSafety?: ReturnType<typeof setTimeout>;
  }
}

function buildBootstrapScript(version: string, desktopPoster: string, mobilePoster: string) {
  const key = sessionKey(version);
  return `(function(){try{if(location.pathname!=="/")return;if(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;var s=false;try{s=sessionStorage.getItem(${JSON.stringify(key)})==="seen"}catch(e){}if(s)return;var d=document.documentElement;d.dataset.introBoot=${JSON.stringify(version)};d.dataset.introStage="playing";var m=window.matchMedia&&window.matchMedia("(max-width: 767px), (orientation: portrait)").matches;var p=m?${JSON.stringify(mobilePoster)}:${JSON.stringify(desktopPoster)};if(p&&document.head&&!document.querySelector("link[data-intro-poster]")){var l=document.createElement("link");l.rel="preload";l.as="image";l.href=p;l.fetchPriority="high";l.dataset.introPoster="1";document.head.appendChild(l)}window.__tlIntroSafety=setTimeout(function(){delete d.dataset.introBoot;if(d.dataset.introStage==="playing")delete d.dataset.introStage},7000)}catch(e){}})();`;
}

function InlineBootstrap({ html }: { html: string }) {
  return (
    <script
      type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function selectResponsiveAsset(manifest: IntroManifest): IntroAsset | null {
  const desktop = manifest.desktop ?? manifest.asset ?? manifest.mobile;
  const mobile = manifest.mobile ?? manifest.asset ?? manifest.desktop;
  if (!desktop && !mobile) return null;
  if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px), (orientation: portrait)').matches) {
    return mobile ?? desktop;
  }
  return desktop ?? mobile;
}

function Playback({ asset, onComplete }: { asset: IntroAsset; onComplete: () => void }) {
  const {
    videoRef,
    dialogRef,
    phase,
    canSkip,
    handlePointerUp,
    handleClick,
    handleCancel,
  } = useLandingIntro(introConfig, onComplete);

  const stageStyle = {
    '--intro-bg': asset.backgroundColor || '#f4ede5',
    '--intro-duration': `${introConfig.transitionDuration}ms`,
  } as CSSProperties;

  return createPortal(
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-label="ThreadLabz campaign film"
      data-landing-intro
      data-phase={phase}
      data-skip-ready={canSkip ? 'true' : 'false'}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
      onCancel={handleCancel}
    >
      <div className={styles.stage} style={stageStyle}>
        <video
          ref={videoRef}
          src={asset.src}
          poster={asset.poster}
          width={asset.width}
          height={asset.height}
          className={styles.video}
          autoPlay={introConfig.autoplay}
          muted={introConfig.muted}
          loop={introConfig.loop}
          playsInline
          controls={false}
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
          aria-hidden="true"
        />
        <div className={styles.veil} aria-hidden="true" />
      </div>
      <button
        type="button"
        autoFocus
        data-intro-skip
        className={styles.srSkip}
        aria-disabled={!canSkip}
        aria-label={canSkip ? 'Skip campaign film and enter ThreadLabz store' : 'ThreadLabz campaign film playing'}
        onClick={handleClick}
      >
        Skip campaign film
      </button>
    </dialog>,
    document.body,
  );
}

export function LandingIntro({ manifest }: { manifest: IntroManifest }) {
  const pathname = usePathname();
  const initialPathnameRef = useRef<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<IntroAsset | null>(null);
  const complete = useCallback(() => setSelectedAsset(null), []);

  const campaignVersion = manifest.version ?? manifest.asset?.version ?? null;
  const desktopAsset = manifest.desktop ?? manifest.asset ?? manifest.mobile;
  const mobileAsset = manifest.mobile ?? manifest.asset ?? manifest.desktop;

  useEffect(() => {
    if (initialPathnameRef.current === null) {
      initialPathnameRef.current = window.location.pathname;
    }
    let cancelled = false;
    queueMicrotask(() => {
      if (window.__tlIntroSafety !== undefined) {
        clearTimeout(window.__tlIntroSafety);
        window.__tlIntroSafety = undefined;
      }
      const deactivate = () => {
        delete document.documentElement.dataset.introBoot;
        delete document.documentElement.dataset.introStage;
        setSelectedAsset(null);
      };
      if (cancelled) return;
      if (pathname !== '/') {
        initialPathnameRef.current = pathname;
        deactivate();
        return;
      }
      if (initialPathnameRef.current !== '/') {
        deactivate();
        return;
      }
      if (!campaignVersion || !introConfig.enabled || !introConfig.autoplay) {
        deactivate();
        return;
      }
      const chosen = selectResponsiveAsset(manifest);
      if (!chosen) {
        deactivate();
        return;
      }
      const entry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      if (entry && new URL(entry.name).pathname !== '/') {
        deactivate();
        return;
      }
      if (introConfig.playbackPolicy === 'once-per-session' && wasAttempted(campaignVersion)) {
        deactivate();
        return;
      }
      if (introConfig.respectReducedMotion && matchMedia('(prefers-reduced-motion: reduce)').matches) {
        markAttempted(campaignVersion);
        deactivate();
        return;
      }
      markAttempted(campaignVersion);
      setSelectedAsset(chosen);
    });
    return () => {
      cancelled = true;
    };
  }, [campaignVersion, manifest, pathname]);

  if (!campaignVersion || !desktopAsset || !mobileAsset || !introConfig.enabled) {
    return null;
  }

  const bootStyle = {
    '--intro-bg-desktop': desktopAsset.backgroundColor || '#f4ede5',
    '--intro-bg-mobile': mobileAsset.backgroundColor || '#f4ede5',
    '--intro-poster-desktop': `url("${desktopAsset.poster}")`,
    '--intro-poster-mobile': `url("${mobileAsset.poster}")`,
  } as CSSProperties;

  return (
    <>
      <div className={styles.bootOverlay} style={bootStyle} data-intro-boot-cover aria-hidden="true" />
      <InlineBootstrap html={buildBootstrapScript(campaignVersion, desktopAsset.poster, mobileAsset.poster)} />
      {selectedAsset && pathname === '/' ? <Playback asset={selectedAsset} onComplete={complete} /> : null}
    </>
  );
}
