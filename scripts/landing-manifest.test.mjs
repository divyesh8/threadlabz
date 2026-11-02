import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { generateLandingManifest, mediaTools, probe } from './generate-landing-manifest.mjs';
import { MOBILE_MODE_MEDIA_QUERY, prefersDataSaving, resolveIntroVariant } from '../src/features/landing-intro/config/intro.config.ts';

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'threadlabz-intro-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const folder = path.join(root, 'public/landing-video');
  await fs.mkdir(folder, { recursive: true });
  const warnings = [];
  return { root, folder, warnings, generate: () => generateLandingManifest({ root, warn: text => warnings.push(text) }) };
}

function video(file, { size = '160x240', codec = 'libx264', duration = '0.4', color = '0xf4ede5' } = {}) {
  execFileSync(
    mediaTools.ffmpeg,
    ['-v', 'error', '-y', '-f', 'lavfi', '-i', `color=c=${color}:s=${size}:d=${duration}`, '-c:v', codec, '-pix_fmt', 'yuv420p', file],
    { windowsHide: true },
  );
}

test('empty/missing video directory bypasses; manifest is outside source folder', async t => {
  const f = await fixture(t);
  const manifest = await f.generate();
  assert.equal(manifest.asset, null);
  assert.equal(manifest.desktop, null);
  assert.equal(manifest.mobile, null);
  assert.equal(manifest.version, null);
  assert.deepEqual(await fs.readdir(f.folder), []);
  assert.equal(JSON.parse(await fs.readFile(path.join(f.root, 'src/features/landing-intro/generated/manifest.json'), 'utf8')).asset, null);
});

