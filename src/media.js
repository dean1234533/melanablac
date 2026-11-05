import {
  MAX_UPLOAD_BYTES,
  MAX_IMAGE_EDGE,
  MAX_VIDEO_EDGE,
  MAX_VIDEO_SECONDS,
  fitMedia,
} from "./shared/mediaPolicy.js";
const encodeCanvas = (canvas, type, quality) =>
  new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("This browser could not compress the image.")),
      type,
      quality,
    ),
  );

export async function compressImage(file) {
  if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type))
    throw new Error(
      "Choose a JPG, PNG, WebP or AVIF image. Use a video for animations.",
    );
  if (file.size > 40 * 1024 * 1024)
    throw new Error("Choose an image smaller than 40 MB.");
  // Canvas encodes still frames. Reject known animated containers instead of
  // silently turning an uploaded animation into a single picture.
  const prefix = new Uint8Array(await file.slice(0, 65536).arrayBuffer());
  const text = new TextDecoder("latin1").decode(prefix);
  if (
    (file.type === "image/webp" && text.includes("ANIM")) ||
    (file.type === "image/png" && text.includes("acTL")) ||
    (file.type === "image/avif" && text.slice(0, 32).includes("avis"))
  )
    throw new Error(
      "Upload this animation as a video so its motion is preserved.",
    );
  const bitmap = await createImageBitmap(file);
  try {
    let { width, height } = fitMedia(
      bitmap.width,
      bitmap.height,
      MAX_IMAGE_EDGE,
    );
    const canvas = document.createElement("canvas");
    for (let attempt = 0; attempt < 4; attempt++) {
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);
      for (const quality of [0.86, 0.8, 0.72, 0.64]) {
        const blob = await encodeCanvas(canvas, "image/webp", quality);
        if (blob.size <= MAX_UPLOAD_BYTES) return blob;
      }
      width = Math.max(1, Math.round(width * 0.8));
      height = Math.max(1, Math.round(height * 0.8));
    }
    throw new Error(
      "This image could not be compressed enough. Try a smaller image.",
    );
  } finally {
    bitmap.close();
  }
}

class MediaCompressionError extends Error {}

