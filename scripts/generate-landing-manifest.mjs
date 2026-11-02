import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import sharp from 'sharp';

const exec = promisify(execFile);
const require = createRequire(import.meta.url);

function binary(name) {
  if (process.env[`${name.toUpperCase()}_PATH`]) return process.env[`${name.toUpperCase()}_PATH`];
  try { return require(`@${name}-installer/${name}`).path; } catch { return name; }
}

export const mediaTools = { ffmpeg: binary('ffmpeg'), ffprobe: binary('ffprobe') };

const VIDEO_EXTENSION = /\.(mp4|webm|mov)$/i;
const POSTER_STEM = /(?:^|[-_.])poster(?:$|[-_.])/i;
const DESKTOP_ROLE = /(?:^|[-_.])(desktop|landscape)$/i;
const MOBILE_ROLE = /(?:^|[-_.])(mobile|portrait)$/i;
const GENERATED_OUTPUT = /^[a-f0-9]{64}(?:\.(mp4|webm)|\.poster\.webp)$/;

const run = (bin, args) => exec(bin, args, { windowsHide: true, timeout: 300_000, maxBuffer: 8 * 1024 * 1024 });
const runBuffer = (bin, args) => exec(bin, args, { windowsHide: true, encoding: 'buffer', timeout: 300_000, maxBuffer: 24 * 1024 * 1024 });

// Deterministic ASCII/Unicode code-point sort independent of OS or filesystem order.
const compareCodePoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export function classifyVideoRole(filename) {
  const stem = path.basename(filename, path.extname(filename));
  if (DESKTOP_ROLE.test(stem)) return 'desktop';
  if (MOBILE_ROLE.test(stem)) return 'mobile';
  return 'universal';
}

export function isCandidateVideoFile(entry) {
  if (!entry.isFile() || entry.name.startsWith('.')) return false;
  if (!VIDEO_EXTENSION.test(entry.name)) return false;
  const stem = path.basename(entry.name, path.extname(entry.name));
  if (POSTER_STEM.test(stem)) return false;
  return true;
}

