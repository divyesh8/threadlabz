import { z } from 'zod';

const schema = z.object({
  enabled: z.boolean(),
  autoplay: z.boolean(),
  muted: z.literal(true), // Browser autoplay requires muted inline playback until user gesture.
  loop: z.literal(false),
  skipUnlockDelay: z.number().min(2000).max(5000),
  transitionDuration: z.number().min(650).max(1000),
  reducedMotionTransitionDuration: z.number().min(0).max(400),
  startupTimeout: z.number().min(1000).max(15000),
  stallTimeout: z.number().min(1000).max(30000),
  playbackPolicy: z.enum(['once-per-session', 'always']),
  respectReducedMotion: z.boolean(),
});

export const introConfig = schema.parse({
  enabled: true,
  autoplay: true,
  muted: true,
  loop: false,
  skipUnlockDelay: 2000,
  transitionDuration: 850,
  reducedMotionTransitionDuration: 200,
  startupTimeout: 4500,
  stallTimeout: 5000,
  playbackPolicy: 'once-per-session',
  respectReducedMotion: true,
});

export type IntroConfig = z.infer<typeof schema>;

export type IntroAsset = {
  source: string;
  role?: 'desktop' | 'mobile' | 'universal';
  src: string;
  poster: string;
  backgroundColor: string;
  version: string;
  mimeType: string;
  width: number;
  height: number;
  aspectRatio: number;
  duration: number;
  hasAudio: boolean;
};

export type IntroManifest = {
  schemaVersion: number;
  version: string | null;
  asset: IntroAsset | null;
  desktop: IntroAsset | null;
  mobile: IntroAsset | null;
};
