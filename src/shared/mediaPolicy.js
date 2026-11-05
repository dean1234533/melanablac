export const MAX_UPLOAD_BYTES = 1_400_000;
export const MAX_IMAGE_EDGE = 1800;
export const MAX_VIDEO_EDGE = 1280;
export const MAX_VIDEO_SECONDS = 30;
export const optimizedImage = (src) =>
  typeof src === "string" && /^\/(art|video)\/.+\.jpe?g$/i.test(src)
    ? src.replace(/\.jpe?g$/i, ".webp")
    : src;
export function fitMedia(width, height, edge, even = false) {
  const scale = Math.min(1, edge / Math.max(width, height));
  const round = (n) =>
    even ? Math.max(2, Math.floor(n / 2) * 2) : Math.max(1, Math.round(n));
  return { width: round(width * scale), height: round(height * scale) };
}
export function videoPoster(src) {
  if (/^\/api\/media\/[^/]+\.(mp4|webm)$/i.test(src || ""))
    return src.replace(/\.(mp4|webm)$/i, ".webp");
  if (/^\/video\/.+\.(mp4|webm)$/i.test(src || ""))
    return src.replace(/\.(mp4|webm)$/i, ".webp");
  return undefined;
}
