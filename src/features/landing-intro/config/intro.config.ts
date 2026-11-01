import { z } from 'zod';

const schema = z.object({
  enabled: z.boolean(),
  autoplay: z.boolean(),
  muted: z.literal(true), // Sound is enabled only by the visitor's gesture.
  loop: z.literal(false),
  showSkipButton: z.boolean(),
  showSoundToggle: z.boolean(),
  transitionDuration: z.number().min(800).max(1200),
  finalFrameHold: z.number().min(150).max(250),
  startupTimeout: z.number().min(1000).max(15000),
  stallTimeout: z.number().min(1000).max(30000),
  playbackPolicy: z.enum(['once-per-session', 'always']),
  respectReducedMotion: z.boolean(),
});

export const introConfig = schema.parse({
  enabled: true, autoplay: true, muted: true, loop: false,
  showSkipButton: true, showSoundToggle: true,
  transitionDuration: 1000, finalFrameHold: 200,
  startupTimeout: 5000, stallTimeout: 8000,
  playbackPolicy: 'once-per-session', respectReducedMotion: true,
});

export type IntroConfig = z.infer<typeof schema>;
export type IntroAsset = {
  source: string; src: string; version: string; mimeType: string;
  width: number; height: number; aspectRatio: number; duration: number; hasAudio: boolean;
};
