import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { generateLandingManifest, mediaTools } from './generate-landing-manifest.mjs';

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'threadlabz-intro-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const folder = path.join(root, 'public/landing-video');
  await fs.mkdir(folder, { recursive: true });
  const warnings = [];
  return { root, folder, warnings, generate: () => generateLandingManifest({ root, warn: text => warnings.push(text) }) };
}
function video(file, { size = '160x240', codec = 'libx264', duration = '0.4' } = {}) {
  execFileSync(mediaTools.ffmpeg, ['-v', 'error', '-y', '-f', 'lavfi', '-i', `color=c=black:s=${size}:d=${duration}`, '-c:v', codec, '-pix_fmt', 'yuv420p', file], { windowsHide: true });
}

test('empty/missing video directory bypasses; manifest is outside source folder', async t => {
  const f = await fixture(t);
  assert.equal((await f.generate()).asset, null);
  assert.deepEqual(await fs.readdir(f.folder), []);
  assert.equal(JSON.parse(await fs.readFile(path.join(f.root, 'src/features/landing-intro/generated/manifest.json'), 'utf8')).asset, null);
});
test('one real video is validated, copied to a hashed URL, and deterministic', async t => {
  const f = await fixture(t); video(path.join(f.folder, 'campaign.mp4'));
  const first = await f.generate(), second = await f.generate();
  assert.deepEqual(first, second);
  assert.equal(first.asset.source, 'campaign.mp4');
  assert.equal(first.asset.width, 160); assert.equal(first.asset.height, 240);
  assert.ok((await fs.stat(path.join(f.root, 'public', first.asset.src))).size > 0);
});
test('images, JSON, Markdown, hidden videos and video-named directories are ignored', async t => {
  const f = await fixture(t);
  for (const name of ['still.png', 'manifest.json', 'notes.md', 'text.txt', '.hidden.mp4']) await fs.writeFile(path.join(f.folder, name), 'not a video');
  await fs.mkdir(path.join(f.folder, 'directory.mp4'));
  assert.equal((await f.generate()).asset, null);
  assert.equal(f.warnings.some(w => w.includes('Ignoring')), false);
});
test('multiple valid videos choose alphabetical first and warn', async t => {
  const f = await fixture(t); video(path.join(f.folder, 'z.mp4')); video(path.join(f.folder, 'a.mp4'));
  assert.equal((await f.generate()).asset.source, 'a.mp4');
  assert.ok(f.warnings.some(w => w.includes('selected alphabetically first: a.mp4')));
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
  const f = await fixture(t); await fs.writeFile(path.join(f.folder, 'broken.mov'), 'broken');
  assert.equal((await f.generate()).asset, null);
});
test('MOV with incompatible codec is automatically converted to H.264 MP4', async t => {
  const f = await fixture(t); video(path.join(f.folder, 'season.mov'), { codec: 'mpeg4' });
  const { asset } = await f.generate();
  assert.equal(asset.source, 'season.mov'); assert.equal(asset.mimeType, 'video/mp4');
  assert.ok(f.warnings.some(w => w.includes('Converting')));
});
test('WebM is recognized from its container and streams', async t => {
  const f = await fixture(t); video(path.join(f.folder, 'season.webm'), { codec: 'libvpx' });
  assert.equal((await f.generate()).asset.mimeType, 'video/webm');
});
test('replacement changes version, orientation, duration and filename without any source edits', async t => {
  const f = await fixture(t); video(path.join(f.folder, 'old.mp4'));
  const previous = (await f.generate()).asset;
  await fs.unlink(path.join(f.folder, 'old.mp4'));
  video(path.join(f.folder, 'entirely-different-name.mp4'), { size: '320x180', duration: '0.8' });
  const next = (await f.generate()).asset;
  assert.notEqual(next.version, previous.version);
  assert.equal(next.source, 'entirely-different-name.mp4');
  assert.equal(next.width, 320); assert.equal(next.height, 180);
  assert.ok(next.duration > previous.duration);
  assert.deepEqual(await fs.readdir(path.join(f.root, 'public/_landing-intro')), [next.src.split('/').at(-1)]);
  await fs.unlink(path.join(f.folder, next.source));
  assert.equal((await f.generate()).asset, null, 'removing campaign does not leave a stale manifest');
});
