import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const exec = promisify(execFile);
const require = createRequire(import.meta.url);
function binary(name) {
  if (process.env[`${name.toUpperCase()}_PATH`]) return process.env[`${name.toUpperCase()}_PATH`];
  try { return require(`@${name}-installer/${name}`).path; } catch { return name; }
}
export const mediaTools = { ffmpeg: binary('ffmpeg'), ffprobe: binary('ffprobe') };
const run = (binary, args) => exec(binary, args, { windowsHide: true, timeout: 300_000, maxBuffer: 4 * 1024 * 1024 });
export async function probe(file) {
  const { stdout } = await run(mediaTools.ffprobe, ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', file]);
  return JSON.parse(stdout);
}
async function digest(file) {
  const hash = createHash('sha256').update('threadlabz-intro-v1\0');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}
async function decode(file, videoIndex = 0) {
  await run(mediaTools.ffmpeg, ['-v', 'error', '-xerror', '-i', file, '-map', `0:${videoIndex}`, '-map', '0:a:0?', '-f', 'null', '-']);
}

export async function generateLandingManifest({ root = path.resolve(fileURLToPath(new URL('..', import.meta.url))), warn = console.warn } = {}) {
  const source = path.join(root, 'public/landing-video');
  const output = path.join(root, 'public/_landing-intro');
  const manifestFile = path.join(root, 'src/features/landing-intro/generated/manifest.json');
  await fs.mkdir(source, { recursive: true });
  await fs.mkdir(output, { recursive: true });
  await fs.mkdir(path.dirname(manifestFile), { recursive: true });
  const names = (await fs.readdir(source, { withFileTypes: true }))
    .filter(entry => entry.isFile() && !entry.name.startsWith('.') && /\.(mp4|webm|mov)$/i.test(entry.name))
    .map(entry => entry.name).sort(); // Stable Unicode filename order; independent of machine locale.
  const valid = [];
  for (const name of names) {
    const file = path.join(source, name);
    try {
      const metadata = await probe(file);
      const video = metadata.streams.find(stream => stream.codec_type === 'video' && !stream.disposition?.attached_pic);
      const audio = metadata.streams.find(stream => stream.codec_type === 'audio');
      const extension = path.extname(name).toLowerCase();
      const container = metadata.format.format_name.split(',');
      if (extension === '.webm' ? !container.includes('webm') : !container.includes('mov')) throw Error('Extension does not match an MP4/MOV or WebM container');
      if (!video || !video.width || !video.height || !(Number(metadata.format.duration) > 0)) throw Error('No playable video stream or finite duration');
      await decode(file, video.index); // Decode the real film, never an attached cover image.
      const version = await digest(file);
      const directMp4 = extension === '.mp4' && video.codec_name === 'h264' && video.pix_fmt === 'yuv420p' && (!audio || audio.codec_name === 'aac') && !video.tags?.rotate && !video.side_data_list?.some(item => item.rotation);
      const directWebm = extension === '.webm' && ['vp8', 'vp9'].includes(video.codec_name) && ['yuv420p', 'yuvj420p'].includes(video.pix_fmt) && (!audio || ['opus', 'vorbis'].includes(audio.codec_name));
      const ext = directWebm ? 'webm' : 'mp4';
      const target = path.join(output, `${version}.${ext}`);
      if (directWebm) await fs.copyFile(file, target);
      else if (directMp4) await run(mediaTools.ffmpeg, ['-v', 'error', '-y', '-i', file, '-map', `0:${video.index}`, '-map', '0:a:0?', '-c', 'copy', '-movflags', '+faststart', target]);
      else {
        warn(`[landing-intro] Converting ${name} to browser-compatible H.264/AAC MP4.`);
        await run(mediaTools.ffmpeg, ['-v', 'error', '-y', '-i', file, '-map', `0:${video.index}`, '-map', '0:a:0?', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', target]);
        await decode(target);
      }
      const normalized = await probe(target);
      const stream = normalized.streams.find(item => item.codec_type === 'video');
      const [sarWidth, sarHeight] = (stream.sample_aspect_ratio || '1:1').split(':').map(Number);
      const aspectRatio = stream.width / stream.height * (sarWidth > 0 && sarHeight > 0 ? sarWidth / sarHeight : 1);
      valid.push({ source: name, src: `/_landing-intro/${version}.${ext}`, version, mimeType: `video/${ext}`, width: stream.width, height: stream.height, aspectRatio, duration: Number(normalized.format.duration), hasAudio: Boolean(audio) });
    } catch (error) {
      // A broken campaign must never block commerce or leave a stale manifest.
      warn(`[landing-intro] Ignoring ${name}: ${error.code === 'ENOENT' ? 'Media tooling missing. Run npm ci including optional/dev dependencies, or set FFMPEG_PATH and FFPROBE_PATH.' : String(error.message).slice(0, 700)}. Replace/re-encode the file as H.264/AAC MP4 and rebuild.`);
    }
  }
  const asset = valid[0] ?? null;
  if (valid.length > 1) warn(`[landing-intro] Multiple valid videos found; selected alphabetically first: ${asset.source}. Remove other campaigns from public/landing-video/.`);
  if (!asset) warn('[landing-intro] No valid videos. The homepage will open normally without an intro.');
  const manifest = { schemaVersion: 1, asset };
  const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
  if (await fs.readFile(manifestFile, 'utf8').catch(() => '') !== serialized) {
    await fs.writeFile(`${manifestFile}.tmp`, serialized);
    await fs.rename(`${manifestFile}.tmp`, manifestFile);
  }
  // Only remove generated hash-named files in our own output folder.
  for (const name of await fs.readdir(output)) {
    if (/^[a-f0-9]{64}\.(mp4|webm)$/.test(name) && name !== asset?.src.split('/').at(-1)) await fs.unlink(path.join(output, name));
  }
  return manifest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const result = await generateLandingManifest();
  console.log(`[landing-intro] Manifest ready: ${result.asset?.source ?? 'intro disabled'}`);
}
