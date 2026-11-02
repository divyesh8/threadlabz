# ThreadLabz Cinematic Landing Intro

## Replacing or Updating the Campaign Films (No Code Edits Required)

The landing intro supports **two separate videos** so desktop and mobile each play their native composition at full sharpness:

1. **Mobile video (`9:16` vertical, e.g. `1080 × 1920`)**:
   - Place your mobile video inside `public/landing-video/mobile/` (any filename works, e.g. `1000100811.mp4`).
2. **Desktop video (`16:9` widescreen, e.g. `1920 × 1080`)**:
   - Place your desktop video inside `public/landing-video/desktop/` (any filename works, e.g. `desktop-intro.mp4`).
3. *(Alternative flat-folder options)*: You can also drop files directly in `public/landing-video/` using `-desktop` / `-landscape` and `-mobile` / `-portrait` suffixes, or drop one widescreen (`> 1.05` aspect ratio) and one portrait (`< 0.95` aspect ratio) video directly into `public/landing-video/` to have them paired automatically.
4. Run `npm run dev` (locally) or `npm run build` (Vercel / production). Both automatically run `scripts/generate-landing-manifest.mjs` (or run `npm run intro:generate` directly).

Removing all video files from `public/landing-video/` (including `desktop/` and `mobile/`) cleanly disables the intro without touching JSX, CSS, or configuration.

---

## Browser Mode Detection (Mobile vs Desktop)

Before First Paint (`<InlineBootstrap>`) and on client mount (`resolveIntroVariant`), the browser evaluates:

```css
(max-width: 767px), (max-aspect-ratio: 4/5)
```

- **Mobile mode (`variant = "mobile"`)**: Phones (`≤ 767px` wide) and portrait tablets (`768 × 1024`, aspect ratio `≤ 4/5`) preload **only** the mobile Frame-0 poster and stream **only** the mobile video (`manifest.mobile`).
- **Desktop mode (`variant = "desktop"`)**: Laptops, desktops, ultrawide monitors, and desktop windows with side-docked DevTools (`> 767px` and aspect ratio `> 4/5`) preload **only** the desktop Frame-0 poster and stream **only** the desktop video (`manifest.desktop`).
- Neither mode downloads the other device's video or poster.

---

## Smart Asset Pipeline & Deterministic Selection Rules

- **Source directories**: `public/landing-video/desktop/`, `public/landing-video/mobile/`, and `public/landing-video/` (only `.mp4`, `.webm`, and `.mov` files are considered).
- **Ignored files**: `.gitkeep`, images (`.png`, `.jpg`, `.webp`, `.svg`, `.avif`), `.json`, `.md`, `.txt`, dotfiles, non-role directories, and any file containing `poster` as a stem token (`poster.*`, `*-poster.*`, `*.poster.*`) are automatically ignored.
- **Validation & silent normalization**: Every candidate is verified with `ffprobe` and decoded end-to-end with `ffmpeg`:
  - Audio streams are always stripped (`-an`, `hasAudio: false`) and MP4 streams are normalized to silent H.264 (`yuv420p`, `-crf 23`, `-movflags +faststart`, `setsar=1:1`) so mobile browsers never classify the intro as a standalone audio/video broadcast.
  - Compatible VP8/VP9 WebM files are copied (or audio-stripped) directly.
  - Decodable MOV or non-H.264 files are automatically transcoded to silent H.264 MP4 with `+faststart`.
  - Corrupt or misnamed files are skipped with a build warning without breaking the storefront or overwriting a valid campaign.
- **Frame-0 poster & tonal surface**: For each selected video, `generate-landing-manifest.mjs` extracts Frame 0 into `public/_landing-intro/<sha256>.poster.webp` and samples the perimeter color (`backgroundColor`) so First Paint matches Frame 0 before video decoding completes.
- **Role resolution & fallback**:
  - Stem ending in `desktop` or `landscape` → `desktop` slot.
  - Stem ending in `mobile` or `portrait` → `mobile` slot.
  - Any other stem → `universal` slot.
  - Within each slot, candidates are sorted by strict Unicode code point (`a < b ? -1 : a > b ? 1 : 0`) so selection never depends on OS directory order or locale.
  - Desktop resolves `desktop ?? universal ?? mobile`; mobile resolves `mobile ?? universal ?? desktop`.
  - When a single universal video is supplied, both slots share the same hashed URL so rotating or resizing never triggers a second download.

---

## Responsive Framing Analysis & Asset Specification

### Current Asset (`1000100811.mp4`)

- **Encoded dimensions**: `1088 × 1920` (display aspect ratio `9:16` / `0.5625`, `9.82s`).
- **Measured active artwork bounds**:
  - Opening `"ThreadLabz — MAKE YOUR MARK"` lockup: `x = 141..947` (`74.1%` width), `y = 879..1051` (`9.0%` height), centered at `(50.0%, 50.3%)`.
  - Mid-film brand orbit (`~4.5s–7.0s`): `x = 0..1080` (`99.3%` width), `y = 637..1326` (`35.9%` height), centered vertically at `51.1%`, framed between blurred cream ambient bands (`y = 0..568` and `y = 1352..1920`).
  - Closing `TL` monogram (`~7.5s–9.82s`): `x = 340..743` (`37.0%` width), `y = 826..1087` (`13.6%` height).