test('one universal video generates hashed video, Frame-0 WebP poster, sampled color, and deterministic manifest', async t => {
  const f = await fixture(t);
  video(path.join(f.folder, 'campaign.mp4'));
  const first = await f.generate();
  const second = await f.generate();
  assert.deepEqual(first, second);
  assert.equal(first.asset.source, 'campaign.mp4');
  assert.equal(first.asset.role, 'universal');
  assert.equal(first.asset.width, 160);
  assert.equal(first.asset.height, 240);
  assert.match(first.asset.poster, /^\/_landing-intro\/[a-f0-9]{64}\.poster\.webp$/);
  assert.match(first.asset.backgroundColor, /^#[0-9a-f]{6}$/);
  assert.deepEqual(first.desktop, first.asset);
  assert.deepEqual(first.mobile, first.asset);
  assert.ok((await fs.stat(path.join(f.root, 'public', first.asset.src))).size > 0);
  assert.ok((await fs.stat(path.join(f.root, 'public', first.asset.poster))).size > 0);
});

test('images, JSON, Markdown, hidden videos, poster assets, and video-named directories are ignored', async t => {
  const f = await fixture(t);
  for (const name of ['still.png', 'poster.webp', 'manifest.json', 'notes.md', 'text.txt', '.hidden.mp4']) {
    await fs.writeFile(path.join(f.folder, name), 'not a video');
  }
  video(path.join(f.folder, 'poster.mp4'));
  video(path.join(f.folder, 'campaign-poster.mp4'));
  video(path.join(f.folder, 'intro.poster.webm'), { codec: 'libvpx' });
  await fs.mkdir(path.join(f.folder, 'directory.mp4'));
  assert.equal((await f.generate()).asset, null);
  assert.equal(f.warnings.some(w => w.includes('Ignoring')), false);
});

test('multiple valid videos in same role choose deterministic code-point first and warn', async t => {
  const f = await fixture(t);
  video(path.join(f.folder, 'z.mp4'));
  video(path.join(f.folder, 'a.mp4'));
  assert.equal((await f.generate()).asset.source, 'a.mp4');
  assert.ok(f.warnings.some(w => w.includes('selected alphabetically first: a.mp4')));
});

test('desktop and mobile role naming convention pairs variants and falls back sensibly', async t => {
  const f = await fixture(t);
  video(path.join(f.folder, 'season-mobile.mp4'), { size: '180x320' });
  const mobileOnly = await f.generate();
  assert.equal(mobileOnly.mobile.source, 'season-mobile.mp4');
  assert.equal(mobileOnly.desktop.source, 'season-mobile.mp4', 'desktop falls back to mobile when only mobile exists');

  video(path.join(f.folder, 'season-desktop.mp4'), { size: '320x180' });
  const paired = await f.generate();
  assert.equal(paired.desktop.source, 'season-desktop.mp4');
  assert.equal(paired.desktop.width, 320);
  assert.equal(paired.mobile.source, 'season-mobile.mp4');
  assert.equal(paired.mobile.width, 180);
  assert.notEqual(paired.version, mobileOnly.version, 'adding desktop variant updates combined campaign version');
});

test('desktop and mobile subfolders pair separate videos regardless of filename and resolve by browser mode', async t => {
  const f = await fixture(t);
  const desktopDir = path.join(f.folder, 'desktop');
  const mobileDir = path.join(f.folder, 'mobile');
  await fs.mkdir(desktopDir, { recursive: true });
  await fs.mkdir(mobileDir, { recursive: true });
  await fs.writeFile(path.join(desktopDir, '.gitkeep'), '');

  video(path.join(mobileDir, '1000100811.mp4'), { size: '180x320' });
  const mobileOnly = await f.generate();
  assert.equal(mobileOnly.mobile.source, 'mobile/1000100811.mp4');
  assert.equal(mobileOnly.mobile.role, 'mobile');
  assert.equal(mobileOnly.desktop.source, 'mobile/1000100811.mp4', 'desktop falls back until desktop folder has a video');

  video(path.join(desktopDir, '1000100999.mp4'), { size: '320x180' });
  const paired = await f.generate();
  assert.equal(paired.desktop.source, 'desktop/1000100999.mp4');
  assert.equal(paired.desktop.role, 'desktop');
  assert.equal(paired.desktop.width, 320);
  assert.equal(paired.desktop.height, 180);
  assert.equal(paired.mobile.source, 'mobile/1000100811.mp4');
  assert.equal(paired.mobile.role, 'mobile');
  assert.equal(paired.mobile.width, 180);
  assert.equal(paired.mobile.height, 320);
  assert.notEqual(paired.desktop.src, paired.mobile.src);
  assert.notEqual(paired.desktop.poster, paired.mobile.poster);

  assert.equal(MOBILE_MODE_MEDIA_QUERY, '(max-width: 767px), (max-aspect-ratio: 4/5)');
  const desktopChoice = resolveIntroVariant(paired, false);
  const mobileChoice = resolveIntroVariant(paired, true);
  assert.equal(desktopChoice.variant, 'desktop');
  assert.equal(desktopChoice.asset.src, paired.desktop.src);
  assert.equal(mobileChoice.variant, 'mobile');
  assert.equal(mobileChoice.asset.src, paired.mobile.src);
});

test('two untagged videos with landscape and portrait aspect ratios auto-pair into desktop and mobile', async t => {
  const f = await fixture(t);
  video(path.join(f.folder, '1000100811.mp4'), { size: '180x320' });
  video(path.join(f.folder, '1000100812.mp4'), { size: '320x180' });
  const paired = await f.generate();
  assert.equal(paired.desktop.source, '1000100812.mp4');
  assert.equal(paired.mobile.source, '1000100811.mp4');
  assert.equal(f.warnings.length, 0);
});

test('corrupt and misleading extension files are rejected without losing a valid campaign', async t => {
  const f = await fixture(t);
  await fs.writeFile(path.join(f.folder, 'a.mp4'), 'fake mp4 contents');
  video(path.join(f.folder, 'b.mp4'));
  await fs.copyFile(path.join(f.folder, 'b.mp4'), path.join(f.folder, 'a.webm'));
  assert.equal((await f.generate()).asset.source, 'b.mp4');
  assert.equal(f.warnings.filter(w => w.includes('Ignoring')).length, 2);
});

test('corrupt-only folder bypasses rather than emitting an invalid asset', async t => {
  const f = await fixture(t);
  await fs.writeFile(path.join(f.folder, 'broken.mov'), 'broken');
  assert.equal((await f.generate()).asset, null);
});

test('MOV with incompatible codec is automatically converted to H.264 MP4 with poster', async t => {
  const f = await fixture(t);
  video(path.join(f.folder, 'season.mov'), { codec: 'mpeg4' });
  const { asset } = await f.generate();
  assert.equal(asset.source, 'season.mov');
  assert.equal(asset.mimeType, 'video/mp4');
  assert.ok((await fs.stat(path.join(f.root, 'public', asset.poster))).size > 0);
  assert.ok(f.warnings.some(w => w.includes('Converting')));
});

test('WebM is recognized from its container and streams and generates poster', async t => {
  const f = await fixture(t);
  video(path.join(f.folder, 'season.webm'), { codec: 'libvpx' });
  const { asset } = await f.generate();
  assert.equal(asset.mimeType, 'video/webm');
  assert.ok((await fs.stat(path.join(f.root, 'public', asset.poster))).size > 0);
});

test('embedded audio tracks are stripped so intro assets are silent and mobile browsers do not classify them as standalone media', async t => {
  const f = await fixture(t);
  const withAudio = path.join(f.folder, 'with-audio.mp4');
  execFileSync(
    mediaTools.ffmpeg,
    [
      '-v', 'error', '-y',
      '-f', 'lavfi', '-i', 'color=c=0xf4ede5:s=180x320:d=0.4',
      '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
      '-shortest',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      withAudio,
    ],
    { windowsHide: true },
  );
  const { asset } = await f.generate();
  assert.equal(asset.hasAudio, false);
  const outProbe = await probe(path.join(f.root, 'public', asset.src));
  assert.equal(outProbe.streams.some(s => s.codec_type === 'audio'), false, 'generated MP4 contains zero audio streams');

  assert.equal(prefersDataSaving({ connection: { saveData: true, effectiveType: '4g' } }), true);
  assert.equal(prefersDataSaving({ connection: { saveData: false, effectiveType: '2g' } }), true);
  assert.equal(prefersDataSaving({ connection: { saveData: false, effectiveType: '4g' } }), false);
  assert.equal(prefersDataSaving({}), false);
});

test('replacement changes version, orientation, duration, poster, and cleans stale files without source edits', async t => {
  const f = await fixture(t);
  video(path.join(f.folder, 'old.mp4'));
  const previous = (await f.generate()).asset;
  await fs.unlink(path.join(f.folder, 'old.mp4'));
  video(path.join(f.folder, 'entirely-different-name.mp4'), { size: '320x180', duration: '0.8' });
  const next = (await f.generate()).asset;
  assert.notEqual(next.version, previous.version);
  assert.notEqual(next.poster, previous.poster);
  assert.equal(next.source, 'entirely-different-name.mp4');
  assert.equal(next.width, 320);
  assert.equal(next.height, 180);
  assert.ok(next.duration > previous.duration);
  const generatedFiles = (await fs.readdir(path.join(f.root, 'public/_landing-intro'))).sort();
  assert.deepEqual(generatedFiles, [next.poster.split('/').at(-1), next.src.split('/').at(-1)].sort());
  await fs.unlink(path.join(f.folder, next.source));
  assert.equal((await f.generate()).asset, null, 'removing campaign does not leave a stale manifest');
  assert.deepEqual(await fs.readdir(path.join(f.root, 'public/_landing-intro')), []);
});
