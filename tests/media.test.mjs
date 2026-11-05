import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  fitMedia,
  optimizedImage,
  videoPoster,
  MAX_UPLOAD_BYTES,
} from "../src/shared/mediaPolicy.js";
import {
  mediaResponse,
  readLimitedBody,
  storeMedia,
} from "../functions/lib/media.js";

test("media sizing preserves proportions without upscaling", () => {
  assert.deepEqual(fitMedia(4000, 2000, 1800), { width: 1800, height: 900 });
  assert.deepEqual(fitMedia(640, 480, 1280, true), { width: 640, height: 480 });
  const portrait = fitMedia(1080, 1920, 1280, true);
  assert.deepEqual(portrait, { width: 720, height: 1280 });
});
test("legacy artwork and uploaded video URLs resolve to compressed images and posters", () => {
  assert.equal(
    optimizedImage("/art/cards/example.jpg"),
    "/art/cards/example.webp",
  );
  assert.equal(
    optimizedImage("/api/media/example.png"),
    "/api/media/example.png",
  );
  assert.equal(
    optimizedImage("https://other.invalid/example.jpg"),
    "https://other.invalid/example.jpg",
  );
  assert.equal(videoPoster("/video/welcome.mp4"), "/video/welcome.webp");
  assert.equal(videoPoster("/api/media/clip.webm"), "/api/media/clip.webp");
  assert.equal(videoPoster("https://other.invalid/clip.mp4"), undefined);
});
test("uploaded videos support closed, open and suffix byte ranges", async () => {
  const bytes = Uint8Array.from({ length: 100 }, (_, i) => i);
  for (const [range, start, end] of [
    ["bytes=10-19", 10, 19],
    ["bytes=90-", 90, 99],
    ["bytes=-5", 95, 99],
  ]) {
    const res = mediaResponse(
      new Request("https://example.invalid/api/media/clip.mp4", {
        headers: { range },
      }),
      bytes,
      "video/mp4",
    );
    assert.equal(res.status, 206);
    assert.equal(res.headers.get("content-range"), `bytes ${start}-${end}/100`);
    assert.equal(res.headers.get("content-length"), String(end - start + 1));
    assert.deepEqual(
      new Uint8Array(await res.arrayBuffer()),
      bytes.slice(start, end + 1),
    );
  }
});
test("invalid ranges return 416 and HEAD never transfers the video", async () => {
  const bytes = new Uint8Array(100);
  for (const range of ["bytes=100-", "bytes=20-10", "bytes=-0", "invalid"])
    assert.equal(
      mediaResponse(
        new Request("https://example.invalid/file", { headers: { range } }),
        bytes,
        "video/mp4",
      ).status,
      416,
    );
  const head = mediaResponse(
    new Request("https://example.invalid/file", {
      method: "HEAD",
      headers: { range: "bytes=10-19" },
    }),
    bytes,
    "video/mp4",
  );
  assert.equal(head.status, 206);
  assert.equal((await head.arrayBuffer()).byteLength, 0);
});
test("upload bodies are bounded even when content-length is absent", async () => {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(8));
      controller.enqueue(new Uint8Array(8));
      controller.close();
    },
  });
  await assert.rejects(
    readLimitedBody(
      new Request("https://example.invalid", {
        method: "POST",
        body: stream,
        duplex: "half",
      }),
      10,
    ),
    (e) => e.status === 413,
  );
  const valid = await readLimitedBody(
    new Request("https://example.invalid", {
      method: "POST",
      body: new Uint8Array(6),
    }),
    10,
  );
  assert.equal(valid.length, 6);
});
test("D1 media storage preserves compressed bytes and their MIME type", async () => {
  let values;
  const env = {
    DB: {
      prepare: () => ({
        bind: (...args) => ({
          run: async () => {
            values = args;
          },
        }),
      }),
    },
  };
  const bytes = new Uint8Array([0, 128, 255]);
  await storeMedia(env, "clip.mp4", bytes, "video/mp4");
  assert.equal(values[1], "video/mp4");
  assert.deepEqual(
    Uint8Array.from(atob(values[2]), (c) => c.charCodeAt(0)),
    bytes,
  );
  assert.ok((MAX_UPLOAD_BYTES * 4) / 3 < 2 * 1024 * 1024);
});
test("all generated image assets decode and none exceeds its JPEG fallback", async () => {
  const root = new URL("../public/", import.meta.url);
  const lock = JSON.parse(
    await fs.readFile(new URL("../scripts/media-lock.json", import.meta.url)),
  );
  for (const [source, item] of Object.entries(lock)) {
    if (!/\.jpe?g$/i.test(source)) continue;
    const output = new URL(item.output, root);
    const metadata = await sharp(await fs.readFile(output)).metadata();
    assert.equal(metadata.format, "webp", source);
    assert.ok((await fs.stat(output)).size <= item.originalBytes, source);
  }
});
