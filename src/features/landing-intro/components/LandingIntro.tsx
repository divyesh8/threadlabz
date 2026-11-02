"use client";

import type { CSSProperties } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import {
  introConfig,
  MOBILE_MODE_MEDIA_QUERY,
  prefersDataSaving,
  resolveIntroVariant,
  type IntroAsset,
  type IntroManifest,
  type IntroVariant,
} from '../config/intro.config';
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
  return `(function(){try{if(location.pathname!=="/")return;if(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;var c=navigator&&navigator.connection;if(c&&(c.saveData||c.effectiveType==="slow-2g"||c.effectiveType==="2g"))return;var s=false;try{s=sessionStorage.getItem(${JSON.stringify(key)})==="seen"}catch(e){}if(s)return;var d=document.documentElement;var m=Boolean(window.matchMedia&&window.matchMedia(${JSON.stringify(MOBILE_MODE_MEDIA_QUERY)}).matches);d.dataset.introBoot=${JSON.stringify(version)};d.dataset.introVariant=m?"mobile":"desktop";d.dataset.introStage="playing";var p=m?${JSON.stringify(mobilePoster)}:${JSON.stringify(desktopPoster)};if(p&&document.head&&!document.querySelector("link[data-intro-poster]")){var l=document.createElement("link");l.rel="preload";l.as="image";l.href=p;l.fetchPriority="high";l.dataset.introPoster="1";document.head.appendChild(l)}window.__tlIntroSafety=setTimeout(function(){delete d.dataset.introBoot;delete d.dataset.introVariant;if(d.dataset.introStage==="playing")delete d.dataset.introStage},7000)}catch(e){}})();`;
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

function selectResponsiveAsset(manifest: IntroManifest): { variant: IntroVariant; asset: IntroAsset } | null {
  const isMobileMode = typeof window !== 'undefined' && window.matchMedia(MOBILE_MODE_MEDIA_QUERY).matches;
  return resolveIntroVariant(manifest, isMobileMode);
}

function Playback({
  asset,
  variant,
  onComplete,
}: {
  asset: IntroAsset;
  variant: IntroVariant;
  onComplete: () => void;
}) {
  const focalY = asset.aspectRatio < 1 && variant === 'desktop' ? 0.508 : 0.5;
  const {
    videoRef,
    canvasRef,
    stageRef,
    dialogRef,
    phase,
    canSkip,
    handlePointerUp,
    handleClick,
    handleCancel,
  } = useLandingIntro(
    introConfig,
    {
      src: asset.src,
      poster: asset.poster,
      backgroundColor: asset.backgroundColor || '#f4ede5',
      focalY,
    },
    onComplete,
  );

  const stageStyle = {
    '--intro-bg': asset.backgroundColor || '#f4ede5',
    '--intro-poster': `url("${asset.poster}")`,
    '--intro-pos': asset.aspectRatio < 1 && variant === 'desktop' ? '50% 50.8%' : '50% 50%',
    '--intro-duration': `${introConfig.transitionDuration}ms`,
  } as CSSProperties;

  return createPortal(
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-label="ThreadLabz campaign film"
      data-landing-intro
      data-intro-variant={variant}
      data-intro-source={asset.source}
      data-intro-src={asset.src}
      data-intro-poster={asset.poster}
      data-phase={phase}
      data-skip-ready={canSkip ? 'true' : 'false'}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
      onCancel={handleCancel}
    >
      <div ref={stageRef} className={styles.stage} style={stageStyle}>
        <div className={styles.mediaPlane}>
          <canvas
            ref={canvasRef}
            width={asset.width}
            height={asset.height}
            className={styles.canvas}
            data-intro-canvas
            aria-hidden="true"
          />
          <div className={styles.edgeBlend} aria-hidden="true" />
          <div className={styles.veil} aria-hidden="true" />
        </div>
      </div>
      <video
        ref={videoRef}
        width={asset.width}
        height={asset.height}
        poster={asset.poster}
        className={styles.decoderVideo}
        muted={introConfig.muted}
        loop={introConfig.loop}
        playsInline
        controls={false}
        preload="none"
        disablePictureInPicture
        disableRemotePlayback
        data-intro-decoder
        aria-hidden="true"
      />
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
  const [selected, setSelected] = useState<{ variant: IntroVariant; asset: IntroAsset } | null>(null);
  const complete = useCallback(() => setSelected(null), []);

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
        delete document.documentElement.dataset.introVariant;
        delete document.documentElement.dataset.introStage;
        setSelected(null);
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
      if (prefersDataSaving()) {
        markAttempted(campaignVersion);
        deactivate();
        return;
      }
      document.documentElement.dataset.introVariant = chosen.variant;
      markAttempted(campaignVersion);
      setSelected(chosen);
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
    '--intro-pos-desktop': desktopAsset.aspectRatio < 1 ? '50% 50.8%' : '50% 50%',
    '--intro-pos-mobile': '50% 50%',
  } as CSSProperties;

  return (
    <>
      <div className={styles.bootOverlay} style={bootStyle} data-intro-boot-cover aria-hidden="true" />
      <InlineBootstrap html={buildBootstrapScript(campaignVersion, desktopAsset.poster, mobileAsset.poster)} />
      {selected && pathname === '/' ? (
        <Playback asset={selected.asset} variant={selected.variant} onComplete={complete} />
      ) : null}
    </>
  );
}
