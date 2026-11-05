export async function api(
  path,
  { method = "GET", body, raw, headers = {} } = {},
) {
  const opts = { method, credentials: "same-origin", headers: { ...headers } };
  if (method !== "GET") opts.headers["x-requested-with"] = "mb";
  if (raw) opts.body = raw;
  else if (body !== undefined) {
    opts.headers["content-type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch("/api/" + path, opts);
  } catch {
    throw new Error("Network error. Check your connection.");
  }
  let data = null;
  try {
    data = await res.json();
  } catch {}
  if (!res.ok) {
    if (
      res.status === 401 &&
      path.startsWith("admin/") &&
      path !== "admin/login"
    )
      window.dispatchEvent(new Event("mb-admin-session-expired"));
    const e = new Error(data?.error || `Request failed (${res.status})`);
    e.status = res.status;
    throw e;
  }
  return data;
}
// Every admin image and video upload is re-encoded before it is sent.
export const uploadImage = async (file, onProgress = () => {}) => {
  const { compressImage } = await import("./media.js");
  onProgress("Compressing image…");
  const compressed = await compressImage(file);
  onProgress("Uploading compressed image…");
  return api("admin/upload", {
    method: "POST",
    raw: compressed,
    headers: { "content-type": compressed.type },
  });
};
export const uploadVideo = async (file, onProgress = () => {}, preview) => {
  const { compressVideo } = await import("./media.js");
  const compressed = await compressVideo(file, onProgress, preview);
  onProgress("Uploading compressed video…");
  const form = new FormData();
  form.append(
    "video",
    compressed.video,
    compressed.video.type === "video/mp4" ? "clip.mp4" : "clip.webm",
  );
  form.append("poster", compressed.poster, "poster.webp");
  return api("admin/upload-video", { method: "POST", raw: form });
};