async function encodeVideo(file, onProgress = () => {}, preview) {
  if (!/^video\/(mp4|webm|quicktime|x-m4v)$/.test(file.type))
    throw new MediaCompressionError("Choose an MP4, WebM or MOV video.");
  if (file.size > 100 * 1024 * 1024)
    throw new MediaCompressionError("Choose a clip smaller than 100 MB.");
  if (!window.VideoEncoder || !window.VideoDecoder)
    throw new MediaCompressionError(
      "Video compression is unavailable in this browser. Try a current Chrome, Edge or Safari.",
    );
  // Convert encoded frames directly. This preserves timestamps and motion even
  // when the browser throttles rendering; no real-time screen recording is used.
  const {
    Input,
    MP4,
    WEBM,
    QTFF,
    BlobSource,
    CanvasSink,
    Output,
    BufferTarget,
    Mp4OutputFormat,
    WebMOutputFormat,
    Conversion,
    Quality,
    canEncodeVideo,
    canEncodeAudio,
  } = await import("mediabunny");
  const input = new Input({
    formats: [MP4, WEBM, QTFF],
    source: new BlobSource(file),
  });
  let conversion, timer, removeListener, canvas;
  try {
    onProgress("Reading video…");
    const duration = await input.computeDuration();
    if (
      !Number.isFinite(duration) ||
      duration <= 0 ||
      duration > MAX_VIDEO_SECONDS
    )
      throw new MediaCompressionError(
        `Choose a clip up to ${MAX_VIDEO_SECONDS} seconds long.`,
      );
    const track = await input.getPrimaryVideoTrack(),
      audioTrack = await input.getPrimaryAudioTrack();
    if (
      !track ||
      !(await track.canDecode()) ||
      (audioTrack && !(await audioTrack.canDecode()))
    )
      throw new MediaCompressionError(
        "This video cannot be decoded. Try an MP4 clip.",
      );
    const originalWidth = await track.getDisplayWidth(),
      originalHeight = await track.getDisplayHeight();
    const dimensions = fitMedia(
      originalWidth,
      originalHeight,
      MAX_VIDEO_EDGE,
      true,
    );
    const metrics = await track.computeFrameRateMetrics();
    const frameRate = Math.min(24, metrics.bestGuessFrameRate || 24);
    const mp4 =
      (await canEncodeVideo("avc", dimensions)) &&
      (!audioTrack || (await canEncodeAudio("aac")));
    if (
      !mp4 &&
      (!(await canEncodeVideo("vp9", dimensions)) ||
        (audioTrack && !(await canEncodeAudio("opus"))))
    )
      throw new MediaCompressionError(
        "This browser cannot encode this video. Please try a current browser.",
      );
    const firstFrame = await new CanvasSink(track, {
      ...dimensions,
      fit: "contain",
    }).getCanvas(await track.getFirstTimestamp());
    if (!firstFrame)
      throw new MediaCompressionError("This video has no readable frames.");
    canvas = document.createElement("canvas");
    Object.assign(canvas, dimensions);
    canvas
      .getContext("2d")
      .drawImage(firstFrame.canvas, 0, 0, canvas.width, canvas.height);
    const poster = await encodeCanvas(canvas, "image/webp", 0.8);
    if (preview) preview.appendChild(canvas);
    const target = new BufferTarget();
    const output = new Output({
      format: mp4
        ? new Mp4OutputFormat({ fastStart: "in-memory" })
        : new WebMOutputFormat(),
      target,
    });
    const budget = Math.floor(
      (Math.min(MAX_UPLOAD_BYTES * 0.78, file.size * 0.85) * 8) / duration,
    );
    conversion = await Conversion.init({
      input,
      output,
      tracks: "primary",
      copy: false,
      tags: {},
      video: {
        ...dimensions,
        fit: "contain",
        frameRate,
        codec: mp4 ? "avc" : "vp9",
        quality: new Quality({
          bitrate: Math.max(
            150000,
            Math.min(2000000, budget - (audioTrack ? 64000 : 0)),
          ),
        }),
      },
      audio: {
        codec: mp4 ? "aac" : "opus",
        quality: new Quality({ bitrate: 64000 }),
      },
    });
    if (
      !conversion.isValid ||
      !conversion.utilizedTracks.includes(track) ||
      (audioTrack && !conversion.utilizedTracks.includes(audioTrack))
    )
      throw new MediaCompressionError(
        "This browser cannot preserve all tracks in this video. Try another browser or an MP4 clip.",
      );
    let oversized = false;
    removeListener = target.on("write", ({ end }) => {
      if (end > MAX_UPLOAD_BYTES) {
        oversized = true;
        void conversion.cancel().catch(() => {});
      }
    });
    conversion.onProgress = (progress) =>
      onProgress(
        `Compressing video… ${Math.min(99, Math.round(progress * 100))}%`,
      );
    await Promise.race([
      conversion.execute(),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          void conversion.cancel().catch(() => {});
          reject(
            new MediaCompressionError(
              "Video compression timed out. Try a shorter clip.",
            ),
          );
        }, 90000);
      }),
    ]).catch((error) => {
      if (oversized)
        throw new MediaCompressionError(
          "The compressed video is still too large. Try a shorter clip.",
        );
      throw error;
    });
    const compressed = new Blob([target.buffer], {
      type: mp4 ? "video/mp4" : "video/webm",
    });
    if (!compressed.size || compressed.size > MAX_UPLOAD_BYTES)
      throw new MediaCompressionError(
        "The video could not be compressed enough. Try a shorter clip.",
      );
    const originalCodec = await track.getCodec(),
      audioCodec = await audioTrack?.getCodec();
    const compatibleOriginal =
      file.type === "video/mp4" &&
      originalCodec === "avc" &&
      (!audioCodec || audioCodec === "aac");
    const alreadyOptimised =
      compatibleOriginal &&
      file.size <= MAX_UPLOAD_BYTES &&
      originalWidth <= MAX_VIDEO_EDGE &&
      originalHeight <= MAX_VIDEO_EDGE &&
      (metrics.bestGuessFrameRate || 24) <= 24;
    return {
      video:
        alreadyOptimised && file.size < compressed.size ? file : compressed,
      poster,
    };
  } finally {
    clearTimeout(timer);
    removeListener?.();
    if (conversion?.state === "executing") await conversion.cancel();
    canvas?.remove();
    input.dispose();
  }
}

export async function compressVideo(file, onProgress, preview) {
  try {
    return await encodeVideo(file, onProgress, preview);
  } catch (error) {
    if (error instanceof MediaCompressionError) throw error;
    throw new MediaCompressionError(
      "This video could not be compressed. Try another MP4 clip or a current browser.",
    );
  }
}
