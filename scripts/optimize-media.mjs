import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import sharp from "sharp";
const execute = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const lockPath = path.join(root, "scripts/media-lock.json");
const lock = JSON.parse(await fs.readFile(lockPath, "utf8").catch(() => "{}"));
const backup = process.env.MEDIA_BACKUP_DIR;
const hash = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
async function files(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const output = [];
  for (const entry of entries) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) output.push(...(await files(file)));
    else output.push(file);
  }
  return output;
}
const report = [];
for (const file of await files(publicDir)) {
  const ext = path.extname(file).toLowerCase();
  if (![".jpg", ".jpeg", ".png", ".mp4", ".webm"].includes(ext)) continue;
  const relative = path.relative(publicDir, file);
  const source = await fs.readFile(file);
  const digest = hash(source);
  const webp = /\.jpe?g$/i.test(file);
  const output = webp ? file.replace(/\.jpe?g$/i, ".webp") : file;
  if (
    lock[relative]?.hash === digest &&
    (!webp || lock[relative]?.profile === 2) &&
    (await fs.access(output).then(
      () => true,
      () => false,
    ))
  )
    continue;
  if (backup) {
    const target = path.join(backup, relative);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(file, target, fs.constants.COPYFILE_EXCL).catch((e) => {
      if (e.code !== "EEXIST") throw e;
    });
  }
  let result;
  if (webp) {
    for (const quality of path.basename(file).startsWith("thumb-")
      ? [76, 72, 68]
      : [82, 80, 78, 76]) {
      result = await sharp(source)
        .rotate()
        .webp({ quality, effort: 6 })
        .toBuffer();
      if (result.length < source.length) break;
    }
  } else if (ext === ".png") {
    const candidate = await sharp(source)
      .png({ compressionLevel: 9, effort: 10 })
      .toBuffer();
    result = candidate.length < source.length ? candidate : source;
  } else {
    const temporary = file.replace(/\.(mp4|webm)$/i, ".optimizing.$1");
    try {
      await execute(
        "ffmpeg",
        [
          "-hide_banner",
          "-loglevel",
          "error",
          "-y",
          "-i",
          file,
          "-map",
          "0:v:0",
          "-map",
          "0:a:0?",
          "-vf",
          "scale=w='min(1280,iw)':h='min(1280,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",
          "-c:v",
          ext === ".webm" ? "libvpx-vp9" : "libx264",
          "-crf",
          "26",
          ...(ext === ".webm"
            ? ["-b:v", "0"]
            : ["-preset", "slow", "-pix_fmt", "yuv420p"]),
          "-c:a",
          ext === ".webm" ? "libopus" : "aac",
          "-b:a",
          "96k",
          ...(ext === ".mp4" ? ["-movflags", "+faststart"] : []),
          "-map_metadata",
          "-1",
          temporary,
        ],
        { maxBuffer: 1024 * 1024 },
      );
      const candidate = await fs.readFile(temporary);
      result = candidate.length < source.length ? candidate : source;
    } finally {
      await fs.rm(temporary, { force: true });
    }
  }
  await fs.writeFile(output, result);
  const optimizedHash = hash(await fs.readFile(file));
  lock[relative] = {
    profile: 2,
    hash: optimizedHash,
    output: path.relative(publicDir, output),
    originalBytes: source.length,
    optimizedBytes: result.length,
  };
  report.push({
    file: relative,
    before: source.length,
    after: result.length,
    saved: source.length - result.length,
  });
}
await fs.writeFile(lockPath, JSON.stringify(lock, null, 2) + "\n");
const total = Object.values(lock).reduce(
  (r, x) => ({
    before: r.before + x.originalBytes,
    after: r.after + x.optimizedBytes,
  }),
  { before: 0, after: 0 },
);
console.log(
  JSON.stringify({
    processed: report.length,
    ...total,
    savedBytes: total.before - total.after,
    savedPercent: total.before
      ? Math.round((1 - total.after / total.before) * 100)
      : 0,
  }),
);
if (process.env.MEDIA_REPORT_PATH)
  await fs.writeFile(
    process.env.MEDIA_REPORT_PATH,
    JSON.stringify({ summary: total, files: report }, null, 2),
  );