export async function probe(file) {
  const { stdout } = await run(mediaTools.ffprobe, ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', file]);
  return JSON.parse(stdout);
}

async function digest(file) {
  const hash = createHash('sha256').update('threadlabz-intro-v3\0');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

async function decode(file, videoIndex = 0) {
  await run(mediaTools.ffmpeg, ['-v', 'error', '-xerror', '-i', file, '-map', `0:${videoIndex}`, '-an', '-f', 'null', '-']);
}

const toHex = value => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0');

async function generatePosterAndColor(videoFile, outputFile) {
  const { stdout } = await runBuffer(mediaTools.ffmpeg, [
    '-v', 'error',
    '-i', videoFile,
    '-frames:v', '1',
    '-f', 'image2pipe',
    '-vcodec', 'png',
    '-',
  ]);
  const image = sharp(stdout);
  const { data, info } = await image
    .clone()
    .resize(32, 32, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Average perimeter pixels of Frame 0 so the stage surface blends seamlessly with the video edges.
  let r = 0, g = 0, b = 0, count = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (x > 1 && x < info.width - 2 && y > 1 && y < info.height - 2) continue;
      const idx = (y * info.width + x) * 3;
      r += data[idx];
      g += data[idx + 1];
      b += data[idx + 2];
      count++;
    }
  }
  const backgroundColor = count > 0 ? `#${toHex(r / count)}${toHex(g / count)}${toHex(b / count)}` : '#f4ede5';

  await image
    .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toFile(outputFile);

  return backgroundColor;
}

async function listRoleFolderCandidates(sourceDir, roleFolder) {
  const folderPath = path.join(sourceDir, roleFolder);
  const stat = await fs.stat(folderPath).catch(() => null);
  if (!stat || !stat.isDirectory()) return [];
  const entries = await fs.readdir(folderPath, { withFileTypes: true });
  return entries
    .filter(isCandidateVideoFile)
    .map(entry => entry.name)
    .sort(compareCodePoint)
    .map(name => ({
      source: `${roleFolder}/${name}`,
      file: path.join(folderPath, name),
      forcedRole: roleFolder,
    }));
}

export async function generateLandingManifest({ root = path.resolve(fileURLToPath(new URL('..', import.meta.url))), warn = console.warn } = {}) {
  const source = path.join(root, 'public/landing-video');
  const output = path.join(root, 'public/_landing-intro');
  const manifestFile = path.join(root, 'src/features/landing-intro/generated/manifest.json');
  await fs.mkdir(source, { recursive: true });
  await fs.mkdir(output, { recursive: true });
  await fs.mkdir(path.dirname(manifestFile), { recursive: true });

  const entries = await fs.readdir(source, { withFileTypes: true });
  const rootCandidates = entries
    .filter(isCandidateVideoFile)
    .map(entry => entry.name)
    .sort(compareCodePoint)
    .map(name => ({
      source: name,
      file: path.join(source, name),
      forcedRole: null,
    }));

  const [desktopFolderCandidates, mobileFolderCandidates] = await Promise.all([
    listRoleFolderCandidates(source, 'desktop'),
    listRoleFolderCandidates(source, 'mobile'),
  ]);

  const candidates = [
    ...desktopFolderCandidates,
    ...mobileFolderCandidates,
    ...rootCandidates,
  ];

  const buckets = { desktop: [], mobile: [], universal: [] };

  for (const candidate of candidates) {
    const { source: sourceLabel, file, forcedRole } = candidate;
    try {
      const metadata = await probe(file);
      const video = metadata.streams.find(stream => stream.codec_type === 'video' && !stream.disposition?.attached_pic);
      const audio = metadata.streams.find(stream => stream.codec_type === 'audio');
      const extension = path.extname(file).toLowerCase();
      const container = metadata.format.format_name.split(',');
      if (extension === '.webm' ? !container.includes('webm') : !container.includes('mov')) {
        throw Error('Extension does not match an MP4/MOV or WebM container');
      }
      if (!video || !video.width || !video.height || !(Number(metadata.format.duration) > 0)) {
        throw Error('No playable video stream or finite duration');
      }
      await decode(file, video.index);
      const version = await digest(file);
      const compatibleMp4 = extension === '.mp4'
        && video.codec_name === 'h264'
        && video.pix_fmt === 'yuv420p'
        && !video.tags?.rotate
        && !video.side_data_list?.some(item => item.rotation);
      const compatibleWebm = extension === '.webm'
        && ['vp8', 'vp9'].includes(video.codec_name)
        && ['yuv420p', 'yuvj420p'].includes(video.pix_fmt);
      const ext = compatibleWebm ? 'webm' : 'mp4';
      const target = path.join(output, `${version}.${ext}`);

      const targetExists = await fs.stat(target).then(s => s.size > 0).catch(() => false);
      if (!targetExists) {
        if (compatibleWebm) {
          if (!audio) {
            await fs.copyFile(file, target);
          } else {
            await run(mediaTools.ffmpeg, ['-v', 'error', '-y', '-i', file, '-map', `0:${video.index}`, '-an', '-c:v', 'copy', target]);
          }
        } else {
          if (!compatibleMp4) {
            warn(`[landing-intro] Converting ${sourceLabel} to browser-compatible silent H.264 MP4.`);
          }
          await run(mediaTools.ffmpeg, [
            '-v', 'error',
            '-y',
            '-i', file,
            '-map', `0:${video.index}`,
            '-an',
            '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2,setsar=1:1',
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-crf', '23',
            '-pix_fmt', 'yuv420p',
            '-movflags', '+faststart',
            target,
          ]);
          await decode(target);
        }
      } else if (!compatibleMp4 && !compatibleWebm) {
        warn(`[landing-intro] Converting ${sourceLabel} to browser-compatible silent H.264 MP4.`);
      }

      const normalized = await probe(target);
      const stream = normalized.streams.find(item => item.codec_type === 'video');
      const [sarWidth, sarHeight] = (stream.sample_aspect_ratio || '1:1').split(':').map(Number);
      const aspectRatio = stream.width / stream.height * (sarWidth > 0 && sarHeight > 0 ? sarWidth / sarHeight : 1);

      const posterFilename = `${version}.poster.webp`;
      const posterTarget = path.join(output, posterFilename);
      const backgroundColor = await generatePosterAndColor(target, posterTarget);

      const role = forcedRole ?? classifyVideoRole(sourceLabel);
      buckets[role].push({
        source: sourceLabel,
        role,
        src: `/_landing-intro/${version}.${ext}`,
        poster: `/_landing-intro/${posterFilename}`,
        backgroundColor,
        version,
        mimeType: `video/${ext}`,
        width: stream.width,
        height: stream.height,
        aspectRatio,
        duration: Number(normalized.format.duration),
        hasAudio: false,
      });
    } catch (error) {
      warn(`[landing-intro] Ignoring ${sourceLabel}: ${error.code === 'ENOENT' ? 'Media tooling missing. Run npm ci including optional/dev dependencies, or set FFMPEG_PATH and FFPROBE_PATH.' : String(error.message).slice(0, 700)}. Replace/re-encode the file as H.264/AAC MP4 and rebuild.`);
    }
  }

  const landscapeUniversal = buckets.universal.find(item => item.aspectRatio > 1.05) ?? null;
  const portraitUniversal = buckets.universal.find(item => item.aspectRatio < 0.95) ?? null;
  const autoPairedUniversal = buckets.desktop.length === 0
    && buckets.mobile.length === 0
    && buckets.universal.length === 2
    && Boolean(landscapeUniversal && portraitUniversal);

  for (const [role, list] of Object.entries(buckets)) {
    if (role === 'universal' && autoPairedUniversal) continue;
    if (list.length > 1) {
      warn(`[landing-intro] Multiple valid ${role} videos found; selected alphabetically first: ${list[0].source}. Remove extra files from public/landing-video/.`);
    }
  }

  const desktop = buckets.desktop[0] ?? landscapeUniversal ?? buckets.universal[0] ?? buckets.mobile[0] ?? null;
  const mobile = buckets.mobile[0] ?? portraitUniversal ?? buckets.universal[0] ?? buckets.desktop[0] ?? null;
  const asset = desktop ?? mobile ?? null;

  if (!asset) {
    warn('[landing-intro] No valid videos. The homepage will open normally without an intro.');
  }

  const version = desktop && mobile
    ? (desktop.version === mobile.version
      ? desktop.version
      : createHash('sha256').update(`threadlabz-campaign-v2:${desktop.version}:${mobile.version}`).digest('hex'))
    : (asset?.version ?? null);

  const manifest = {
    schemaVersion: 2,
    version,
    asset,
    desktop,
    mobile,
  };

  const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
  if (await fs.readFile(manifestFile, 'utf8').catch(() => '') !== serialized) {
    await fs.writeFile(`${manifestFile}.tmp`, serialized);
    await fs.rename(`${manifestFile}.tmp`, manifestFile);
  }

  const keep = new Set(
    [desktop, mobile]
      .filter(Boolean)
      .flatMap(item => [item.src.split('/').at(-1), item.poster.split('/').at(-1)]),
  );

  for (const name of await fs.readdir(output)) {
    if (GENERATED_OUTPUT.test(name) && !keep.has(name)) {
      await fs.unlink(path.join(output, name));
    }
  }

  return manifest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const result = await generateLandingManifest();
  let summary = 'intro disabled';
  if (result.desktop && result.mobile && result.desktop.source !== result.mobile.source) {
    summary = `desktop=${result.desktop.source} (${result.desktop.width}x${result.desktop.height}), mobile=${result.mobile.source} (${result.mobile.width}x${result.mobile.height})`;
  } else if (result.asset) {
    const hint = result.asset.role === 'mobile'
      ? ' (desktop fallback -> mobile; add a widescreen video to public/landing-video/desktop/)'
      : result.asset.role === 'desktop'
        ? ' (mobile fallback -> desktop; add a vertical video to public/landing-video/mobile/)'
        : '';
    summary = `${result.asset.source}${hint}`;
  }
  console.log(`[landing-intro] Manifest ready: ${summary}`);
}