- **Behavior under `object-fit: cover`**:
  - **Mobile (`320px`, `375px`, `390px`, `430px`) & Tablet (`768px`)**: `object-position: 50% 50%` fills `100% × 100dvh` edge-to-edge with zero black bars and keeps 100% of the `"ThreadLabz — MAKE YOUR MARK"` wordmark and `TL` monogram unclipped. On tall `~9:19.5` phones (`390×844`, `430×932`), the outer ~9% left/right edges of the mid-film peripheral orbit props crop naturally at the screen edges while keeping the central `TL` mark and primary ring intact.
  - **Desktop (`1280px`, `1440px`)**: `object-position: 50% 50.8%` crops off the top and bottom vertical-video blur bands (`y = 0..568` and `y = 1352..1920`), presenting the `y = 568..1352` sharp campaign band as a crisp widescreen film.
  - **Ultrawide (`21:9` / `2560×1080`)**: Wordmark (`9.0%` height) and closing `TL` monogram (`13.6%` height) remain completely unclipped; the top/bottom periphery of the mid-film orbit (`35.9%` height) crops unless a dedicated `*-desktop.mp4` landscape render is supplied.

### Recommended Dual-Asset Specification for Future Campaigns

For zero peripheral crop across both tall phones and 21:9 ultrawide monitors, drop two renders into `public/landing-video/`:

| Variant | Filename | Resolution | Codec / Container | Safe Zone for Essential Brand Imagery |
| :--- | :--- | :--- | :--- | :--- |
| **Desktop / Landscape** | `campaign-desktop.mp4` | `1920 × 1080` (16:9) | H.264 `yuv420p`, `24–30fps`, `+faststart`, ≤ 6 MB | Central `80%` width × `72%` height (`1536 × 778`) |
| **Mobile / Portrait** | `campaign-mobile.mp4` | `1080 × 1920` (9:16) | H.264 `yuv420p`, `24–30fps`, `+faststart`, ≤ 4 MB | Central `78%` width × `80%` height (`842 × 1536`) |

---

## Architecture & Playback Lifecycle

- **Zero blank page on startup**:
  - `src/app/page.tsx` isolates `NewArrivals` inside its own `<Suspense>` boundary so the root `loading.tsx` never blocks `<LandingIntro />` or `<Hero />`.
  - A synchronous inline bootstrap script in `LandingIntro.tsx` activates `.bootOverlay` (`html[data-intro-boot]`) before First Paint on eligible `/` visits, displaying the sampled Frame-0 cream surface (`#f1ede3`) and preloaded Frame-0 WebP poster immediately while skipping repeat sessions, `prefers-reduced-motion: reduce`, internal navigations, and JS-disabled browsers.
- **Native website `<canvas>` surface & mobile cellular protection**:
  - Opened as a top-layer native `<dialog>` via `showModal()` (`position: fixed; inset: 0; width: 100%; height: 100dvh`) with zero visible buttons, player icons, or text overlays.
  - Video bytes are fetched via `fetch()` into a revocable in-memory `Blob` URL (`blob:...`), decoded on a hidden `2×2px` silent `<video>` element, and painted at `object-fit: cover` onto a full-bleed `<canvas>`. This prevents mobile OEM browsers (Xiaomi, Vivo/OPPO, Samsung Internet, UC, Opera) from displaying *"More mobile data is consuming, do you want to play video?"* dialogs or attaching floating Video Assistant toolbars.
  - Visitors with OS/browser Data Saver enabled (`navigator.connection.saveData === true` or `2g` / `slow-2g`) bypass the intro cleanly with zero media bytes requested.
- **2-second playback-gated skip & spatial dock into `<Hero />`**:
  - Active playback time is tracked from the actual `'playing'` / frame-progression state (`skipUnlockDelay: 2000ms`), pausing if the tab is hidden or buffering.
  - From `0–2s` of playback, pointer/touch/click/keyboard dismissal is ignored while absorbing events so nothing reaches the storefront underneath.
  - After `2s` of playback (or upon natural `ended`), clicking/tapping anywhere or pressing `Enter`, `Space`, or `Escape` triggers an idempotent `900ms` spatial morph: `.stage` geometrically docks into `.home .hero`'s exact rounded bounding box (`clip-path: inset(... round ...)` + uniform compositor `translate3d` / `scale` + warm sand veil) while the ThreadLabz announcement bar, header navigation, and hero editorial content glide cleanly into place.

---

## Verification Commands

```bash
npm run lint
npm run typecheck
npm test

# Terminal 1 (production server):
npm run build:local
node scripts/fixtures/landing-intro-server.mjs --production

# Terminal 2 (browser & visual QA suite):
npm run test:intro
```
