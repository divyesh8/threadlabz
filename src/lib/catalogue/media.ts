// Public product media must belong to this project's Storage bucket. Never
// redirect to arbitrary URLs, SVG placeholders, or reference/moodboard photos.
export function productStoragePath(value: string, origin: string): string | null {
  let path = value;
  if (/^https?:/i.test(value)) {
    try {
      const url = new URL(value);
      if (url.origin !== origin || url.username || url.password || url.hash) return null;
      const match = url.pathname.match(/^\/storage\/v1\/object\/(?:public|sign|authenticated)\/product-images\/(.+)$/);
      if (!match) return null;
      path = decodeURIComponent(match[1]);
    } catch { return null; }
  }
  if (path.length > 300 || !/^(?:uploads|[0-9a-f-]{36})\/[A-Za-z0-9_-]+\.(?:jpg|jpeg|png|webp)$/i.test(path)) return null;
  return path;
}

export function isRaster(bytes: Uint8Array, type: string) {
  return (type === "image/jpeg" && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    || (type === "image/png" && [137,80,78,71,13,10,26,10].every((v, i) => bytes[i] === v))
    || (type === "image/webp" && new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP");
}
