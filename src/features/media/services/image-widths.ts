// Match Next's responsive candidates without adding an authorization-bypassing cache.
export const PRODUCT_IMAGE_WIDTHS = [32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840];

export function catalogueImageLoader({ src, width }: { src: string; width: number }) {
  const safeWidth = PRODUCT_IMAGE_WIDTHS.find(value => value >= width) ?? 3840;
  return `${src}?w=${safeWidth}`;
}
