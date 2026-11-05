export async function storeMedia(env, key, buffer, type) {
  if (env.MEDIA)
    return env.MEDIA.put(key, buffer, { httpMetadata: { contentType: type } });
  let binary = "";
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  await env.DB.prepare("INSERT INTO media (key,type,data) VALUES (?,?,?)")
    .bind(key, type, btoa(binary))
    .run();
}
export function mediaResponse(request, buffer, type) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer),
    total = bytes.byteLength;
  const headers = {
    "content-type": type,
    "x-content-type-options": "nosniff",
    "accept-ranges": "bytes",
    "cache-control": "public, max-age=31536000, immutable",
  };
  const range = request.headers.get("range");
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2]))
      return new Response(null, {
        status: 416,
        headers: { ...headers, "content-range": `bytes */${total}` },
      });
    const start =
      match[1] === ""
        ? Math.max(0, total - Number(match[2]))
        : Number(match[1]);
    const end =
      match[1] === "" || match[2] === ""
        ? total - 1
        : Math.min(Number(match[2]), total - 1);
    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start > end ||
      start >= total
    )
      return new Response(null, {
        status: 416,
        headers: { ...headers, "content-range": `bytes */${total}` },
      });
    return new Response(
      request.method === "HEAD" ? null : bytes.slice(start, end + 1),
      {
        status: 206,
        headers: {
          ...headers,
          "content-range": `bytes ${start}-${end}/${total}`,
          "content-length": String(end - start + 1),
        },
      },
    );
  }
  return new Response(request.method === "HEAD" ? null : bytes, {
    headers: { ...headers, "content-length": String(total) },
  });
}

export async function readLimitedBody(request, limit) {
  const tooLarge = () =>
    Object.assign(
      new Error(
        "Upload is too large. Compress it with the upload picker first.",
      ),
      { status: 413 },
    );
  if (Number(request.headers.get("content-length") || 0) > limit)
    throw tooLarge();
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader(),
    chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel();
        throw tooLarge();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

export function validMediaBytes(bytes, type) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const ascii = (start, end) => String.fromCharCode(...b.subarray(start, end));
  if (type === "image/webp")
    return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
  if (type === "image/png")
    return [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => b[i] === v);
  if (type === "image/jpeg")
    return b[0] === 255 && b[1] === 216 && b[2] === 255;
  if (type === "image/avif")
    return ascii(4, 8) === "ftyp" && ascii(8, 32).includes("avif");
  if (type === "video/mp4") return ascii(4, 8) === "ftyp";
  if (type === "video/webm")
    return [26, 69, 223, 163].every((v, i) => b[i] === v);
  return false;
}
